import express from "express";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { SAML, ValidateInResponseTo } from "@node-saml/node-saml";
import xmlCrypto from "xml-crypto";

// @ts-ignore
const xmlModule = typeof require !== "undefined" ? require("@node-saml/node-saml/lib/xml") : null;
// @ts-ignore
const { assertRequired } = typeof require !== "undefined" ? require("@node-saml/node-saml/lib/utility") : { assertRequired: () => {} };
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

// Patch node-saml getVerifiedXml to support empty Reference URI="" (enveloped signature for root element / saml2p:Response)
if (xmlModule && xmlModule.getVerifiedXml) {
  xmlModule.getVerifiedXml = (fullXml: string, currentNode: Element, pemFiles: string[]) => {
    const normalizedXml = fullXml.replace(/\r\n?/g, "\n");
    const signatures = xmlModule.xpath.selectElements(
      currentNode,
      "./*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']"
    );
    if (signatures.length < 1) {
      return null;
    }
    if (signatures.length > 1) {
      throw new Error("Too many signatures found for this element");
    }

    const signature = signatures[0];
    const xpathTransformQuery = ".//*[local-name(.)='Transform' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']";
    const transforms = xmlModule.xpath.selectElements(signature, xpathTransformQuery);
    if (transforms.length > 2) {
      throw new Error("Invalid signature, too many transforms");
    }

    for (const pemFile of pemFiles) {
      const sig = new xmlCrypto.SignedXml();
      sig.publicCert = pemFile;
      sig.loadSignature(signature);

      const refs = sig.getReferences();
      if (refs.length !== 1) return null;
      if (!signature.parentNode) return null;

      const ref = refs[0];
      const refUri = ref.uri;
      const refId = refUri && refUri[0] === "#" ? refUri.substring(1) : refUri;

      if (refUri === "" || refUri === "#") {
        // Empty URI refers to the root element containing the signature (signature.parentNode)
        if (!signature.parentNode) {
          throw new Error("Invalid signature: Signature element has no parent");
        }
      } else {
        assertRequired(refId, "signature reference uri not found");
        if (refId.includes("'") || refId.includes('"')) {
          throw new Error("ref URI included quote character ' or \". Not a valid ID, and not allowed");
        }
        const totalReferencedNodes = xmlModule.xpath.selectElements(
          signature.ownerDocument!,
          `//*[@ID="${refId}"]`
        );
        if (totalReferencedNodes.length !== 1) {
          throw new Error("Invalid signature: ID cannot refer to more than one element");
        }
        if (totalReferencedNodes[0] !== signature.parentNode) {
          throw new Error("Invalid signature: Referenced node does not refer to it's parent element");
        }
      }

      try {
        if (!sig.checkSignature(normalizedXml)) {
          continue;
        }
        if (sig.getSignedReferences().length !== 1) {
          throw new Error("Only 1 signed references should be present in signature");
        }
        return sig.getSignedReferences()[0];
      } catch (_a) {
        // try next cert
      }
    }
    return null;
  };
}

// Lazy initialization helpers for Firebase Admin
function getAdmin() {
  if (!getApps().length) {
    try {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "peer-bonus-60c3c",
      });
    } catch (e) {
      console.error("[Firebase Admin] Lazy initializeApp error:", e);
    }
  }
}

function getAdminAuth() {
  getAdmin();
  return getAuth();
}

function getAdminDb() {
  getAdmin();
  return getFirestore();
}

const CACHE_COLLECTION = "samlRequestCache";
const REQUEST_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

// Memory fallback cache in case Firestore is unavailable during local dev
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

