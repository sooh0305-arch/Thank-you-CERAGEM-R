import React, { useState } from 'react';
import { Profile } from '../types';
import { api } from '../lib/api';
import { X, User, Building2, Briefcase, Mail, Check, Loader2 } from 'lucide-react';

interface ProfileEditModalProps {
  user: Profile;
  onClose: () => void;
  onProfileUpdated: () => Promise<void>;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ user, onClose, onProfileUpdated }) => {
  const [name, setName] = useState(user.name || '');
  const [department, setDepartment] = useState(user.department || '');
  const [position, setPosition] = useState(user.position || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedDept = department.trim();
    const trimmedPos = position.trim();

    if (!trimmedName) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (!trimmedDept) {
      setError('팀(부서명)을 입력해주세요.');
      return;
    }
    if (!trimmedPos) {
      setError('직급을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const success = await api.updateUserProfile(user.id, {
        name: trimmedName,
        department: trimmedDept,
        position: trimmedPos,
      });

      if (success) {
        await onProfileUpdated();
        alert('프로필 정보가 수정되었습니다.');
        onClose();
      } else {
        setError('프로필 수정 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setError('오류: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-brutal-black w-full max-w-md p-6 md:p-8 space-y-6 transform animate-scale-in">
        <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">내 프로필 수정</h3>
              <p className="text-xs text-slate-400 font-bold">이름, 팀, 직급 정보 수정</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border-2 border-slate-900 rounded-xl text-xs font-bold text-[#E63946]">
              ⚠️ {error}
            </div>
          )}

          {/* Email (Read only) */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1">
              <Mail size={12} /> 사내 이메일
            </label>
            <input 
              type="text" 
              value={user.email || '사내 인증 계정'} 
              disabled 
              className="w-full p-3 bg-slate-100 border-2 border-slate-200 rounded-xl text-slate-400 font-bold text-xs cursor-not-allowed select-none"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1">
              <User size={12} className="text-[#E63946]" /> 이름 <span className="text-[#E63946]">*</span>
            </label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-3 bg-slate-50 focus:bg-white border-2 border-slate-900 rounded-xl focus:outline-none transition-all font-bold text-sm text-slate-900"
            />
          </div>

          {/* Department / Team */}
          <div>
            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1">
              <Building2 size={12} className="text-[#E63946]" /> 팀 (부서명) <span className="text-[#E63946]">*</span>
            </label>
            <input 
              type="text" 
              required
              placeholder="세라제머육성팀"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full p-3 bg-slate-50 focus:bg-white border-2 border-slate-900 rounded-xl focus:outline-none transition-all font-bold text-sm text-slate-900"
            />
            <p className="text-[10px] font-bold text-slate-400 mt-1 ml-1">
              사내 공식 팀명으로 입력해주세요
            </p>
          </div>

          {/* Position */}
          <div>
            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1">
              <Briefcase size={12} className="text-[#E63946]" /> 직급 <span className="text-[#E63946]">*</span>
            </label>
            <input 
              type="text" 
              required
              placeholder="예: 매니저, 팀장, 실장"
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="w-full p-3 bg-slate-50 focus:bg-white border-2 border-slate-900 rounded-xl focus:outline-none transition-all font-bold text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition-colors"
            >
              취소
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-3 bg-[#E63946] hover:bg-[#d52b38] text-white font-black rounded-xl text-xs transition-all border-2 border-slate-900 shadow-brutal-black flex justify-center items-center gap-1.5"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> 저장하기</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;
