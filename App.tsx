
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import History from './components/History';
import AdminDashboard from './components/AdminDashboard';
import Guide from './components/Guide';
import GiftShop from './components/GiftShop';
import PasswordChangeModal from './components/PasswordChangeModal';
import ProfileOnboarding from './components/ProfileOnboarding';
import { api } from './lib/api';
import { Profile, Notification } from './types';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Firebase Auth 상태 추적 및 SAML Custom Token 처리
  useEffect(() => {
    const processCustomToken = async () => {
      const pendingToken = localStorage.getItem('firebase_custom_token');
      if (pendingToken) {
        localStorage.removeItem('firebase_custom_token');
        try {
          setIsLoading(true);
          const cred = await signInWithCustomToken(auth, pendingToken);
          if (cred.user && cred.user.email) {
            await api.ensureProfileExists(cred.user.uid, cred.user.email, cred.user.displayName);
          }
        } catch (err) {
          console.error("Error signing in with SAML custom token:", err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    processCustomToken();

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SAML_AUTH_SUCCESS' || event.data?.type === 'SAML_LOGIN_SUCCESS') {
        const token = event.data?.token || localStorage.getItem('firebase_custom_token');
        if (token) {
          localStorage.removeItem('firebase_custom_token');
          try {
            setIsLoading(true);
            const cred = await signInWithCustomToken(auth, token);
            if (cred.user && cred.user.email) {
              await api.ensureProfileExists(cred.user.uid, cred.user.email, cred.user.displayName);
              const profile = await api.getUser(cred.user.uid);
              if (profile) {
                setCurrentUser(profile);
              }
            }
          } catch (err) {
            console.error("Error handling SAML auth message:", err);
          } finally {
            setIsLoading(false);
          }
        } else if (auth.currentUser) {
          try {
            setIsLoading(true);
            const profile = await api.getUser(auth.currentUser.uid);
            if (profile) {
              setCurrentUser(profile);
            }
          } catch (err) {
            console.error("Error fetching profile on SAML auth message:", err);
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 인증된 상태라면 Firestore에서 프로필 로드
        const profile = await api.getUser(user.uid);
        if (profile) {
          setCurrentUser(profile);
          loadAppData();
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('message', handleMessage);
      unsubAuth();
    };
  }, []);

  // Real-time listener for current user data
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const unsub = onSnapshot(doc(db, "profiles", currentUser.id), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUser({ id: docSnap.id, ...docSnap.data() } as Profile);
      }
    });

    return () => unsub();
  }, [currentUser?.id]);

  // Global Notification Listener
  useEffect(() => {
    if (!currentUser?.id) {
      setUnreadNotifications([]);
      return;
    }
    
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", currentUser.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const allNotifs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString()
        } as Notification;
      });

      const filtered = allNotifs
        .filter(n => !n.is_read)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setUnreadNotifications(filtered);
    }, (error) => {
      console.error("Notification listener error:", error);
    });

    return () => unsub();
  }, [currentUser?.id]);

  const handleLogin = async (email: string, pass: string): Promise<string | null> => {
    const { user, error } = await api.login(email, pass);
    if (user) {
      setCurrentUser(user);
      loadAppData();
      return null;
    }
    return error;
  };

  const loadAppData = async () => {
    const users = await api.getAllUsers();
    setAllUsers(users);
  };

  const handleLogout = async () => {
    await auth.signOut();
    setCurrentUser(null);
    setCurrentPage('dashboard');
    setUnreadNotifications([]);
  };

  const handleNotificationClickInHeader = async (notif: Notification) => {
    try {
      await api.markNotificationRead(notif.id);
      setCurrentPage('history');
    } catch (err) {
      console.error("Failed to handle notification click", err);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      for (const n of unreadNotifications) {
        await api.markNotificationRead(n.id);
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  const refreshData = async () => {
    loadAppData();
  };

  const handleProfileUpdated = async () => {
    if (currentUser?.id) {
      const updated = await api.getUser(currentUser.id);
      if (updated) {
        setCurrentUser(updated);
      }
      loadAppData();
    }
  };

  const isProfileIncomplete = Boolean(
    currentUser && (
      !currentUser.name || !currentUser.name.trim() ||
      !currentUser.department || !currentUser.department.trim() ||
      !currentUser.position || !currentUser.position.trim()
    )
  );

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FAF9F6] text-slate-900 gap-4">
        <div className="w-12 h-12 border-4 border-rose-200 border-t-[#E63946] rounded-full animate-spin" />
        <p className="font-black tracking-widest text-[#E63946] uppercase">THANK YOU CERAGEM CONNECTING...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LandingPage onLogin={handleLogin} />;
  }

  // SAML / SSO Profile Onboarding if name, department, or position is missing
  if (isProfileIncomplete) {
    const userWithAuthEmail = {
      ...currentUser,
      email: currentUser.email || auth.currentUser?.email || ''
    };
    return (
      <ProfileOnboarding 
        user={userWithAuthEmail}
        onProfileUpdated={handleProfileUpdated}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <>
      <Layout 
        user={currentUser} 
        onLogout={handleLogout} 
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onChangePassword={() => setIsPasswordModalOpen(true)}
        unreadNotifications={unreadNotifications}
        onNotificationClick={handleNotificationClickInHeader}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onProfileUpdated={handleProfileUpdated}
      >
        <div className="animate-fade-in">
          {currentPage === 'dashboard' && (
            <Dashboard 
              user={currentUser} 
              allUsers={allUsers}
              refreshData={refreshData}
              onNavigate={setCurrentPage}
            />
          )}
          {currentPage === 'history' && (
            <History user={currentUser} users={allUsers} />
          )}
          {currentPage === 'giftshop' && (
            <GiftShop user={currentUser} refreshData={refreshData} />
          )}
          {currentPage === 'guide' && (
            <Guide />
          )}
          {currentPage === 'admin' && (
            <AdminDashboard 
              currentUser={currentUser} 
              refreshData={refreshData} 
            />
          )}
        </div>
      </Layout>
      
      <PasswordChangeModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        userId={currentUser.id} 
      />
    </>
  );
};

export default App;