const firestoreCacheProvider = {
  async saveAsync(key: string, value: string) {
    const expiresAtMs = Date.now() + REQUEST_TTL_MS;
    memoryCache.set(key, { value, expiresAt: expiresAtMs });
    try {
      const db = getAdminDb();
      await db.collection(CACHE_COLLECTION).doc(key).set({
        value,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(expiresAtMs),
      });
    } catch (e) {
      console.warn("[SAML Cache] Firestore cache save fallback to memory:", e);
    }
    return { createdAt: Date.now(), value };
  },
  async getAsync(key: string) {
    // Check memory first
    const mem = memoryCache.get(key);
    if (mem) {
      if (mem.expiresAt < Date.now()) {
        memoryCache.delete(key);
        return null;
      }
      return mem.value;
    }
    try {
      const db = getAdminDb();
      const doc = await db.collection(CACHE_COLLECTION).doc(key).get();
      if (!doc.exists) return null;
      const data = doc.data();
      if (!data || data.expiresAt?.toDate() < new Date()) {
        await db.collection(CACHE_COLLECTION).doc(key).delete();
        return null;
      }
      return data.value;
    } catch (e) {
      console.warn("[SAML Cache] Firestore cache get error:", e);
      return null;
    }
  },
  async removeAsync(key: string) {
    memoryCache.delete(key);
    try {
      const db = getAdminDb();
      const doc = await db.collection(CACHE_COLLECTION).doc(key).get();
      if (doc.exists) {
        await db.collection(CACHE_COLLECTION).doc(key).delete();
      }
    } catch (e) {
      console.warn("[SAML Cache] Firestore cache remove error:", e);
    }
    return key;
  },
};

// Helper for escaping HTML strings
const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

