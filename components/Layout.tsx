import React, { useState } from 'react';
import { Home, History, Settings, LogOut, Lock, ShoppingBag, Menu, X, Bell, HelpCircle, Camera, Award, Wallet } from 'lucide-react';
import { Profile, Notification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: Profile;
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  onChangePassword: () => void;
  unreadNotifications: Notification[];
  onNotificationClick: (notif: Notification) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  currentPage, 
  onNavigate, 
  onChangePassword, 
  unreadNotifications, 
  onNotificationClick, 
  onMarkAllAsRead 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', icon: Home, label: '홈' },
    { id: 'history', icon: History, label: '나의 히스토리' },
    { id: 'giftshop', icon: ShoppingBag, label: '기프티콘 상점' },
    { id: 'guide', icon: HelpCircle, label: '가이드' },
  ];

  if (user.role === 'admin') {
    navItems.push({ id: 'admin', icon: Settings, label: '관리자 모드' });
  }

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F6] font-sans text-slate-900 overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Clean charcoal gray theme */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-slate-900 text-white flex flex-col border-r border-slate-800 z-[70] transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Section */}
        <div className="relative z-10 p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div className="flex flex-col items-start select-none">
             <h1 className="text-lg font-extrabold leading-none tracking-tight text-white uppercase">
               Thank you <span className="text-[#E63946]">CERAGEM</span>
             </h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Navigation - elegant minimal buttons */}
        <nav className="relative z-10 flex-1 p-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#E63946] text-white font-bold shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'} />
                <span className="text-sm font-medium tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="relative z-10 p-6 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center mb-5">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{user.department}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={onChangePassword}
              className="flex items-center justify-center space-x-1 py-2 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-xs font-semibold text-slate-200 transition-colors border border-slate-700"
            >
              <Lock size={12} />
              <span>비번 변경</span>
            </button>
            <button 
              onClick={onLogout}
              className="flex items-center justify-center space-x-1 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-semibold transition-colors border border-rose-500/10"
            >
              <LogOut size={12} />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full lg:ml-72 transition-all duration-300">
        {/* Header - Off-white with crisp, elegant thin border */}
        <header className="h-16 lg:h-20 bg-[#FAF9F6] border-b border-slate-200/80 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-40">
           <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="lg:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-900 transition-colors border border-transparent hover:border-slate-200"
             >
               <Menu size={20} />
             </button>
             <div className="text-sm lg:text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
               {currentPage === 'dashboard' && '대시보드 홈'}
               {currentPage === 'giftshop' && '기프티콘 상점'}
               {currentPage === 'history' && '나의 히스토리'}
               {currentPage === 'guide' && '사용 설명서'}
               {currentPage === 'admin' && '관리자 모드'}
             </div>
           </div>
           
           <div className="flex items-center space-x-3 lg:space-x-4">
              {/* Notification Badge in Header */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="relative p-2 text-slate-600 hover:text-[#E63946] transition-colors rounded-xl hover:bg-slate-100"
                >
                  <Bell size={20} />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E63946] rounded-full ring-2 ring-[#FAF9F6]" />
                  )}
                </button>

                {/* Dropdown Card */}
                {isNotifOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsNotifOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl py-3 z-50 animate-scale-in">
                      <div className="px-4 pb-2 border-b border-slate-50 flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-800">알림</span>
                        {unreadNotifications.length > 0 && (
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              setIsNotifOpen(false);
                              await onMarkAllAsRead();
                            }}
                            className="text-[10px] text-[#E63946] hover:underline font-bold"
                          >
                            모두 읽음
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                        {unreadNotifications.length === 0 ? (
                          <div className="py-8 text-center">
                            <Bell size={24} className="text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-medium">도착한 새로운 알림이 없습니다.</p>
                          </div>
                        ) : (
                          unreadNotifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={async () => {
                                setIsNotifOpen(false);
                                await onNotificationClick(notif);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3"
                            >
                              <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E63946] flex items-center justify-center shrink-0 mt-0.5">
                                <Bell size={14} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800">칭찬 배달 완료! 💌</p>
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                                <p className="text-[9px] text-slate-400 mt-1 font-medium">
                                  {new Date(notif.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="h-5 w-px bg-slate-200" />

              {/* Minimal point badge */}
              <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                <span className="text-xs text-slate-500 font-medium">보유 포인트</span>
                <span className="text-sm lg:text-base font-bold text-slate-900 leading-none">
                  {user.received_wallet.toLocaleString()}<span className="text-[#E63946] text-xs font-bold ml-0.5">P</span>
                </span>
              </div>
           </div>
        </header>

        {/* Outer content stage */}
        <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
