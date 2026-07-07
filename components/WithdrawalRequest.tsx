import React, { useState, useEffect } from 'react';
import { Wallet, Landmark, User, CreditCard, Send, CheckCircle, AlertCircle, RefreshCw, Clock, XCircle, ChevronRight } from 'lucide-react';
import { Profile, Withdrawal } from '../types';
import { api } from '../lib/api';

interface WithdrawalRequestProps {
  user: Profile;
  refreshData: () => void;
}

const WithdrawalRequest: React.FC<WithdrawalRequestProps> = ({ user, refreshData }) => {
  const [withdrawalPoints, setWithdrawalPoints] = useState<number>(10000);
  const [bankName, setBankName] = useState('급여 합산 지급');
  const [accountNumber, setAccountNumber] = useState('급여 계좌');
  const [accountHolder, setAccountHolder] = useState(user.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchWithdrawalHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await api.getUserWithdrawals(user.id);
      setWithdrawals(history);
    } catch (e) {
      console.error("Failed to load user withdrawal history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchWithdrawalHistory();
    setAccountHolder(user.name);
  }, [user.id, user.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (withdrawalPoints < 10000) {
      setErrorMsg("출금 신청은 최소 10,000P 이상부터 가능합니다.");
      return;
    }

    if (withdrawalPoints > user.received_wallet) {
      setErrorMsg("보유하신 포인트 잔액을 초과하여 출금할 수 없습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.requestWithdrawal(
        user.id,
        withdrawalPoints,
        '급여 합산 지급',
        '급여 계좌',
        user.name
      );

      if (result.success) {
        setSuccessMsg("출금 신청이 정상적으로 완료되었습니다! 다음 달 월급 지급 시 포인트 환급액이 합산되어 입금됩니다.");
        setWithdrawalPoints(10000);
        await refreshData();
        await fetchWithdrawalHistory();
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "출금 신청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = (amount: number) => {
    setWithdrawalPoints(prev => {
      const newVal = prev + amount;
      return newVal > user.received_wallet ? user.received_wallet : newVal;
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Title Header */}
      <div className="text-center md:text-left space-y-2">
        <div className="inline-flex items-center gap-2 bg-rose-50 px-3.5 py-1.5 rounded-full border border-rose-100">
          <Wallet size={13} className="text-[#E63946]" />
          <span className="text-[10px] font-bold text-slate-600 tracking-wider">포인트를 급여에 포함해 지급받으세요!</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-800 tracking-tight">급여 포함 출금 신청</h1>
        <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">
          동료들에게 칭찬을 통해 열심히 적립한 받은 포인트를 1:1 비율로 다음 달 급여에 합산하여 원화로 환급받으실 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Form Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Current Balance Box */}
          <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Wallet size={120} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">나의 출금 가능 포인트</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl md:text-4xl font-black text-white tracking-tight">{user.received_wallet.toLocaleString()}</span>
              <span className="text-sm font-bold text-rose-400">P</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-2">
              ※ 최소 10,000P부터 만원 단위로 출금 가능하며, 1P당 1원의 가치를 지닙니다.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Landmark size={18} className="text-[#E63946]" />
              <span>출금 신청 정보 입력</span>
            </h2>

            {/* Info Box about Salary Integration */}
            <div className="bg-amber-50/50 border border-amber-200/30 p-4 rounded-2xl flex items-start gap-3">
              <CheckCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div className="space-y-0.5">
                <h4 className="font-bold text-slate-800 text-[11px]">무기입 급여 연동 시스템</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                  계좌번호를 입력하실 필요가 없습니다. 신청하신 금액은 회사에 등록된 귀하의 <span className="text-[#E63946] font-bold">급여 입금 계좌</span>로 월급 지급 시 합산되어 동시 지급됩니다.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Point Amount */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-bold text-slate-500">신청 포인트액 (P)</label>
                  <button
                    type="button"
                    onClick={() => setWithdrawalPoints(Math.floor(user.received_wallet / 10000) * 10000)}
                    className="text-[10px] font-bold text-[#E63946] hover:underline"
                  >
                    최대 금액 입력
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="10000"
                    min="10000"
                    max={user.received_wallet}
                    value={withdrawalPoints}
                    onChange={(e) => setWithdrawalPoints(parseInt(e.target.value) || 0)}
                    className="w-full pl-5 pr-12 py-3.5 bg-slate-50/50 border border-slate-150 rounded-2xl focus:bg-white focus:border-[#E63946]/50 focus:outline-none font-bold text-sm"
                    placeholder="신청하실 금액을 입력해 주세요."
                  />
                  <span className="absolute right-5 top-4 font-bold text-slate-400 text-xs">P</span>
                </div>
                {/* Quick Add Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[10000, 50000, 100000].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleQuickAdd(amount)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[10px] rounded-lg transition-colors border border-slate-100"
                    >
                      +{amount.toLocaleString()}P
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWithdrawalPoints(10000)}
                    className="px-3 py-1.5 bg-rose-50/50 hover:bg-rose-50 text-[#E63946] font-bold text-[10px] rounded-lg transition-colors border border-rose-100/50"
                  >
                    초기화
                  </button>
                </div>
              </div>

              {/* Error/Success Feedback */}
              {errorMsg && (
                <div className="p-4 bg-rose-50 text-[#E63946] rounded-xl border border-rose-100 flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
                  <CheckCircle className="shrink-0 mt-0.5" size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || user.received_wallet < 10000}
                className="w-full py-3.5 bg-[#E63946] hover:bg-[#d52b38] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs md:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>출금 신청 처리 중...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>출금 신청하기 (원화 지급)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right: History Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col h-[580px] overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-slate-500" />
                <span>나의 출금 신청 내역</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-400">{withdrawals.length}건</span>
            </div>

            {isLoadingHistory ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="animate-spin text-[#E63946]" size={20} />
                <span className="text-xs font-medium">내역을 로딩 중입니다...</span>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Wallet className="text-slate-200 mb-3" size={40} />
                <p className="text-xs font-bold text-slate-500">출금 신청 이력이 없습니다.</p>
                <p className="text-[10px] text-slate-400 mt-1">포인트를 정성껏 모아 현금 출금을 신청해 보세요!</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 mt-2">
                {withdrawals.map((w) => (
                  <div key={w.id} className="py-4 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/30 transition-colors rounded-xl px-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800">{w.points.toLocaleString()} 원</span>
                        {w.status === 'pending' && (
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[9px] font-bold border border-amber-100">
                            대기중
                          </span>
                        )}
                        {w.status === 'approved' && (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-bold border border-emerald-100">
                            지급완료
                          </span>
                        )}
                        {w.status === 'rejected' && (
                          <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md text-[9px] font-bold border border-rose-100">
                            반려됨
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                        {w.bank_name === '급여 합산 지급' ? '다음 달 급여에 합산되어 입금 예정' : `${w.bank_name} • ${w.account_number}`}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium">
                        {new Date(w.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalRequest;
