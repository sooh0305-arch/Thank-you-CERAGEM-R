import React, { useState, useEffect } from 'react';
import { Send, Trophy, Users, Heart, MessageSquare, Quote, X, ChevronRight, Bell, Check, Loader2, Sparkles, Star, ThumbsUp, HelpCircle, AlertCircle } from 'lucide-react';
import { Profile, Transaction, Notification } from '../types';
import SendModal from './SendModal';
import { api } from '../lib/api';
import { CERAGEMERSHIP_VALUES } from '../constants';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface DashboardProps {
  user: Profile;
  allUsers: Profile[];
  refreshData: () => void;
  unreadNotifications: Notification[];
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, allUsers, refreshData, unreadNotifications, onNavigate }) => {
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedCoreValueId, setSelectedCoreValueId] = useState<number | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [selectedPraise, setSelectedPraise] = useState<Transaction | null>(null);
  const [isNotifLoading, setIsNotifLoading] = useState<string | null>(null);

  // Withdrawal States
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [withdrawalPoints, setWithdrawalPoints] = useState(10000);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState(user.name);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isWithdrawalOpen) {
      setWithdrawalPoints(user.received_wallet >= 10000 ? user.received_wallet : 10000);
      setAccountHolder(user.name);
      setWithdrawError(null);
      setWithdrawSuccess(false);
    }
  }, [isWithdrawalOpen, user.received_wallet, user.name]);

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawalPoints < 10000) {
      setWithdrawError("출금 신청은 최소 10,000P 이상 가능합니다.");
      return;
    }
    if (withdrawalPoints > user.received_wallet) {
      setWithdrawError("보유하신 포인트 잔액을 초과하여 출금할 수 없습니다.");
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setWithdrawError("계좌 정보를 모두 입력해주세요.");
      return;
    }
    setIsWithdrawing(true);
    setWithdrawError(null);
    try {
      const res = await api.requestWithdrawal(user.id, withdrawalPoints, bankName, accountNumber, accountHolder);
      if (res.success) {
        setWithdrawSuccess(true);
        refreshData();
        setTimeout(() => {
          setIsWithdrawalOpen(false);
          setWithdrawSuccess(false);
          setBankName('');
          setAccountNumber('');
        }, 2000);
      } else {
        setWithdrawError(res.message);
      }
    } catch (err: any) {
      setWithdrawError(err.message || "출금 신청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("created_at", "desc"), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      const txs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString(),
          sender: userMap.get(data.sender_id),
          receiver: userMap.get(data.receiver_id)
        } as Transaction;
      });
      setRecentTransactions(txs);
      setIsLoadingFeed(false);
    });
    return () => unsub();
  }, [allUsers]);

  const handleSendPraise = async (receiverId: string, coreValueId: number, points: number, message: string) => {
    await api.sendPraise({
      sender_id: user.id,
      receiver_id: receiverId,
      core_value_id: coreValueId,
      points,
      message,
    });
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (isNotifLoading) return;
    setIsNotifLoading(notif.id);
    
    try {
      await api.markNotificationRead(notif.id);
      if (notif.transaction_id) {
        const tx = await api.getTransaction(notif.transaction_id);
        if (tx) {
          setSelectedPraise(tx);
        }
      }
    } catch (err) {
      console.error("Notification handling error", err);
    } finally {
      setIsNotifLoading(null);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.markNotificationRead(id);
  };

  const handleMarkAllAsRead = async () => {
    for (const n of unreadNotifications) {
      await api.markNotificationRead(n.id);
    }
  };

  const getCeragemershipText = (id: number) => {
    return CERAGEMERSHIP_VALUES.find(cv => cv.id === id)?.text || '세라제머십';
  };

  // Open praise modal with a preselected core value
  const handleOpenPraiseWithCoreValue = (coreValueId: number) => {
    setSelectedCoreValueId(coreValueId);
    setIsSendModalOpen(true);
  };

  const handleClosePraiseModal = () => {
    setIsSendModalOpen(false);
    setSelectedCoreValueId(null);
  };

  // Colors and icons matching the 7 Core Values - Unified design
  const valueStyles = [
    { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200/60', shadow: 'shadow-sm', accent: 'bg-[#E63946]', emoji: '🎯', label: '고객 관점' },
    { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200/60', shadow: 'shadow-sm', accent: 'bg-[#E63946]', emoji: '💡', label: '문제 제기' },
    { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200/60', shadow: 'shadow-sm', accent: 'bg-[#E63946]', emoji: '🔍', label: '집요한 해결' },
    { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200/60', shadow: 'shadow-sm', accent: 'bg-[#E63946]', emoji: '🤝', label: '소통과 협업' },
    { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200/60', shadow: 'shadow-sm', accent: 'bg-[#E63946]', emoji: '🔥', label: '도전과 존중' },
    { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200/60', shadow: 'shadow-sm', accent: 'bg-[#E63946]', emoji: '✨', label: '학습과 공유' },
    { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200/60', shadow: 'shadow-sm', accent: 'bg-[#E63946]', emoji: '📈', label: '원칙과 투명' },
  ];

  const totalReceivedPoints = user.received_wallet + (user.spent_points || 0);

  return (
    <div className="space-y-8 lg:space-y-12">
      {/* 칭찬 알림 배너 (개인 알람) - Clean minimal style */}
      {unreadNotifications.length > 0 && (
        <div className="animate-fade-in space-y-3">
          {unreadNotifications.map(notif => (
            <div 
              key={notif.id} 
              onClick={() => handleNotificationClick(notif)}
              className={`bg-white rounded-2xl p-5 border border-amber-200/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group cursor-pointer hover:bg-amber-50/20 transition-all ${isNotifLoading === notif.id ? 'opacity-70 grayscale-[0.5]' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#E63946]/10 text-[#E63946] rounded-xl flex items-center justify-center shrink-0">
                  {isNotifLoading === notif.id ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    칭찬 배달 완료! 💌
                  </h4>
                  <p className="text-xs lg:text-sm text-slate-600 font-medium mt-0.5">{notif.message}</p>
                </div>
              </div>
              <button 
                onClick={(e) => handleMarkAsRead(e, notif.id)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-[#E63946] transition-colors font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Check size={12} />
                <span>확인함</span>
              </button>
            </div>
          ))}
          <button 
            onClick={handleMarkAllAsRead}
            className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-[#E63946] transition-colors uppercase tracking-[0.2em]"
          >
            모든 알림 지우기
          </button>
        </div>
      )}

      {/* Hero Section - Clean flat premium design */}
      <div className="bg-[#E63946] rounded-3xl p-8 lg:p-12 text-white relative overflow-hidden shadow-sm">
        {/* Subtle background decorative element */}
        <div className="absolute right-6 top-6 opacity-10 pointer-events-none animate-float-slow hidden sm:block">
          <Sparkles size={140} className="text-white" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-white/20 text-white px-3.5 py-1 rounded-full font-bold text-xs tracking-wider uppercase">
            THANK YOU CERAGEM RUNWAY
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight break-keep whitespace-nowrap sm:whitespace-normal">
            오늘도 동료에게 따뜻한 <span className="text-yellow-300">Thank you CERAGEM</span>을 보내주세요!
          </h1>
          <p className="text-rose-100 font-medium text-sm lg:text-base max-w-none break-keep">
            가치 있는 일에는 아낌없이 칭찬을, 실패를 두려워하지 않는 동료에게는 진심 어린 응원의 에너지를 전해보세요!
          </p>
          
          <div className="pt-4">
            <button
              onClick={() => setIsSendModalOpen(true)}
              className="group flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-md"
            >
              <Send size={16} />
              <span>지금 칭찬 보내기</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Cards - Clean modern flat card elements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Cumulative Earned Points Card */}
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between gap-5 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-12 h-12 lg:w-14 lg:h-14 shrink-0 rounded-2xl bg-rose-50 flex items-center justify-center text-[#E63946]">
               <Trophy size={28} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">CUMULATIVE EARNED POINTS</p>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 leading-none">{totalReceivedPoints.toLocaleString()}</p>
                <span className="text-[10px] lg:text-xs font-bold text-[#E63946] bg-rose-50/70 border border-rose-100/50 px-2.5 py-0.5 rounded-lg whitespace-nowrap">
                   보유: {user.received_wallet.toLocaleString()} P
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('giftshop')}
              className="w-full bg-slate-900 hover:bg-[#E63946] active:scale-[0.98] text-white font-bold text-xs lg:text-sm py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>기프티콘 교환하러 가기</span>
            </button>
          </div>
        </div>

        {/* Remaining Giving Balance Card */}
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between gap-5 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-12 h-12 lg:w-14 lg:h-14 shrink-0 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
               <Users size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">REMAINING GIVING BALANCE</p>
              <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 leading-none">
                {user.giving_budget.toLocaleString()} <span className="text-xs lg:text-sm font-bold text-slate-300">P</span>
              </p>
            </div>
          </div>
          
          <div className="pt-2">
            <div className="w-full py-3 bg-slate-50 border border-dashed border-slate-200/60 rounded-xl flex items-center justify-center text-[10px] lg:text-xs font-bold text-slate-400 gap-1.5">
              <span>매월 1일 10,000P 자동 충전</span>
            </div>
          </div>
        </div>
      </div>

      {/* Praise Feed Section - Clean live activity feed */}
      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg lg:text-xl font-bold text-slate-900">
            칭찬 피드 런웨이
          </h2>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Global Live Activity</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingFeed ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-rose-100 border-t-[#E63946] mb-3" />
              <p className="font-semibold text-sm text-slate-500">소식 수신 중...</p>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-center px-4 shadow-sm">
              <MessageSquare size={36} className="mb-3 opacity-25 text-[#E63946]" />
              <p className="font-bold text-sm text-slate-800">아직 등록된 칭찬이 없네요.</p>
              <p className="text-xs text-slate-400 mt-1">첫 번째 칭찬의 주인공이 되어 무대를 빛내주세요!</p>
            </div>
          ) : (
            recentTransactions.map((tx, idx) => {
              const themeStyle = valueStyles[(tx.core_value_id - 1) % valueStyles.length] || valueStyles[0];
              return (
                <div 
                  key={tx.id} 
                  onClick={() => setSelectedPraise(tx)}
                  className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center min-w-0">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm leading-none truncate">{tx.receiver?.name || '동료'}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1 truncate">{tx.receiver?.department || 'CERAGEM'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative mb-4 min-h-[55px]">
                    <p className="text-xs lg:text-sm text-slate-600 leading-relaxed font-normal line-clamp-3">
                      "{tx.message}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg truncate max-w-[140px]">
                        세라제머십 {tx.core_value_id} • {themeStyle.label}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#E63946] flex items-center shrink-0 group-hover:translate-x-0.5 transition-transform gap-0.5">
                      상세 보기 <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Praise Detail Modal (Responsive) - Clean slate and white theme */}
      {selectedPraise && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl w-full max-w-lg overflow-hidden transform animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center">
                <h3 className="text-base font-bold text-slate-800">칭찬 카드 상세</h3>
              </div>
              <button onClick={() => setSelectedPraise(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 lg:p-8 space-y-6 overflow-y-auto max-h-[65vh]">
              <div className="flex items-center p-5 bg-slate-50/50 border border-slate-100 rounded-2xl shadow-sm">
                <div className="min-w-0">
                  <span className="text-base font-bold text-slate-800 truncate block leading-tight">{selectedPraise.receiver?.name}</span>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5">{selectedPraise.receiver?.department}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <MessageSquare size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">MESSAGE</span>
                </div>
                <div className="bg-slate-50/30 p-5 rounded-2xl border border-slate-100 relative">
                  <p className="text-slate-700 text-sm lg:text-base leading-relaxed whitespace-pre-wrap font-normal relative z-10">
                    "{selectedPraise.message}"
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <Trophy size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">CERAGEMERSHIP VALUE</span>
                </div>
                <div className="p-5 bg-slate-900 rounded-2xl text-white">
                  <p className="text-[#E63946] font-bold text-[10px] uppercase tracking-widest mb-1.5">
                    Ceragemership {selectedPraise.core_value_id}
                  </p>
                  <p className="text-xs lg:text-sm font-semibold leading-relaxed text-slate-200">
                    {getCeragemershipText(selectedPraise.core_value_id)}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                🏆 +{selectedPraise.points} POINTS SENT
              </span>
              <button 
                onClick={() => setSelectedPraise(null)}
                className="px-5 py-2.5 bg-[#E63946] text-white hover:bg-[#d52b38] rounded-xl font-bold transition-colors shadow-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <SendModal 
        isOpen={isSendModalOpen} 
        onClose={handleClosePraiseModal}
        currentUser={user}
        users={allUsers}
        onSend={handleSendPraise}
        initialCoreValueId={selectedCoreValueId}
      />

      {isWithdrawalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden transform animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center">
                <h3 className="text-base font-bold text-slate-800">현금 출금 신청</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsWithdrawalOpen(false)} 
                disabled={isWithdrawing}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestWithdrawal}>
              <div className="p-6 space-y-4">
                {withdrawError && (
                  <div className="p-3 bg-rose-50 text-[#E63946] text-xs font-semibold rounded-xl border border-rose-100 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                {withdrawSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-100 flex items-center gap-2">
                    <Check size={14} className="shrink-0" />
                    <span>출금 신청이 정상적으로 완료되었습니다!</span>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">출금 가능 포인트</span>
                  <span className="font-extrabold text-slate-950 text-sm">
                    {user.received_wallet.toLocaleString()} P
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">출금 신청 포인트 (1P = 1원)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={10000}
                      max={user.received_wallet}
                      disabled={isWithdrawing || withdrawSuccess}
                      value={withdrawalPoints}
                      onChange={(e) => setWithdrawalPoints(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#E63946]/50 focus:outline-none transition-all font-bold text-sm text-slate-900"
                    />
                    <span className="absolute right-4 top-2.5 text-xs font-bold text-[#E63946]">P (원)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">* 최소 10,000P 이상 1P 단위로 신청 가능합니다.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">은행명</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 신한은행, 국민은행 등"
                    disabled={isWithdrawing || withdrawSuccess}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#E63946]/50 focus:outline-none transition-all font-medium text-sm text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">계좌번호</label>
                  <input
                    type="text"
                    required
                    placeholder="'-' 없이 숫자만 입력"
                    disabled={isWithdrawing || withdrawSuccess}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#E63946]/50 focus:outline-none transition-all font-medium text-sm text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">예금주</label>
                  <input
                    type="text"
                    required
                    disabled={isWithdrawing || withdrawSuccess}
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#E63946]/50 focus:outline-none transition-all font-medium text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsWithdrawalOpen(false)}
                  disabled={isWithdrawing}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawing || withdrawSuccess}
                  className="px-5 py-2.5 bg-[#E63946] text-white hover:bg-[#d52b38] rounded-xl font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>신청 중...</span>
                    </>
                  ) : (
                    <span>신청하기</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
