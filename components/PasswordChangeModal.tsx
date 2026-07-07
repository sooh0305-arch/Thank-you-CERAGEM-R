import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';
import { api } from '../lib/api';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose, userId }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    setIsSubmitting(true);
    const success = await api.changePassword(userId, newPassword);
    setIsSubmitting(false);
    if (success) {
      alert("비밀번호가 성공적으로 변경되었습니다.");
      onClose();
      setNewPassword('');
      setConfirmPassword('');
    } else {
      alert("비밀번호 변경 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF9F6] rounded-3xl border-2 border-slate-900 shadow-brutal-black w-full max-w-md p-8 space-y-6 transform animate-scale-in">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Lock size={20} className="text-[#E63946] stroke-[2.5px]" />
            <span>비밀번호 변경</span>
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full border border-slate-200 text-slate-500 transition-colors">
            <X size={20} className="stroke-[2.5px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">새 비밀번호 입력</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full p-4 bg-white border-2 border-slate-900 rounded-xl focus:bg-yellow-50 focus:outline-none font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">새 비밀번호 확인</label>
             <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full p-4 bg-white border-2 border-slate-900 rounded-xl focus:bg-yellow-50 focus:outline-none font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-[#E63946] text-white border-2 border-slate-900 font-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all disabled:opacity-50 mt-6"
          >
            {isSubmitting ? '수정 중... 🚀' : '비밀번호 변경 완료 ⚡'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