// Helper for normalizing PEM certificates
function normalizePem(raw: string): string {
  if (!raw) return "";
  // Remove header/footer and extract base64 body (stripping whitespace and linebreaks)
  const body = raw
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  // Reassemble as standard PEM with 64-char line breaks
  const lines = body.match(/.{1,64}/g) || [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", 1);

  // Configure Helmet safely so it doesn't block Vite scripts or Auth popups
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(express.json({ limit: "100kb" }));

  // Rate Limiting for Auth routes
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/auth", authLimiter);

  // SAML configuration helper
  const getSamlInstance = (req?: express.Request) => {
    const host = req ? `${req.protocol}://${req.get("host")}` : "https://service-194476834112.asia-south1.run.app";
    const appBaseUrl = process.env.APP_BASE_URL || host;
    
    const idpSsoUrl = process.env.SAML_IDP_SSO_URL || "https://auth.worksmobile.com/saml2/idp/ceragem.com";
    const idpIssuer = process.env.SAML_IDP_ISSUER || "https://auth.worksmobile.com/saml2/ceragem.com";
    const idpCert = normalizePem(process.env.SAML_IDP_CERT || "");
    const spIssuer = process.env.SAML_SP_ISSUER || `${appBaseUrl}/`;
    const spAcsUrl = process.env.SAML_SP_ACS_URL || `${appBaseUrl}/auth/acs`;

    return new SAML({
      entryPoint: idpSsoUrl,
      idpIssuer: idpIssuer,
      idpCert: idpCert,
      issuer: spIssuer,
      callbackUrl: spAcsUrl,
      authnRequestBinding: "HTTP-POST",
      skipRequestCompression: true,
      identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified",
      validateInResponseTo: "never" as ValidateInResponseTo, // allow flexible login responses if needed or set always if cached
      cacheProvider: firestoreCacheProvider,
      requestIdExpirationPeriodMs: REQUEST_TTL_MS,
      acceptedClockSkewMs: 10000,
      wantAssertionsSigned: false, // set to false for maximum compatibility with Naver Works assertions
      audience: spIssuer,
      signatureAlgorithm: "sha256",
    });
  };

  // Health check endpoints
  app.get("/healthz", (_req, res) => res.status(200).send("ok"));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  // Middleware to authenticate Firebase user token
  type AuthenticatedRequest = express.Request & {
    user?: {
      uid: string;
      email?: string;
    };
  };

  const authenticateUser = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "인증 토큰이 필요합니다." });
      }
      const token = authHeader.split("Bearer ")[1];
      const decoded = await getAdminAuth().verifyIdToken(token);
      req.user = { uid: decoded.uid, email: decoded.email };
      next();
    } catch (err: any) {
      console.error("[API Auth] Token verification failed:", err?.message || err);
      return res.status(401).json({ error: "유효하지 않은 인증 토큰입니다." });
    }
  };

  const requireAdmin = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "인증이 필요합니다." });
    }
    try {
      const db = getAdminDb();
      const userDoc = await db.collection("profiles").doc(req.user.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== "admin") {
        return res.status(403).json({ error: "관리자 권한이 필요합니다." });
      }
      next();
    } catch (err: any) {
      console.error("[API Admin Check] Error:", err?.message || err);
      return res.status(500).json({ error: "관리자 권한 확인 실패" });
    }
  };

  const isSystemOpenForUser = async (uid: string) => {
    try {
      const db = getAdminDb();
      const configSnap = await db.collection("system_config").doc("launch").get();
      const isOpen = configSnap.exists ? Boolean(configSnap.data()?.is_open) : false;
      if (isOpen) return true;

      // If locked, allow access if user is admin
      if (!uid) return false;
      const userDoc = await db.collection("profiles").doc(uid).get();
      return userDoc.exists && userDoc.data()?.role === "admin";
    } catch (e) {
      return false;
    }
  };

  // GET /api/system-status - Fetch service launch state
  app.get("/api/system-status", async (_req, res) => {
    try {
      const db = getAdminDb();
      const configSnap = await db.collection("system_config").doc("launch").get();
      const isOpen = configSnap.exists ? Boolean(configSnap.data()?.is_open) : false;
      return res.json({ is_open: isOpen });
    } catch (err: any) {
      return res.json({ is_open: false });
    }
  });

  // POST /api/admin/toggle-service-status - Admin toggle service launch
  app.post("/api/admin/toggle-service-status", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { isOpen } = req.body;
      const db = getAdminDb();
      const configRef = db.collection("system_config").doc("launch");
      
      await configRef.set({
        is_open: Boolean(isOpen),
        updated_at: FieldValue.serverTimestamp(),
        updated_by: req.user?.uid || 'admin'
      }, { merge: true });

      const statusText = isOpen ? "전사 정식 오픈 완료" : "비공개(오픈 준비 중) 모드 전환";
      return res.json({ success: true, is_open: Boolean(isOpen), message: `서비스 상태가 [${statusText}]로 변경되었습니다.` });
    } catch (err: any) {
      console.error("[API Toggle Service] Error:", err?.message || err);
      return res.status(400).json({ error: err?.message || "서비스 상태 변경 실패" });
    }
  });

  // POST /api/praise - Atomic send praise & transfer points
  app.post("/api/praise", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!(await isSystemOpenForUser(req.user?.uid || ""))) {
        return res.status(403).json({ error: "현재 정식 서비스 오픈 준비 중입니다." });
      }

      const { sender_id, receiver_id, core_value_id, points, message } = req.body;

      if (req.user?.uid !== sender_id) {
        return res.status(403).json({ error: "본인 명의로만 칭찬을 보낼 수 있습니다." });
      }

      if (sender_id === receiver_id) {
        return res.status(400).json({ error: "자기 자신에게는 칭찬을 보낼 수 없습니다." });
      }

      const numPoints = Number(points);
      if (isNaN(numPoints) || numPoints <= 0 || !Number.isInteger(numPoints)) {
        return res.status(400).json({ error: "올바른 포인트 수량을 입력해주세요." });
      }

      if (numPoints > 1000) {
        return res.status(400).json({ error: "1회 발송 시 수신자당 최대 1,000P까지 가능합니다." });
      }

      const trimmedMsg = String(message || "").trim();
      if (!trimmedMsg) {
        return res.status(400).json({ error: "칭찬 메시지를 입력해주세요." });
      }

      const db = getAdminDb();

      // Check monthly per-recipient count limit (max 2 times per recipient per month / cycle)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const settingsSnap = await db.collection("system_config").doc("praise_settings").get();
      let monthlyCountResetAt = startOfMonth;
      if (settingsSnap.exists) {
        const settingsData = settingsSnap.data();
        if (settingsData?.monthly_count_reset_at) {
          const resetDate = settingsData.monthly_count_reset_at.toDate 
            ? settingsData.monthly_count_reset_at.toDate() 
            : new Date(settingsData.monthly_count_reset_at);
          if (resetDate > monthlyCountResetAt) {
            monthlyCountResetAt = resetDate;
          }
        }
      }

      const txSnap = await db.collection("transactions")
        .where("sender_id", "==", sender_id)
        .where("receiver_id", "==", receiver_id)
        .get();

      let praisesSentToRecipientThisMonth = 0;
      txSnap.forEach(doc => {
        const d = doc.data();
        const createdAt = d.created_at?.toDate ? d.created_at.toDate() : new Date(d.created_at);
        if (createdAt >= monthlyCountResetAt) {
          praisesSentToRecipientThisMonth += 1;
        }
      });

      if (praisesSentToRecipientThisMonth >= 2) {
        return res.status(400).json({ 
          error: `동일한 동료에게는 월 최대 2회까지만 칭찬을 보낼 수 있습니다. (이번 달 이미 2회 전송 완료)` 
        });
      }

      // Execute atomic transaction
      await db.runTransaction(async (transaction) => {
        const senderRef = db.collection("profiles").doc(sender_id);
        const receiverRef = db.collection("profiles").doc(receiver_id);

        const senderSnap = await transaction.get(senderRef);
        const receiverSnap = await transaction.get(receiverRef);

        if (!senderSnap.exists) throw new Error("발신자 프로필을 찾을 수 없습니다.");
        if (!receiverSnap.exists) throw new Error("수신자 프로필을 찾을 수 없습니다.");

        const senderData = senderSnap.data()!;
        const receiverData = receiverSnap.data()!;

        const currentBudget = Number(senderData.giving_budget || 0);
        if (currentBudget < numPoints) {
          throw new Error(`칭찬 가능 예산이 부족합니다. (현재 예산: ${currentBudget}P)`);
        }

        transaction.update(senderRef, { giving_budget: currentBudget - numPoints });
        transaction.update(receiverRef, { received_wallet: Number(receiverData.received_wallet || 0) + numPoints });

        const txRef = db.collection("transactions").doc();
        transaction.set(txRef, {
          sender_id,
          receiver_id,
          core_value_id: Number(core_value_id || 1),
          points: numPoints,
          message: trimmedMsg,
          created_at: FieldValue.serverTimestamp()
        });

        const notifRef = db.collection("notifications").doc();
        transaction.set(notifRef, {
          user_id: receiver_id,
          transaction_id: txRef.id,
          message: `${senderData.name || '동료'}님으로부터 ${numPoints}P 칭찬이 도착했습니다!`,
          is_read: false,
          created_at: FieldValue.serverTimestamp()
        });
      });

      return res.json({ success: true, message: "칭찬과 포인트가 성공적으로 발송되었습니다." });
    } catch (err: any) {
      console.error("[API Praise] Error:", err?.message || err);
      return res.status(400).json({ error: err?.message || "칭찬 발송 중 오류가 발생했습니다." });
    }
  });

  // POST /api/withdraw - Gifticon exchange and withdrawal
  app.post("/api/withdraw", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!(await isSystemOpenForUser(req.user?.uid || ""))) {
        return res.status(403).json({ error: "현재 정식 서비스 오픈 준비 중입니다." });
      }

      const { user_id, points, bank_name, account_number, account_holder } = req.body;

      if (req.user?.uid !== user_id) {
        return res.status(403).json({ error: "본인 계정으로만 신청할 수 있습니다." });
      }

      const numPoints = Number(points);
      if (isNaN(numPoints) || numPoints <= 0 || !Number.isInteger(numPoints)) {
        return res.status(400).json({ error: "올바른 포인트를 입력해주세요." });
      }

      if (bank_name !== '기프티콘 구매' && numPoints < 10000) {
        return res.status(400).json({ error: "계좌 출금 신청은 최소 10,000P 이상부터 가능합니다." });
      }

      const db = getAdminDb();

      let resultMsg = "";
      await db.runTransaction(async (transaction) => {
        const userRef = db.collection("profiles").doc(user_id);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists) throw new Error("사용자를 찾을 수 없습니다.");
        const userData = userSnap.data()!;

        const currentWallet = Number(userData.received_wallet || 0);
        if (currentWallet < numPoints) {
          throw new Error(`신청 가능한 보유 포인트가 부족합니다. (현재 보유: ${currentWallet}P)`);
        }

        transaction.update(userRef, {
          received_wallet: currentWallet - numPoints,
          spent_points: Number(userData.spent_points || 0) + numPoints
        });

        const withdrawalRef = db.collection("withdrawals").doc();
        transaction.set(withdrawalRef, {
          user_id,
          points: numPoints,
          bank_name: String(bank_name || '기프티콘 구매').trim(),
          account_number: String(account_number || '').trim(),
          account_holder: String(account_holder || '').trim(),
          status: 'pending',
          created_at: FieldValue.serverTimestamp()
        });

        resultMsg = bank_name === '기프티콘 구매' 
          ? "기프티콘 구매 신청이 성공적으로 완료되었습니다." 
          : "출금 신청이 완료되었습니다.";
      });

      return res.json({ success: true, message: resultMsg });
    } catch (err: any) {
      console.error("[API Withdraw] Error:", err?.message || err);
      return res.status(400).json({ error: err?.message || "신청 처리 중 오류가 발생했습니다." });
    }
  });

  // POST /api/admin/withdrawal-status - Approve/Reject withdrawal
  app.post("/api/admin/withdrawal-status", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { withdrawalId, status } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "유효하지 않은 상태값입니다." });
      }

      const db = getAdminDb();

      await db.runTransaction(async (transaction) => {
        const withdrawalRef = db.collection("withdrawals").doc(withdrawalId);
        const withdrawalSnap = await transaction.get(withdrawalRef);

        if (!withdrawalSnap.exists) throw new Error("신청 내역을 찾을 수 없습니다.");
        const withdrawalData = withdrawalSnap.data()!;

        if (status === 'rejected' && withdrawalData.status === 'pending') {
          const userRef = db.collection("profiles").doc(withdrawalData.user_id);
          const userSnap = await transaction.get(userRef);

          if (userSnap.exists) {
            const userData = userSnap.data()!;
            const refundedWallet = Number(userData.received_wallet || 0) + Number(withdrawalData.points || 0);
            const newSpent = Math.max(0, Number(userData.spent_points || 0) - Number(withdrawalData.points || 0));

            transaction.update(userRef, {
              received_wallet: refundedWallet,
              spent_points: newSpent
            });
          }
          transaction.update(withdrawalRef, { status: 'rejected' });
        } else {
          transaction.update(withdrawalRef, { status });
        }
      });

      return res.json({ success: true, message: "상태가 변경되었습니다." });
    } catch (err: any) {
      console.error("[API Admin Withdrawal Status] Error:", err?.message || err);
      return res.status(400).json({ error: err?.message || "처리 중 오류가 발생했습니다." });
    }
  });

  // POST /api/admin/add-points - Grant points manually
  app.post("/api/admin/add-points", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, points } = req.body;

      const numPoints = Number(points);
      if (isNaN(numPoints) || numPoints <= 0 || !Number.isInteger(numPoints)) {
        return res.status(400).json({ error: "올바른 포인트 수량을 입력해주세요." });
      }

      const db = getAdminDb();

      await db.runTransaction(async (transaction) => {
        const userRef = db.collection("profiles").doc(userId);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists) throw new Error("사용자를 찾을 수 없습니다.");
        const userData = userSnap.data()!;

        transaction.update(userRef, {
          received_wallet: Number(userData.received_wallet || 0) + numPoints
        });
      });

      return res.json({ success: true, message: `${numPoints}P 포인트가 성공적으로 지급되었습니다.` });
    } catch (err: any) {
      console.error("[API Admin Add Points] Error:", err?.message || err);
      return res.status(400).json({ error: err?.message || "포인트 지급 중 오류가 발생했습니다." });
    }
  });

  // POST /api/admin/update-user - Admin update user profile
  app.post("/api/admin/update-user", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, updates } = req.body;
      if (!userId || !updates) {
        return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
      }

      const db = getAdminDb();
      const userRef = db.collection("profiles").doc(userId);

      const cleanData: Record<string, any> = {};
      if (updates.name !== undefined) cleanData.name = String(updates.name).trim();
      if (updates.department !== undefined) cleanData.department = String(updates.department).trim();
      if (updates.position !== undefined) cleanData.position = String(updates.position).trim();
      if (updates.email !== undefined) cleanData.email = String(updates.email).trim().toLowerCase();
      if (updates.role !== undefined && ['admin', 'user'].includes(updates.role)) cleanData.role = updates.role;

      await userRef.update(cleanData);
      return res.json({ success: true, message: "사용자 정보가 수정되었습니다." });
    } catch (err: any) {
      console.error("[API Admin Update User] Error:", err?.message || err);
      return res.status(400).json({ error: err?.message || "사용자 정보 수정 실패" });
    }
  });

  // POST /api/admin/reset-budgets - Reset quarterly giving budget to 50000
  app.post("/api/admin/reset-budgets", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const db = getAdminDb();
      const snap = await db.collection("profiles").get();

      const batch = db.batch();
      const nowISO = new Date().toISOString();

      snap.forEach(doc => {
        batch.update(doc.ref, { giving_budget: 50000, praise_reset_at: nowISO });
      });

      await batch.commit();
      return res.json({ success: true, message: "전체 사용자 분기 발송 예산이 50,000P로 초기화되었습니다. (미사용 예산 소멸)" });
    } catch (err: any) {
      console.error("[API Admin Reset Budgets] Error:", err?.message || err);
      return res.status(400).json({ error: err?.message || "예산 초기화 실패" });
    }
  });

  // POST /api/admin/reset-monthly-counts - Reset monthly praise count limits (1 per recipient limit reset)
  app.post("/api/admin/reset-monthly-counts", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const db = getAdminDb();
      const settingsRef = db.collection("system_config").doc("praise_settings");
      await settingsRef.set({
        monthly_count_reset_at: FieldValue.serverTimestamp(),
        updated_by: req.user?.uid || 'admin'
      }, { merge: true });

      return res.json({ success: true, message: "월별 1인당 칭찬 발송 횟수 제한(월 2회)이 성황리에 초기화되었습니다." });
    } catch (err: any) {
      console.error("[API Admin Reset Monthly Counts] Error:", err?.message || err);
      return res.status(400).json({ error: err?.message || "발송 횟수 초기화 실패" });
    }
  });

  // POST /api/admin/reset-system - Reset system data
  app.post("/api/admin/reset-system", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const db = getAdminDb();

      const deleteColl = async (collName: string) => {
        const snap = await db.collection(collName).get();
        const batch = db.batch();
        snap.forEach(d => batch.delete(d.ref));
        if (snap.size > 0) await batch.commit();
      };

      await deleteColl("transactions");
      await deleteColl("notifications");
      await deleteColl("withdrawals");

      const profilesSnap = await db.collection("profiles").get();
      const batch = db.batch();
      const nowTS = FieldValue.serverTimestamp();

      profilesSnap.forEach(d => {
        batch.update(d.ref, {
          giving_budget: 50000,
          received_wallet: 0,
          spent_points: 0,
          praise_reset_at: nowTS
        });
      });

      if (profilesSnap.size > 0) await batch.commit();

      return res.json({ success: true, message: "시스템 데이터가 성공적으로 초기화되었습니다." });
    } catch (err: any) {
      console.error("[API Admin Reset System] Error:", err?.message || err);
      return res.status(400).json({ error: err?.message || "시스템 초기화 실패" });
    }
  });

  // GET /auth/login - Generates SAML Request and submits form to Naver Works
  app.get("/auth/login", async (req, res) => {
    try {
      let relayState = "/";
      if (typeof req.query.next === "string" && req.query.next.startsWith("/") && !req.query.next.startsWith("//")) {
        relayState = req.query.next;
      }

      const saml = getSamlInstance(req);
      const formHtml = await saml.getAuthorizeFormAsync(relayState);
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(formHtml);
    } catch (err: any) {
      console.error("[auth/login] SAML Request generation failed:", err?.message || err);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>로그인 오류</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2>❌ 네이버웍스 로그인 요청 생성 실패</h2>
          <p style="color: #e53e3e;">${esc(err?.message || String(err))}</p>
          <a href="/" style="display:inline-block; margin-top:20px; padding:10px 20px; background:#000; color:#fff; text-decoration:none; border-radius:8px;">홈으로 돌아가기</a>
        </body>
        </html>
      `);
    }
  });

  // POST /auth/acs - SAML Response verification and Firebase Custom Token issuance
  app.post("/auth/acs", async (req, res) => {
    try {
      if (!req.body || typeof req.body.SAMLResponse !== "string") {
        return res.status(400).send("잘못된 요청입니다. SAMLResponse가 없습니다.");
      }

      const saml = getSamlInstance(req);
      
      let profile: any = null;
      let loggedOut = false;

      try {
        const result = await saml.validatePostResponseAsync(req.body);
        profile = result.profile;
        loggedOut = result.loggedOut;
      } catch (valErr: any) {
        console.error("[auth/acs] SAML validation error:", valErr);
        // Fallback parse if certificate validation fails due to certificate mismatch
        throw valErr;
      }

      if (loggedOut || !profile) {
        return res.status(401).send("인증에 실패했습니다. 프로필을 찾을 수 없습니다.");
      }

      // Extract email from NameID or Attributes
      let email = String(profile.nameID || profile.email || profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || "").trim().toLowerCase();

      const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || "ceragem.com").toLowerCase();

      if (!email || !email.includes("@")) {
        console.warn("[auth/acs] NameID is not a valid email:", profile);
        return res.status(401).send(`인증 정보 오류: 네이버웍스에서 이메일 정보를 수신하지 못했습니다. (NameID: ${profile.nameID})`);
      }

      const domain = email.split("@")[1];
      if (domain !== allowedDomain && allowedDomain !== "*") {
        console.warn(`[auth/acs] Unauthorized domain login attempt: ${domain}`);
        return res.status(403).send(`[접근 제한] 사내 계정(@${allowedDomain})만 로그인 가능합니다. (시도 계정: ${email})`);
      }

      // Create/Get Firebase user & issue custom token
      const authClient = getAdminAuth();
      let targetUid: string;

      try {
        const existingUser = await authClient.getUserByEmail(email);
        targetUid = existingUser.uid;
      } catch (userErr: any) {
        if (userErr.code === "auth/user-not-found" || userErr?.errorInfo?.code === "auth/user-not-found") {
          const generatedUid = "nw_" + crypto.createHash("sha256").update(email).digest("hex").slice(0, 28);
          const newUser = await authClient.createUser({
            uid: generatedUid,
            email,
            emailVerified: true,
            displayName: profile.displayName || email.split("@")[0],
          });
          targetUid = newUser.uid;
        } else {
          throw userErr;
        }
      }

      const customToken = await authClient.createCustomToken(targetUid, {
        loginMethod: "naverworks-saml",
        email: email,
      });

      let nextPath = "/";
      if (typeof req.body.RelayState === "string" && req.body.RelayState.startsWith("/") && !req.body.RelayState.startsWith("//")) {
        nextPath = req.body.RelayState;
      }

      const host = `${req.protocol}://${req.get("host")}`;
      const appUrl = new URL("/auth/complete", process.env.APP_BASE_URL || host).toString();

      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>네이버웍스 로그인 처리 중…</title>
</head>
<body onload="document.forms[0].submit()" style="font-family:sans-serif; text-align:center; padding-top:50px;">
  <p>네이버웍스 인증이 완료되었습니다. 땡큐세라젬으로 이동합니다...</p>
  <noscript><p>계속하려면 아래 버튼을 클릭해주세요.</p></noscript>
  <form method="POST" action="${esc(appUrl)}">
    <input type="hidden" name="token" value="${esc(customToken)}">
    <input type="hidden" name="next" value="${esc(nextPath)}">
    <noscript><button type="submit">계속하기</button></noscript>
  </form>
</body>
</html>`);
    } catch (err: any) {
      console.error("[auth/acs] SAMLResponse verification error:", err?.message || err);
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>인증 실패</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2 style="color:#e53e3e;">⚠️ 네이버웍스 SAML SSO 인증 실패</h2>
          <p style="background:#fff5f5; padding:15px; border-radius:8px; border:1px solid #feb2b2; display:inline-block; text-align:left; max-width:600px; font-family:monospace; font-size:13px; white-space:pre-wrap;">${esc(err?.message || String(err))}</p>
          <br/><br/>
          <a href="/" style="padding:10px 20px; background:#000; color:#fff; text-decoration:none; border-radius:8px;">로그인 화면으로 돌아가기</a>
        </body>
        </html>
      `);
    }
  });

  // POST /auth/complete - Client token receiver and redirect handler
  app.post("/auth/complete", (req, res) => {
    const token = req.body?.token || "";
    const nextPath = req.body?.next || "/";

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>로그인 완료</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background-color: #FAF9F6;
      color: #0f172a;
    }
    .card {
      background: #ffffff;
      padding: 36px 28px;
      border-radius: 20px;
      box-shadow: 4px 4px 0px 0px #0f172a;
      text-align: center;
      max-width: 380px;
      width: 85%;
      border: 2px solid #0f172a;
    }
    .icon {
      font-size: 44px;
      margin-bottom: 12px;
    }
    h2 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 800;
    }
    p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎉</div>
    <h2>인증 성공!</h2>
    <p>네이버웍스 인증이 완료되었습니다.<br/>땡큐세라젬으로 이동합니다...</p>
  </div>
  <script>
    const token = "${esc(token)}";
    const nextPath = "${esc(nextPath)}";

    if (token) {
      try {
        localStorage.setItem("firebase_custom_token", token);
      } catch (e) {
        console.error(e);
      }
    }
    window.location.href = nextPath || "/";
  </script>
</body>
</html>`);
  });

  // GET /auth/complete fallback
  app.get("/auth/complete", (_req, res) => {
    res.redirect("/");
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
