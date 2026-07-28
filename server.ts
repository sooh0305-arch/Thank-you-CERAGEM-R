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

  // POST /auth/complete - Client token receiver
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
      background-color: #f8fafc;
      color: #0f172a;
    }
    .card {
      background: #ffffff;
      padding: 32px 24px;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      text-align: center;
      max-width: 360px;
      width: 85%;
      border: 1px solid #e2e8f0;
    }
    .icon {
      font-size: 40px;
      margin-bottom: 12px;
    }
    h2 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 700;
    }
    p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎉</div>
    <h2>로그인 완료!</h2>
    <p>이 창은 닫으셔도 됩니다.</p>
  </div>
  <script>
    const token = "${esc(token)}";
    const nextPath = "${esc(nextPath)}";

    if (token) {
      try {
        localStorage.setItem("firebase_custom_token", token);
      } catch (e) { console.error(e); }
    }

    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({ type: 'SAML_AUTH_SUCCESS', token: token }, window.location.origin);
      } catch (e) {
        try {
          window.opener.postMessage({ type: 'SAML_AUTH_SUCCESS', token: token }, '*');
        } catch (err) {}
      }
      setTimeout(function() {
        try {
          window.close();
        } catch (e) {}
      }, 300);
    } else {
      window.location.href = nextPath;
    }
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
