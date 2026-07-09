import React, { useState, useEffect } from 'react';
import { ShoppingBag, Gift, Clock, CheckCircle, AlertCircle, RefreshCw, Star, Tag, Smartphone, ArrowRight } from 'lucide-react';
import { Profile, Withdrawal } from '../types';
import { api } from '../lib/api';

interface GiftShopProps {
  user: Profile;
  refreshData: () => void;
}

interface GiftItem {
  id: string;
  name: string;
  brand: string;
  cost: number;
  color: string;
  emoji: string;
  bgColor: string;
}

const GIFT_ITEMS: GiftItem[] = [
  {
    id: 'naverpay-1000',
    name: '네이버페이 포인트 쿠폰 1,000원권',
    brand: '네이버페이',
    cost: 1000,
    color: 'text-[#03C75A] bg-[#03C75A]/10',
    emoji: '🟢',
    bgColor: 'from-emerald-50 to-green-50/30'
  },
  {
    id: 'naverpay-3000',
    name: '네이버페이 포인트 쿠폰 3,000원권',
    brand: '네이버페이',
    cost: 3000,
    color: 'text-[#03C75A] bg-[#03C75A]/10',
    emoji: '🟢',
    bgColor: 'from-emerald-50 to-green-50/30'
  },
  {
    id: 'naverpay-5000',
    name: '네이버페이 포인트 쿠폰 5,000원권',
    brand: '네이버페이',
    cost: 5000,
    color: 'text-[#03C75A] bg-[#03C75A]/10',
    emoji: '🟢',
    bgColor: 'from-emerald-50 to-green-50/30'
  },
  {
    id: 'naverpay-10000',
    name: '네이버페이 포인트 쿠폰 10,000원권',
    brand: '네이버페이',
    cost: 10000,
    color: 'text-[#03C75A] bg-[#03C75A]/10',
    emoji: '🟢',
    bgColor: 'from-emerald-50 to-green-50/30'
  },
  {
    id: 'cu-1000',
    name: 'CU 모바일 금액권 1,000원권',
    brand: 'CU',
    cost: 1000,
    color: 'text-[#742CB7] bg-[#742CB7]/10',
    emoji: '🏪',
    bgColor: 'from-purple-50 to-indigo-50/30'
  },
  {
    id: 'cu-3000',
    name: 'CU 모바일 금액권 3,000원권',
    brand: 'CU',
    cost: 3000,
    color: 'text-[#742CB7] bg-[#742CB7]/10',
    emoji: '🏪',
    bgColor: 'from-purple-50 to-indigo-50/30'
  },
  {
    id: 'cu-5000',
    name: 'CU 모바일 금액권 5,000원권',
    brand: 'CU',
    cost: 5000,
    color: 'text-[#742CB7] bg-[#742CB7]/10',
    emoji: '🏪',
    bgColor: 'from-purple-50 to-indigo-50/30'
  },
  {
    id: 'cu-10000',
    name: 'CU 모바일 금액권 10,000원권',
    brand: 'CU',
    cost: 10000,
    color: 'text-[#742CB7] bg-[#742CB7]/10',
    emoji: '🏪',
    bgColor: 'from-purple-50 to-indigo-50/30'
  }
];

