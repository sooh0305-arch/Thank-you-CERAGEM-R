
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  query, 
  where, 
  limit, 
  orderBy,
  runTransaction, 
  writeBatch,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signInWithEmailAndPassword,
  updatePassword
} from "firebase/auth";
import { db, firebaseConfig, auth } from "./firebase";
import { Profile, Transaction, Withdrawal, Notification } from "../types";

const getPath = (name: string) => name;

const initialEmployees = [
  { name: "이동현", email: "sooh@ceragem.com", dept: "세라제머육성팀", role: "admin", password: "educeragem01" },
  { name: "조진국", email: "jkcho@ceragem.com", dept: "세라제머육성팀", role: "user", password: "000000" },
  { name: "김우진", email: "kwoozin123@ceragem.com", dept: "세라제머육성팀", role: "user", password: "000000" },
  { name: "백승휘", email: "shbaik@ceragem.com", dept: "세라제머육성팀", role: "user", password: "000000" },
  { name: "손화연", email: "hy0000@ceragem.com", dept: "세라제머육성팀", role: "user", password: "000000" },
  { name: "김은성", email: "eskim@ceragem.com", dept: "세라제머HR실", role: "user", password: "000000" },
  { name: "곽승훈", email: "sh3257@ceragem.com", dept: "세라제머인사팀", role: "user", password: "000000" },
  { name: "김경은", email: "euniu@ceragem.com", dept: "세라제머인사팀", role: "user", password: "000000" },
  { name: "김미란", email: "miran2@ceragem.com", dept: "세라제머인사팀", role: "user", password: "000000" },
  { name: "김양호", email: "kyh0064@ceragem.com", dept: "세라제머인사팀", role: "user", password: "000000" },
  { name: "김하늘", email: "sky3754@ceragem.com", dept: "세라제머인사팀", role: "user", password: "000000" },
  { name: "남초롱", email: "chorong@ceragem.com", dept: "세라제머인사팀", role: "user", password: "000000" },
  { name: "박수빈", email: "psb372@ceragem.com", dept: "세라제머인사팀", role: "user", password: "000000" },
  { name: "소은혜", email: "ehsoh@ceragem.com", dept: "세라제머인사팀", role: "user", password: "000000" },
  { name: "안용영", email: "ayy9452@ceragem.com", dept: "세라제머인사팀", role: "user", password: "000000" },
  { name: "노경희", email: "asella@ceragem.com", dept: "안전보건팀", role: "user", password: "000000" },
  { name: "강채미", email: "chaemi1219@ceragem.com", dept: "안전보건팀", role: "user", password: "000000" },
  { name: "김재성", email: "js1472@ceragem.com", dept: "안전보건팀", role: "user", password: "000000" },
  { name: "박명수", email: "mspark92@ceragem.com", dept: "안전보건팀", role: "user", password: "000000" },
  { name: "천상호", email: "sangho77@ceragem.com", dept: "안전보건팀", role: "user", password: "000000" },
  { name: "김소영", email: "sykim@ceragem.com", dept: "세라제머육성팀", role: "user", password: "000000" }
];

