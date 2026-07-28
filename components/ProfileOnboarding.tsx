import React, { useState } from 'react';
import { Profile } from '../types';
import { api } from '../lib/api';
import { User, Building2, Briefcase, Mail, CheckCircle2, Loader2, Sparkles, LogOut } from 'lucide-react';

interface ProfileOnboardingProps {
  user: Profile;
  onProfileUpdated: () => Promise<void>;
  onLogout: () => void;
}

export const ProfileOnboarding: React.FC<ProfileOnboardingProps> = ({ user, onProfileUpdated, onLogout }) => {
  const userEmail = user.email || (user as any).authEmail || '';
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
    const trimmedPosition = position.trim();

    if (!trimmedName) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (!trimmedDept) {
      setError('팀(부서명)을 입력해주세요.');
      return;
    }
    if (!trimmedPosition) {
      setError('직급을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const success = await api.updateUserProfile(user.id, {
        name: trimmedName,
        department: trimmedDept,
        position: trimmedPosition,
        email: userEmail
      });

      if (success) {
        await onProfileUpdated();
      } else {
        setError('프로필 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    } catch (err: any) {
      setError('오류 발생: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4 md:p-6 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl border-2 border-slate-900 shadow-brutal-black p-6 md:p-10 relative z-10 animate-scale-in">
        
        {/* Header Badge */}
        <div className="flex justify-between items-start mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border-2 border-slate-900 text-[#00C73C] font-extrabold text-xs shadow-[2px_2px_0px_0px_#0f172a]">
            <Sparkles size={14} className="text-[#00C73C]" />
            <span>최초 로그인 온보딩</span>
          </div>
          
          <button 
            type="button" 
            onClick={onLogout}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors"
            title="로그아웃"
          >
            <LogOut size={14} />
            <span>로그아웃</span>
          </button>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            사내 프로필 입력 ✏️
          </h1>
          <p className="text-slate-500 font-bold text-xs md:text-sm mt-2 leading-relaxed">
            네이버 웍스 SSO 인증이 완료되었습니다.<br />
            원활한 서비스 이용을 위해 사내 기본 정보를 입력해 주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border-2 border-slate-900 rounded-2xl text-xs font-bold text-[#E63946] shadow-[2px_2px_0px_0px_#0f172a]">
              ⚠️ {error}
            </div>
          )}

          {/* Email (Read-Only) */}
          <div>
            <label className="block text-[11px] font-black text-slate-500 tracking-wider uppercase mb-1.5 ml-1 flex items-center gap-1.5">
              <Mail size={13} className="text-slate-400" />
              <span>사내 이메일 (수정 불가)</span>
            </label>
            <input 
              type="text" 
              value={userEmail || 'sso_user@ceragem.com'} 
              disabled 
              className="w-full p-3.5 bg-slate-100 border-2 border-slate-300 rounded-2xl text-slate-500 font-bold text-sm cursor-not-allowed select-none"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-[11px] font-black text-slate-800 tracking-wider uppercase mb-1.5 ml-1 flex items-center gap-1.5">
              <User size={13} className="text-[#E63946]" />
              <span>이름</span>
              <span className="text-[#E63946]">*</span>
            </label>
            <input 
              type="text" 
              required
              placeholder="예: 홍길동"
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full p-3.5 bg-slate-50 focus:bg-white border-2 border-slate-900 rounded-2xl focus:outline-none transition-all text-slate-900 font-bold text-sm shadow-[2px_2px_0px_0px_rgba(15,23,42,0.15)] focus:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            />
          </div>

          {/* Team / Department */}
          <div>
            <label className="block text-[11px] font-black text-slate-800 tracking-wider uppercase mb-1.5 ml-1 flex items-center gap-1.5">
              <Building2 size={13} className="text-[#E63946]" />
              <span>팀 (부서명)</span>
              <span className="text-[#E63946]">*</span>
            </label>
            <input 
              type="text" 
              required
              placeholder="세라제머육성팀"
              value={department} 
              onChange={e => setDepartment(e.target.value)}
              className="w-full p-3.5 bg-slate-50 focus:bg-white border-2 border-slate-900 rounded-2xl focus:outline-none transition-all text-slate-900 font-bold text-sm shadow-[2px_2px_0px_0px_rgba(15,23,42,0.15)] focus:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            />
            <p className="text-[11px] font-bold text-slate-400 mt-1.5 ml-1 flex items-center gap-1">
              <span>💡</span>
              <span>사내 공식 팀명으로 입력해주세요</span>
            </p>
          </div>

          {/* Position */}
          <div>
            <label className="block text-[11px] font-black text-slate-800 tracking-wider uppercase mb-1.5 ml-1 flex items-center gap-1.5">
              <Briefcase size={13} className="text-[#E63946]" />
              <span>직급</span>
              <span className="text-[#E63946]">*</span>
            </label>
            <input 
              type="text" 
              required
              placeholder="예: 매니저, 팀장, 실장"
              value={position} 
              onChange={e => setPosition(e.target.value)}
              className="w-full p-3.5 bg-slate-50 focus:bg-white border-2 border-slate-900 rounded-2xl focus:outline-none transition-all text-slate-900 font-bold text-sm shadow-[2px_2px_0px_0px_rgba(15,23,42,0.15)] focus:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 mt-6 bg-[#00C73C] hover:bg-[#00b335] text-white border-2 border-slate-900 font-black rounded-2xl transition-all flex justify-center items-center gap-2 shadow-brutal-black text-base hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-0 active:translate-y-0"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>프로필 저장 및 시작하기</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileOnboarding;