const GiftShop: React.FC<GiftShopProps> = ({ user, refreshData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Withdrawal[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedItem, setSelectedItem] = useState<GiftItem | null>(null);

  const fetchPurchaseHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await api.getUserWithdrawals(user.id);
      setPurchases(history);
    } catch (e) {
      console.error("Failed to load user purchase history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchPurchaseHistory();
  }, [user.id]);

  const handlePurchase = async (item: GiftItem) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (user.received_wallet < item.cost) {
      setErrorMsg(`포인트가 부족합니다. '${item.name}' 구매에는 ${item.cost.toLocaleString()}P가 필요합니다.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const confirmPurchase = window.confirm(`'${item.name}' 상품권을 ${item.cost.toLocaleString()}P로 구매하시겠습니까?\n구매 즉시 포인트가 차감됩니다.`);
    if (!confirmPurchase) return;

    setIsSubmitting(true);
    try {
      // Re-use requestWithdrawal to track gifticon purchases
      // bank_name: "기프티콘 구매"
      // account_number: item name
      // account_holder: brand name
      const result = await api.requestWithdrawal(
        user.id,
        item.cost,
        '기프티콘 구매',
        item.name,
        item.brand
      );

      if (result.success) {
        setSuccessMsg(`'${item.name}' 구매 신청이 정상 완료되었습니다! 관리자 승인 후 개별 발송됩니다.`);
        await refreshData();
        await fetchPurchaseHistory();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "구매 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-16">
      {/* Title Header */}
      <div className="text-center md:text-left space-y-3">
        <div className="inline-flex items-center gap-2 bg-[#742CB7]/5 px-4 py-2 rounded-full border border-[#742CB7]/15">
          <Gift size={15} className="text-[#742CB7]" />
          <span className="text-xs font-bold text-slate-700 tracking-wider">받은 포인트로 인기 모바일 상품권을 구매해보세요! 🎁</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">기프티콘/상품권 상점</h1>
        <p className="text-xs sm:text-sm md:text-base text-slate-500 font-medium max-w-none leading-relaxed break-keep md:whitespace-nowrap">
          동료들에게 받은 칭찬 카드로 열심히 적립한 소중한 포인트를 즉시 네이버페이 포인트 쿠폰과 CU 모바일 금액권으로 교환하세요.
        </p>
      </div>

      {/* Main Grid: Products on Left, History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Product Grid & Notifications */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* User Points & Notifications bar */}
          <div className="p-6 md:p-8 bg-slate-900 rounded-3xl text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShoppingBag size={140} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">나의 사용 가능한 포인트</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl md:text-5xl font-black text-white tracking-tight">
                  {user.received_wallet.toLocaleString()}
                </span>
                <span className="text-lg font-bold text-yellow-400">P</span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-3 leading-relaxed">
                ※ 기프티콘 구매 신청 즉시 포인트가 차감되며, 신청 내역은 오른쪽 구매 내역에서 관리자가 확인 후 발송 처리해 드립니다.
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-5 bg-rose-50 text-[#E63946] rounded-2xl border border-rose-100 flex items-start gap-3 text-sm font-semibold leading-relaxed animate-fade-in shadow-sm">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex items-start gap-3 text-sm font-semibold leading-relaxed animate-fade-in shadow-sm">
              <CheckCircle className="shrink-0 mt-0.5" size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Product Cards Layout */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Tag size={20} className="text-[#742CB7]" />
              <span>모바일 상품권 상품 목록</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {GIFT_ITEMS.map((item) => {
                const canAfford = user.received_wallet >= item.cost;
                return (
                  <div 
                    key={item.id}
                    className="group bg-white rounded-3xl border border-slate-100 p-5 flex flex-col justify-between hover:shadow-lg hover:border-slate-200 transition-all duration-300 relative overflow-hidden"
                  >
                    {item.brand === '네이버페이' ? (
                      /* Inner virtual Naver Pay card */
                      <div className="relative aspect-[1.58/1] w-full bg-[#03C75A] rounded-2xl p-5 text-white shadow-sm overflow-hidden flex flex-col justify-between select-none">
                        {/* Subtle reflection overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-70 pointer-events-none" />
                        
                        {/* Top row */}
                        <div className="flex justify-between items-start relative z-10">
                          {/* Chip graphic */}
                          <div className="w-8 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md opacity-80 shadow-inner" />
                          
                          {/* Price badge */}
                          <span className="bg-white/20 backdrop-blur-md text-white font-black text-xs px-2.5 py-1 rounded-full border border-white/10 tracking-tight">
                            {item.cost.toLocaleString()}원
                          </span>
                        </div>

                        {/* Logo in the center */}
                        <div className="flex items-center justify-center gap-1.5 relative z-10 py-2">
                          <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm font-sans font-black text-[#03C75A] text-lg select-none leading-none shadow-sm">
                            N
                          </div>
                          <span className="font-sans font-bold text-xl tracking-tight text-white leading-none">Pay</span>
                        </div>

                        {/* Bottom row */}
                        <div className="flex justify-between items-end relative z-10">
                          <div className="text-left">
                            <p className="text-[10px] font-black text-white/95 leading-none mb-1">네이버페이</p>
                            <p className="text-[10px] font-medium text-white/80 leading-none">포인트 쿠폰</p>
                          </div>
                          <span className="text-xs font-black text-yellow-300 tracking-tight bg-black/10 px-2.5 py-1 rounded-md">
                            {item.cost.toLocaleString()}P
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Inner virtual CU card */
                      <div className="relative aspect-[1.58/1] w-full bg-[#742CB7] rounded-2xl p-5 text-white shadow-sm overflow-hidden flex flex-col justify-between select-none">
                        {/* Subtle reflection overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-70 pointer-events-none" />
                        
                        {/* Top row */}
                        <div className="flex justify-between items-start relative z-10">
                          {/* Chip graphic */}
                          <div className="w-8 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md opacity-80 shadow-inner" />
                          
                          {/* Price badge */}
                          <span className="bg-white/20 backdrop-blur-md text-white font-black text-xs px-2.5 py-1 rounded-full border border-white/10 tracking-tight">
                            {item.cost.toLocaleString()}원
                          </span>
                        </div>

                        {/* Logo in the center - CU speech bubble outline */}
                        <div className="flex items-center justify-center relative z-10 py-2">
                          <div className="flex items-center justify-center bg-white border border-[#742CB7] rounded-full px-5 py-1 shadow-sm">
                            <span className="font-sans font-black text-[#742CB7] text-lg tracking-tight leading-none">CU</span>
                          </div>
                        </div>

                        {/* Bottom row */}
                        <div className="flex justify-between items-end relative z-10">
                          <div className="text-left">
                            <p className="text-[10px] font-black text-white/95 leading-none mb-1">씨유</p>
                            <p className="text-[10px] font-medium text-white/80 leading-none">모바일 금액권</p>
                          </div>
                          <span className="text-xs font-black text-yellow-300 tracking-tight bg-black/10 px-2.5 py-1 rounded-md">
                            {item.cost.toLocaleString()}P
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Card metadata & CTA button */}
                    <div className="space-y-4 mt-4">
                      <div>
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                          item.brand === '네이버페이' ? 'text-[#03C75A] bg-[#03C75A]/10' : 'text-[#742CB7] bg-[#742CB7]/10'
                        }`}>
                          {item.brand}
                        </span>
                        <h3 className="font-black text-slate-800 text-sm mt-2 leading-snug">
                          {item.name}
                        </h3>
                      </div>

                      {/* Action Button */}
                      <div className="pt-3 border-t border-slate-50">
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={isSubmitting}
                          className={`w-full py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                            canAfford 
                              ? item.brand === '네이버페이' 
                                ? 'bg-[#03C75A] text-white hover:bg-[#02b350] hover:scale-[1.01]' 
                                : 'bg-[#742CB7] text-white hover:bg-[#60239b] hover:scale-[1.01]'
                              : 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed'
                          }`}
                        >
                          <span>{canAfford ? '구매 신청하기' : '포인트 부족'}</span>
                          {canAfford && <ArrowRight size={13} className="text-white group-hover:translate-x-0.5 transition-transform" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Order Status / History */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col h-[580px] overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-slate-500" />
                <span>나의 기프티콘 구매 내역</span>
              </h2>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-black">
                {purchases.length}건
              </span>
            </div>

            {isLoadingHistory ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="animate-spin text-[#E63946]" size={20} />
                <span className="text-xs font-bold">내역을 불러오는 중...</span>
              </div>
            ) : purchases.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mb-3">
                  <Gift size={24} />
                </div>
                <p className="text-xs font-bold text-slate-500">구매 신청 이력이 없습니다.</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  동료들에게 받은 포인트를 사용하여 첫 기프티콘을 구매해 보세요!
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 mt-2">
                {purchases.map((p) => {
                  const isGifticon = p.bank_name === '기프티콘 구매';
                  const displayName = isGifticon ? p.account_number : `${p.bank_name} 환급 신청`;
                  const brandName = isGifticon ? p.account_holder : '현금 출금';

                  return (
                    <div key={p.id} className="py-4 flex flex-col gap-2 hover:bg-slate-50/50 transition-colors rounded-xl px-2.5">
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide leading-none block mb-1">
                            {brandName}
                          </span>
                          <span className="font-extrabold text-slate-800 block truncate max-w-[170px]" title={displayName}>
                            {displayName}
                          </span>
                        </div>
                        
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <span className="font-black text-[#E63946] text-right">
                            {p.points.toLocaleString()}P
                          </span>
                          
                          {p.status === 'pending' && (
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[9px] font-bold border border-amber-100">
                              대기중
                            </span>
                          )}
                          {p.status === 'approved' && (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-bold border border-emerald-100">
                              발송완료
                            </span>
                          )}
                          {p.status === 'rejected' && (
                            <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md text-[9px] font-bold border border-rose-100">
                              반려됨
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>{new Date(p.created_at).toLocaleDateString()}</span>
                        {p.status === 'approved' && (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle size={10} /> 휴대폰 MMS 발송 완료
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default GiftShop;