export const api = {
  async ensureInitialData() {
    // Legacy function, no-op
  },

  async initializeEmployeeAccounts(): Promise<{ success: boolean; created: number; errors: string[] }> {
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);
    const errors: string[] = [];
    let createdCount = 0;

    try {
      for (const emp of initialEmployees) {
        try {
          const normalizedEmail = emp.email.toLowerCase().trim();
          let uid = "";
          try {
            const pwd = (emp as any).password || "000000";
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, pwd);
            uid = userCredential.user.uid;
          } catch (e: any) {
            if (e.code === 'auth/email-already-in-use') {
               errors.push(`${emp.email}: 계정이 이미 존재함`);
               continue;
            } else {
              throw e;
            }
          }

          if (uid) {
            const docRef = doc(db, "profiles", uid);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
              await setDoc(docRef, {
                id: uid,
                name: emp.name,
                department: emp.dept,
                role: emp.role,
                giving_budget: 10000,
                received_wallet: 0,
                spent_points: 0,
                created_at: serverTimestamp()
              });
              createdCount++;
            }
          }
        } catch (e: any) {
           errors.push(`${emp.email}: ${e.message}`);
        }
      }
      return { success: true, created: createdCount, errors };
    } finally {
      await deleteApp(secondaryApp);
    }
  },

  async login(email: string, pass: string): Promise<{ user: Profile | null; error: string | null }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      let userCredential;
      try {
        // 1. Try signing in first
        userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
      } catch (signInErr: any) {
        console.warn("Sign-in failed, checking for initial employee auto-provisioning...", signInErr);
        
        // Find if this is a pre-registered employee
        const empInfo = initialEmployees.find(e => e.email.toLowerCase().trim() === normalizedEmail);
        const expectedPass = empInfo ? (empInfo as any).password || "000000" : null;
        
        // If they are an initial employee and their typed password matches the predefined one
        if (empInfo && expectedPass === pass) {
          try {
            // Attempt to create the user on-demand
            userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
          } catch (signUpErr: any) {
            if (signUpErr.code === 'auth/email-already-in-use') {
              // User already exists in auth, so the sign-in error was truly wrong password/credential
              return { user: null, error: "이메일 또는 비밀번호가 일치하지 않습니다." };
            }
            throw signUpErr;
          }
        } else {
          // Not an initial employee or password didn't match the predefined one
          throw signInErr;
        }
      }

      const uid = userCredential.user.uid;

      // 2. Fetch Profile from Firestore
      try {
        let userSnap = await getDoc(doc(db, "profiles", uid));
        
        if (!userSnap.exists()) {
          const empInfo = initialEmployees.find(e => e.email.toLowerCase().trim() === normalizedEmail);
          
          if (empInfo) {
            const newProfile = {
              id: uid,
              name: empInfo.name,
              department: empInfo.dept,
              role: empInfo.role,
              giving_budget: 10000,
              received_wallet: 0,
              spent_points: 0,
              created_at: serverTimestamp()
            };
            
            await setDoc(doc(db, "profiles", uid), newProfile);
            return { user: { ...newProfile, created_at: new Date().toISOString() } as unknown as Profile, error: null };
          } else {
            return { user: null, error: "등록된 직원 명단에 이메일이 없습니다. 관리자에게 문의하세요." };
          }
        }

        const userData = userSnap.data();
        return { user: { id: uid, ...userData } as Profile, error: null };
      } catch (fsErr: any) {
        console.error("Firestore access error during login:", fsErr);
        if (fsErr.code === 'permission-denied') {
          return { user: null, error: "데이터베이스 접근 권한이 없습니다. Firestore 보안 규칙을 확인해주세요." };
        }
        throw fsErr;
      }
    } catch (e: any) {
      console.error("Login error details:", e);
      let msg = "로그인 중 오류가 발생했습니다.";
      
      // Firebase Auth v10 error code handling
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
        msg = "이메일 또는 비밀번호가 일치하지 않습니다.";
      } else if (e.code === 'auth/too-many-requests') {
        msg = "너무 많은 로그인 시도가 감지되었습니다. 잠시 후 다시 시도해주세요.";
      } else if (e.message && e.message.includes("permission")) {
        msg = "권한 부족 오류: 데이터베이스 보안 규칙을 확인하세요.";
      }
      
      return { user: null, error: msg };
    }
  },

  async sendPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
      return { success: true, message: "이메일로 비밀번호 재설정 링크를 보냈습니다." };
    } catch (e: any) {
      return { success: false, message: "비밀번호 재설정 메일 발송 중 오류가 발생했습니다." };
    }
  },

  async getUser(id: string): Promise<Profile | null> {
    try {
      const snap = await getDoc(doc(db, getPath("profiles"), id));
      if (!snap.exists()) {
        const authUser = auth.currentUser;
        if (authUser && authUser.uid === id && authUser.email) {
          const normalizedEmail = authUser.email.toLowerCase().trim();
          const empInfo = initialEmployees.find(e => e.email.toLowerCase().trim() === normalizedEmail);
          if (empInfo) {
            const newProfile = {
              id,
              name: empInfo.name,
              department: empInfo.dept,
              role: empInfo.role,
              giving_budget: 10000,
              received_wallet: 0,
              spent_points: 0,
              created_at: serverTimestamp()
            };
            await setDoc(doc(db, "profiles", id), newProfile);
            return {
              id,
              name: empInfo.name,
              department: empInfo.dept,
              role: empInfo.role,
              giving_budget: 10000,
              received_wallet: 0,
              spent_points: 0,
              created_at: new Date().toISOString()
            } as unknown as Profile;
          }
        }
        return null;
      }
      const data = snap.data() as Profile;
      
      // Auto-migrate on the fly if not migrated
      if (!data.points_migrated) {
        const newReceived = (data.received_wallet || 0) * 100;
        const newSpent = (data.spent_points || 0) * 100;
        const newBudget = (data.giving_budget || 0) <= 100 ? 10000 : (data.giving_budget || 10000);
        
        try {
          await updateDoc(doc(db, "profiles", id), {
            received_wallet: newReceived,
            spent_points: newSpent,
            giving_budget: newBudget,
            points_migrated: true
          });
        } catch (updateErr) {
          console.error("Failed to persist dynamic migration for user:", id, updateErr);
        }
        
        return {
          id: snap.id,
          ...data,
          received_wallet: newReceived,
          spent_points: newSpent,
          giving_budget: newBudget,
          points_migrated: true
        };
      }
      return { id: snap.id, ...data };
    } catch (e: any) {
      console.error("getUser error:", e);
      return null;
    }
  },

  async getAllUsers(): Promise<Profile[]> {
    try {
      const snap = await getDocs(collection(db, getPath("profiles")));
      return snap.docs.map(d => {
        const data = d.data() as Profile;
        if (!data.points_migrated) {
          return {
            id: d.id,
            ...data,
            received_wallet: (data.received_wallet || 0) * 100,
            spent_points: (data.spent_points || 0) * 100,
            giving_budget: (data.giving_budget || 0) <= 100 ? 10000 : (data.giving_budget || 10000),
            points_migrated: true
          };
        }
        return { id: d.id, ...data };
      });
    } catch (e: any) {
      console.error("getAllUsers error:", e);
      return [];
    }
  },

  async sendPraise(data: { sender_id: string; receiver_id: string; core_value_id: number; points: number; message: string }): Promise<boolean> {
    try {
      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, getPath("profiles"), data.sender_id);
        const receiverRef = doc(db, getPath("profiles"), data.receiver_id);
        const senderSnap = await transaction.get(senderRef);
        const receiverSnap = await transaction.get(receiverRef);
        
        if (!senderSnap.exists() || !receiverSnap.exists()) throw new Error("User not found");
        const senderData = senderSnap.data() as Profile;
        const receiverData = receiverSnap.data() as Profile;
        
        if (senderData.giving_budget < data.points) throw new Error("Insufficient budget");

        transaction.update(senderRef, { giving_budget: senderData.giving_budget - data.points });
        transaction.update(receiverRef, { received_wallet: (receiverData.received_wallet || 0) + data.points });

        const txRef = doc(collection(db, getPath("transactions")));
        transaction.set(txRef, { ...data, created_at: serverTimestamp() });

        const notifRef = doc(collection(db, getPath("notifications")));
        transaction.set(notifRef, {
          user_id: data.receiver_id,
          transaction_id: txRef.id,
          message: `${senderData.name}님으로부터 ${data.points}P 칭찬이 도착했습니다!`,
          is_read: false,
          created_at: serverTimestamp()
        });
      });
      return true;
    } catch (e) {
      console.error("Transaction failed: ", e);
      return false;
    }
  },

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, getPath("notifications")),
        where("user_id", "==", userId),
        where("is_read", "==", false)
      );
      const snap = await getDocs(q);
      const notifications = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        created_at: d.data().created_at?.toDate()?.toISOString() || new Date().toISOString()
      } as Notification));
      
      return notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (e) {
      console.error("getUnreadNotifications error:", e);
      return [];
    }
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, getPath("notifications"), notificationId), { is_read: true });
    } catch (e) {
      console.error("markNotificationRead error:", e);
    }
  },

  async requestWithdrawal(userId: string, points: number, bankName: string, accountNumber: string, accountHolder: string): Promise<{ success: boolean; message: string }> {
    try {
      if (bankName !== '기프티콘 구매' && points < 10000) {
        return { success: false, message: "출금 신청은 최소 10,000P 이상 가능합니다." };
      }
      return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "profiles", userId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) return { success: false, message: "사용자를 찾을 수 없습니다." };
        const userData = userSnap.data() as Profile;
        if (userData.received_wallet < points) return { success: false, message: "출금 가능한 포인트가 부족합니다." };
        
        transaction.update(userRef, {
          received_wallet: userData.received_wallet - points,
          spent_points: (userData.spent_points || 0) + points
        });
        
        const withdrawalRef = doc(collection(db, "withdrawals"));
        transaction.set(withdrawalRef, {
          user_id: userId,
          points: points,
          bank_name: bankName,
          account_number: accountNumber,
          account_holder: accountHolder,
          status: 'pending',
          created_at: serverTimestamp()
        });
        
        const successMsg = bankName === '기프티콘 구매' ? "기프티콘 구매가 신청되었습니다." : "출금 신청이 완료되었습니다.";
        return { success: true, message: successMsg };
      });
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  async getAllWithdrawals(): Promise<Withdrawal[]> {
    try {
      const q = query(collection(db, "withdrawals"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      const users = await this.getAllUsers();
      const userMap = new Map(users.map(u => [u.id, u]));
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString(),
          user: userMap.get(data.user_id)
        } as Withdrawal;
      });
    } catch (e) {
      console.error("getAllWithdrawals error:", e);
      return [];
    }
  },

  async updateWithdrawalStatus(withdrawalId: string, status: 'approved' | 'rejected'): Promise<boolean> {
    try {
      const withdrawalRef = doc(db, "withdrawals", withdrawalId);
      const withdrawalSnap = await getDoc(withdrawalRef);
      if (!withdrawalSnap.exists()) return false;
      
      const withdrawalData = withdrawalSnap.data() as any;
      
      // If rejecting, we need to return the points to the user
      if (status === 'rejected' && withdrawalData.status === 'pending') {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "profiles", withdrawalData.user_id);
          const userSnap = await transaction.get(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data() as Profile;
            transaction.update(userRef, {
              received_wallet: (userData.received_wallet || 0) + withdrawalData.points,
              spent_points: Math.max(0, (userData.spent_points || 0) - withdrawalData.points)
            });
          }
          transaction.update(withdrawalRef, { status: 'rejected' });
        });
      } else {
        await updateDoc(withdrawalRef, { status });
      }
      return true;
    } catch (e) {
      console.error("updateWithdrawalStatus error:", e);
      return false;
    }
  },

  async getUserWithdrawals(userId: string): Promise<Withdrawal[]> {
    try {
      const q = query(
        collection(db, "withdrawals"),
        where("user_id", "==", userId)
      );
      const snap = await getDocs(q);
      const withdrawals = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString()
        } as Withdrawal;
      });
      return withdrawals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (e) {
      console.error("getUserWithdrawals error:", e);
      return [];
    }
  },

  async getTransaction(id: string): Promise<Transaction | null> {
    try {
      const snap = await getDoc(doc(db, getPath("transactions"), id));
      if (!snap.exists()) return null;
      const data = snap.data();
      const sender = await this.getUser(data.sender_id);
      const receiver = await this.getUser(data.receiver_id);
      
      const origPoints = data.points || 0;
      const finalPoints = origPoints <= 50 ? origPoints * 100 : origPoints;
      
      return {
        id: snap.id,
        ...data,
        points: finalPoints,
        created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString(),
        sender,
        receiver
      } as Transaction;
    } catch (e) {
      console.error("getTransaction error:", e);
      return null;
    }
  },

  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const q = query(collection(db, getPath("transactions")), orderBy("created_at", "desc"), limit(1000));
      const snap = await getDocs(q);
      const users = await this.getAllUsers();
      const userMap = new Map(users.map(u => [u.id, u]));
      return snap.docs.map(d => {
        const data = d.data();
        const origPoints = data.points || 0;
        const finalPoints = origPoints <= 50 ? origPoints * 100 : origPoints;
        
        return {
          id: d.id,
          ...data,
          points: finalPoints,
          created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString(),
          sender: userMap.get(data.sender_id),
          receiver: userMap.get(data.receiver_id)
        } as Transaction;
      });
    } catch (e) {
      console.error("getAllTransactions error:", e);
      return [];
    }
  },

  async getHistory(userId: string): Promise<Transaction[]> {
    try {
      const q = query(collection(db, getPath("transactions")), where("receiver_id", "==", userId));
      const snap = await getDocs(q);
      const users = await this.getAllUsers();
      const userMap = new Map(users.map(u => [u.id, u]));
      const transactions = snap.docs.map(d => {
        const data = d.data();
        const origPoints = data.points || 0;
        const finalPoints = origPoints <= 50 ? origPoints * 100 : origPoints;
        
        return {
          id: d.id,
          ...data,
          points: finalPoints,
          created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString(),
          sender: userMap.get(data.sender_id)
        } as Transaction;
      });
      return transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (e) {
      console.error("getHistory error:", e);
      return [];
    }
  },

  async resetAllBudgets(): Promise<{ success: boolean; error?: string }> {
    try {
      const snap = await getDocs(collection(db, getPath("profiles")));
      const batch = writeBatch(db);
      const now = Timestamp.now();
      snap.docs.forEach(d => {
        batch.update(d.ref, { giving_budget: 10000, praise_reset_at: now.toDate().toISOString() });
      });
      await batch.commit();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async updateDepartment(userId: string, newDept: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, getPath("profiles"), userId), { department: newDept });
      return true;
    } catch { return false; }
  },

  async addPoints(userId: string, points: number): Promise<boolean> {
    try {
      const userRef = doc(db, getPath("profiles"), userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return false;
      const userData = userSnap.data() as Profile;
      await updateDoc(userRef, { received_wallet: (userData.received_wallet || 0) + points });
      return true;
    } catch (e) {
      console.error("addPoints error:", e);
      return false;
    }
  },

  async resetPassword(userId: string): Promise<boolean> {
    return true; 
  },

  async changePassword(userId: string, newPw: string): Promise<boolean> {
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPw);
        return true;
      }
      return false;
    } catch (e: any) {
      console.error("Password change failed:", e);
      return false; 
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, getPath("profiles"), userId));
      return true;
    } catch (e) {
      console.error("User deletion failed:", e);
      return false;
    }
  },

  async resetSystemData(): Promise<{ success: boolean; message: string }> {
    try {
      const batchLimit = 500;
      const deleteCollection = async (path: string) => {
        const q = query(collection(db, path));
        const snapshot = await getDocs(q);
        let currentBatch = writeBatch(db);
        let count = 0;
        const chunks = [];
        snapshot.docs.forEach((doc) => {
          currentBatch.delete(doc.ref);
          count++;
          if (count === batchLimit) {
            chunks.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            count = 0;
          }
        });
        if (count > 0) chunks.push(currentBatch.commit());
        await Promise.all(chunks);
      };

      await deleteCollection("transactions");
      await deleteCollection("notifications");
      await deleteCollection("withdrawals");

      const profiles = await getDocs(collection(db, "profiles"));
      let currentBatch = writeBatch(db);
      let count = 0;
      const chunks = [];
      profiles.docs.forEach((d) => {
        currentBatch.update(d.ref, {
          giving_budget: 10000,
          received_wallet: 0,
          spent_points: 0,
          praise_reset_at: serverTimestamp()
        });
        count++;
        if (count === batchLimit) {
          chunks.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          count = 0;
        }
      });
      if (count > 0) chunks.push(currentBatch.commit());
      await Promise.all(chunks);

      return { success: true, message: "시스템 데이터가 완전히 초기화되었습니다." };
    } catch (e: any) {
      console.error("System reset failed:", e);
      return { success: false, message: "초기화 실패: " + e.message };
    }
  },

  async migratePointsTo100x(): Promise<{ success: boolean; message: string }> {
    try {
      const profilesSnap = await getDocs(collection(db, "profiles"));
      const txsSnap = await getDocs(collection(db, "transactions"));
      
      const batchLimit = 400;
      let currentBatch = writeBatch(db);
      let count = 0;
      const chunks = [];
      
      // 1. Scale profiles (received_wallet, spent_points) by 100x
      profilesSnap.docs.forEach((d) => {
        const data = d.data() as Profile;
        const currentReceived = data.received_wallet || 0;
        const currentSpent = data.spent_points || 0;
        const currentBudget = data.giving_budget || 0;
        
        // Scale old budget to 10,000P
        const newBudget = currentBudget <= 100 ? 10000 : currentBudget;
        
        currentBatch.update(d.ref, {
          received_wallet: currentReceived * 100,
          spent_points: currentSpent * 100,
          giving_budget: newBudget
        });
        
        count++;
        if (count === batchLimit) {
          chunks.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          count = 0;
        }
      });
      
      // 2. Scale transaction points by 100x
      txsSnap.docs.forEach((d) => {
        const data = d.data();
        const currentPoints = data.points || 0;
        
        currentBatch.update(d.ref, {
          points: currentPoints * 100
        });
        
        count++;
        if (count === batchLimit) {
          chunks.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          count = 0;
        }
      });
      
      if (count > 0) chunks.push(currentBatch.commit());
      await Promise.all(chunks);
      
      return { success: true, message: "기존 데이터에 대한 포인트 100배 마이그레이션이 완료되었습니다." };
    } catch (e: any) {
      console.error("Migration failed:", e);
      return { success: false, message: "마이그레이션 실패: " + e.message };
    }
  }
};
