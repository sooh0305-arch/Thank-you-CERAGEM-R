import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle, Minus, Plus, AlertCircle, Info, Sparkles } from 'lucide-react';
import { Profile, Transaction } from '../types';
import { CERAGEMERSHIP_VALUES } from '../constants';
import { api } from '../lib/api';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile;
  users: Profile[];
  onSend: (receiverId: string, coreValueId: number, points: number, message: string) => Promise<void>;
  initialCoreValueId?: number | null;
}

const SendModal: React.FC<SendModalProps> = ({ isOpen, onClose, currentUser, users, onSend, initialCoreValueId }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedCoreValue, setSelectedCoreValue] = useState<number | null>(null);
  const [points, setPoints] = useState(100);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [praiseHistoryWithUser, setPraiseHistoryWithUser] = useState<Transaction[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep(1); 
      setSearchTerm(''); 
      setSelectedUser(null);
      setSelectedCoreValue(initialCoreValueId || null); 
      setPoints(100); 
      setMessage('');
      setIsSubmitting(false); 
      setErrorMsg(null);
    }
  }, [isOpen, initialCoreValueId]);

  useEffect(() => {
    const checkHistory = async () => {
      if (selectedUser) {
        const allTx = await api.getAllTransactions();
        const resetAt = currentUser.praise_reset_at ? new Date(currentUser.praise_reset_at).getTime() : 0;
        const history = allTx.filter(t => 
          t.sender_id === currentUser.id && 
          t.receiver_id === selectedUser.id &&
          new Date(t.created_at).getTime() > resetAt
        );
        setPraiseHistoryWithUser(history);
        if (history.length >= 2) {
          setErrorMsg(`${selectedUser.name}님에게는 이번 회차의 칭찬을 모두 보내셨습니다.`);
        } else {
          setErrorMsg(null);
        }
      }
    };
    if (step === 1) checkHistory();
  }, [selectedUser, step, currentUser.id, currentUser.praise_reset_at]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => 
    u.id !== currentUser.id && (u.name.includes(searchTerm) || u.department.includes(searchTerm))
  );

  const handleSend = async () => {
    if (!selectedUser || !selectedCoreValue) return;
    if (message.trim().length < 50) { 
      alert("메시지를 50자 이상 작성해주세요."); 
      return; 
    }
    setIsSubmitting(true);
    await onSend(selectedUser.id, selectedCoreValue, points, message);
    setIsSubmitting(false);
    onClose();
  };

  const valueLabels = [
    '🎯 고객 관점',
    '💡 문제 제기',
    '🔍 집요한 해결',
    '🤝 소통과 협업',
    '🔥 도전과 존중',
    '✨ 학습과 공유',
    '📈 원칙과 투명'
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 lg:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header - Minimal and clean step indicator */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-[#E63946] bg-[#E63946]/10 px-3 py-1 rounded-xl">
              {step}/3
            </span>
            <h2 className="text-base font-bold text-slate-800">
              {step === 1 && '칭찬할 동료 찾기'}
              {step === 2 && '실천 핵심가치 선택'}
              {step === 3 && '메시지와 포인트 입력'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {step === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
                <input
                  type="text" 
                  placeholder="이름 또는 부서명으로 검색..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#E63946]/50 focus:outline-none transition-all font-medium text-sm"
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {errorMsg && (
                <div className="p-4 bg-rose-50 text-[#E63946] text-xs font-semibold rounded-xl border border-rose-100 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5 max-h-[45vh] overflow-y-auto pr-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 font-medium text-xs tracking-wider">검색 결과가 없습니다.</p>
                ) : (
                  filteredUsers.map(u => (
                    <button 
                      key={u.id} 
                      onClick={() => setSelectedUser(u)} 
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        selectedUser?.id === u.id 
                          ? 'border-[#E63946] bg-rose-50/50 shadow-sm' 
                          : 'border-slate-100 hover:bg-slate-50/50 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3 text-left">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-[#E63946]/10 text-[#E63946] flex items-center justify-center font-bold text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm leading-tight">{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-1">{u.department}</p>
                        </div>
                      </div>
                      {selectedUser?.id === u.id && <CheckCircle size={18} className="text-[#E63946]" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase px-1">실천한 핵심가치를 하나 선택해주세요:</p>
              <div className="grid grid-cols-1 gap-2.5">
                {CERAGEMERSHIP_VALUES.map((cv, idx) => (
                  <button 
                    key={cv.id} 
                    onClick={() => setSelectedCoreValue(cv.id)} 
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedCoreValue === cv.id 
                        ? 'border-[#E63946] bg-rose-50/50 shadow-sm' 
                        : 'border-slate-100 hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`font-bold text-xs px-2.5 py-1 rounded-lg shrink-0 ${
                        selectedCoreValue === cv.id 
                          ? 'bg-[#E63946] text-white' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {cv.id.toString().padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${selectedCoreValue === cv.id ? 'text-[#E63946]' : 'text-slate-400'}`}>
                          {valueLabels[idx] || '핵심 가치'}
                        </p>
                        <p className={`text-xs lg:text-sm leading-relaxed ${selectedCoreValue === cv.id ? 'text-slate-800 font-semibold' : 'text-slate-600'}`}>
                          {cv.text}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {/* Point input box */}
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">보낼 포인트 예산 선택 (100P ~ 1,000P)</label>
                <div className="flex items-center justify-center space-x-6">
                  <button 
                    onClick={() => setPoints(p => Math.max(100, p - 100))} 
                    className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="flex items-baseline bg-slate-900 text-white px-6 py-2.5 rounded-xl shadow-sm">
                    <span className="text-2xl font-bold w-16 text-center leading-none">{points}</span>
                    <span className="text-xs font-bold">P</span>
                  </div>
                  <button 
                    onClick={() => setPoints(p => Math.min(1000, p + 100))} 
                    className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Message field with letter counter */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">칭찬 메시지 (50자 이상 필수)</label>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    message.length >= 50 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'bg-rose-50 text-[#E63946]'
                  }`}>
                    {message.length} / 50자 이상
                  </span>
                </div>
                <textarea 
                  className="w-full p-4 bg-slate-50/50 border border-slate-150 rounded-2xl focus:bg-white focus:border-[#E63946]/50 focus:outline-none h-44 text-sm font-medium resize-none leading-relaxed" 
                  placeholder="동료가 발휘한 칭찬 핵심가치 행동과 감사의 마음을 구체적으로 최소 50자 이상 듬뿍 담아 적어주세요. 💖" 
                  value={message} 
                  onChange={e => setMessage(e.target.value)} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer - minimal action buttons */}
        <div className="p-5 lg:p-6 border-t border-slate-100 bg-white flex justify-between gap-4">
          <button 
            onClick={() => setStep(s => (s - 1) as any)} 
            disabled={step === 1} 
            className="px-5 py-3 rounded-xl text-slate-400 font-bold hover:text-slate-700 hover:bg-slate-50 disabled:opacity-0 text-sm transition-colors"
          >
            뒤로가기
          </button>
          
          <button
            onClick={step === 3 ? handleSend : () => setStep(s => (s + 1) as any)}
            disabled={(step === 1 && (!selectedUser || !!errorMsg)) || (step === 2 && !selectedCoreValue) || (step === 3 && (message.length < 50 || isSubmitting))}
            className="flex-1 lg:flex-none lg:px-10 py-3 rounded-xl bg-[#E63946] hover:bg-[#d52b38] text-white font-bold text-sm transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {step === 3 ? (isSubmitting ? '전송 중... 🚀' : '감사 전하기 🎉') : '다음 단계'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendModal;
