
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import History from './components/History';
import AdminDashboard from './components/AdminDashboard';
import Guide from './components/Guide';
import GiftShop from './components/GiftShop';
import PasswordChangeModal from './components/PasswordChangeModal';
import { api } from './lib/api';
import { Profile, Notification } from './types';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Firebase Auth 상태 추적
  useEffect(() => {
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

    return () => unsubAuth();
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

  const refreshData = async () => {
    loadAppData();
  };

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

  return (
    <>
      <Layout 
        user={currentUser} 
        onLogout={handleLogout} 
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onChangePassword={() => setIsPasswordModalOpen(true)}
        unreadCount={unreadNotifications.length}
      >
        <div className="animate-fade-in">
          {currentPage === 'dashboard' && (
            <Dashboard 
              user={currentUser} 
              allUsers={allUsers}
              refreshData={refreshData}
              unreadNotifications={unreadNotifications}
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
