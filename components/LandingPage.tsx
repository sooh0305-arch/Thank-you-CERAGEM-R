import React, { useState, useEffect } from 'react';
import { ArrowRight, Loader, Heart, ThumbsUp, MessageSquare, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

interface LandingPageProps {
  onLogin: (email: string, pass: string) => Promise<string | null>;
}

// Interactive floating stickers that pop when hovered and reappear shortly
const InteractiveSticker = ({ 
  children, 
  className,
  delay = 0
}: { 
  children: React.ReactNode; 
  className: string;
  delay?: number;
}) => {
  const [isPopped, setIsPopped] = useState(false);

  useEffect(() => {
    if (isPopped) {
      const timer = setTimeout(() => setIsPopped(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isPopped]);

  return (
    <div 
      className={`absolute ${className} transition-all duration-300 cursor-pointer pointer-events-auto select-none`}
      style={{ animationDelay: `${delay}s` }}
      onMouseEnter={() => setIsPopped(true)}
    >
      <div className={`transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${isPopped ? 'scale-150 rotate-12 opacity-0' : 'scale-100 rotate-0 opacity-100 hover:scale-110'}`}>
        {children}
      </div>
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / 40;
      const y = (e.clientY - window.innerHeight / 2) / 40;
      setMousePosition({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await onLogin(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const emailInput = window.prompt("비밀번호 재설정 링크를 받을 이메일 주소를 입력해주세요.");
    if (!emailInput) return;
    
    setLoading(true);
    const result = await api.sendPasswordReset(emailInput);
    setLoading(false);
    alert(result.message);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#FAF9F6] font-sans selection:bg-[#E63946] selection:text-white">
      {/* Background Graphic Blocks: Slanted vivid blocky panels */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Giant coral red slanted block */}
        <div 
          className="absolute -top-[30%] -left-[10%] w-[120%] h-[75%] bg-[#E63946] -rotate-6 transform origin-top-left transition-transform duration-300 ease-out"
          style={{ transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px) rotate(-6deg)` }}
        />
        {/* Vivid bright pink/orange accent block */}
        <div 
          className="absolute bottom-[-10%] -right-[5%] w-[60%] h-[45%] bg-[#fda4af] rotate-12 transform origin-bottom-right transition-transform duration-300 ease-out border-t-4 border-slate-900 shadow-brutal-black"
          style={{ transform: `translate(${mousePosition.x * -0.3}px, ${mousePosition.y * -0.3}px) rotate(12deg)` }}
        />
        {/* Subtle grid lines background for extra energy brand feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:30px_30px] opacity-70 pointer-events-none" />
      </div>

      {/* Floating Interactive Stickers Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        
        {/* sticker 1: Heart (Coral Red) */}
        <InteractiveSticker className="top-[18%] left-[8%] animate-float-slow" delay={0}>
          <div className="bg-[#E63946] text-white p-4 rounded-2xl border-2 border-slate-900 shadow-brutal-black flex items-center gap-2">
            <Heart className="w-6 h-6 fill-white" />
            <span className="font-black text-xs tracking-wider">KUDOS!</span>
          </div>
        </InteractiveSticker>

        {/* sticker 2: Thumbs Up (Blue) */}
        <InteractiveSticker className="bottom-[20%] left-[12%] animate-float-slow-reverse" delay={1}>
          <div className="bg-blue-400 text-slate-900 p-4 rounded-2xl border-2 border-slate-900 shadow-brutal-black flex items-center gap-2">
            <ThumbsUp className="w-6 h-6 fill-slate-900" />
            <span className="font-black text-xs tracking-wider">GREAT JOB!</span>
          </div>
        </InteractiveSticker>

        {/* sticker 3: Praise bubble 1 */}
        <InteractiveSticker className="top-[45%] right-[8%] animate-float-slow" delay={1.5}>
          <div className="bg-yellow-300 text-slate-900 px-5 py-3 rounded-3xl border-2 border-slate-900 shadow-brutal-black flex items-center gap-2 -rotate-3">
            <MessageSquare className="w-5 h-5 fill-slate-900" />
            <span className="font-black text-xs tracking-wider">YOU ROCK! ⚡</span>
          </div>
        </InteractiveSticker>

        {/* sticker 4: Praise bubble 2 */}
        <InteractiveSticker className="top-[12%] right-[22%] animate-float-slow-reverse" delay={2}>
          <div className="bg-purple-300 text-slate-900 px-5 py-3 rounded-3xl border-2 border-slate-900 shadow-brutal-black flex items-center gap-2 rotate-6">
            <Sparkles className="w-5 h-5" />
            <span className="font-black text-xs tracking-wider">고마워요! 💖</span>
          </div>
        </InteractiveSticker>

        {/* sticker 5: Small decorative hearts/star vector stickers */}
        <InteractiveSticker className="bottom-[45%] left-[20%] animate-float-slow" delay={0.5}>
          <div className="w-12 h-12 rounded-full bg-green-400 border-2 border-slate-900 shadow-brutal-black flex items-center justify-center">
            <span className="text-xl">👍</span>
          </div>
        </InteractiveSticker>

        <InteractiveSticker className="bottom-[15%] right-[35%] animate-float-slow-reverse" delay={2.5}>
          <div className="w-12 h-12 rounded-full bg-[#E63946] border-2 border-slate-900 shadow-brutal-black flex items-center justify-center text-white">
            <span className="text-xl">❤️</span>
          </div>
        </InteractiveSticker>
      </div>

      {/* Main UI Layout */}
      <div className="relative z-20 w-full h-full flex flex-col items-center justify-center pointer-events-none">
        {!showLogin ? (
          <div className="relative w-full max-w-7xl mx-auto h-full flex flex-col items-center justify-center px-4">
            
            {/* Top Display Banner */}
            <div className="absolute top-[12%] md:top-[15%] pointer-events-auto">
              <div className="bg-slate-900 text-[#FAF9F6] border-2 border-slate-900 px-6 py-2.5 rounded-full shadow-brutal-black transform -rotate-2 hover:rotate-0 transition-transform duration-300 font-black text-xs md:text-sm tracking-[0.25em] uppercase">
                🎉 THANK YOU, CERAGEM!
              </div>
            </div>

            {/* Giant Bold Typography Section - Text outline style added for extra punchy visibility */}
            <div className="flex flex-col items-center justify-center select-none text-center transform -translate-y-4">
              <h1 className="text-[10vw] md:text-[6rem] font-black leading-none tracking-tight flex flex-col items-center gap-0">
                <span 
                  className="block transform hover:scale-105 hover:rotate-1 transition-transform duration-300 cursor-default select-none text-[#FAF9F6] text-shadow-brutal"
                  style={{ textShadow: '0 4px 0 #0f172a, 4px 4px 0 #0f172a, -4px -4px 0 #0f172a, 4px -4px 0 #0f172a, -4px 4px 0 #0f172a, 0 -4px 0 #0f172a, 4px 0 0 #0f172a, -4px 0 0 #0f172a, 0 10px 15px rgba(0,0,0,0.3)' }}
                >
                  Thank you
                </span>
                <span 
                  className="block text-yellow-300 transform -rotate-3 hover:rotate-0 transition-transform duration-300 cursor-default select-none -mt-2 md:-mt-4 text-shadow-brutal"
                  style={{ textShadow: '0 4px 0 #0f172a, 4px 4px 0 #0f172a, -4px -4px 0 #0f172a, 4px -4px 0 #0f172a, -4px 4px 0 #0f172a, 0 -4px 0 #0f172a, 4px 0 0 #0f172a, -4px 0 0 #0f172a, 0 10px 15px rgba(0,0,0,0.3)' }}
                >
                  CERAGEM
                </span>
              </h1>
            </div>

            {/* Bottom Call to Action */}
            <div className="absolute bottom-[15%] pointer-events-auto">
              <button 
                onClick={() => setShowLogin(true)} 
                className="group relative flex items-center justify-center px-14 py-6 bg-slate-900 text-[#FAF9F6] rounded-2xl border-2 border-slate-900 shadow-brutal-brand hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_#E63946] active:translate-x-[0px] active:translate-y-[0px] active:shadow-brutal-brand transition-all duration-300"
              >
                <span className="text-base font-black tracking-[0.2em] mr-3">시작하기</span>
                <ArrowRight className="w-5 h-5 text-yellow-300 group-hover:translate-x-1.5 transition-transform duration-300" />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-[90%] md:w-full max-w-sm p-8 md:p-9 bg-white rounded-2xl border-2 border-slate-900 shadow-brutal-black transform transition-all animate-scale-in relative z-50 pointer-events-auto">
             
             {/* Login Header */}
             <div className="text-center mb-6 relative">
               <div className="absolute -top-[3.75rem] left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl bg-[#E63946] flex items-center justify-center text-white border-2 border-slate-900 shadow-brutal-black">
                 <Sparkles className="w-6 h-6" />
               </div>
               <h2 className="text-xl font-black text-slate-800 tracking-tight mt-6">로그인</h2>
               <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-1">Ready to Thank you CERAGEM?</p>
             </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-50 text-[#E63946] text-xs rounded-xl text-center border-2 border-slate-900 font-bold shadow-[2px_2px_0px_0px_#0f172a]">
                    ⚠️ {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 tracking-wider uppercase mb-1.5 ml-1">사내 이메일</label>
                  <input 
                    type="email" 
                    placeholder="yourname@ceragem.com" 
                    className="w-full p-3.5 bg-slate-50 focus:bg-white border-2 border-slate-900 rounded-xl focus:outline-none transition-all text-slate-800 font-bold text-sm shadow-[2px_2px_0px_0px_rgba(15,23,42,0.15)] focus:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 tracking-wider uppercase mb-1.5 ml-1">비밀번호</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full p-3.5 bg-slate-50 focus:bg-white border-2 border-slate-900 rounded-xl focus:outline-none transition-all text-slate-800 font-bold text-sm shadow-[2px_2px_0px_0px_rgba(15,23,42,0.15)] focus:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-3.5 bg-[#E63946] hover:bg-[#d52b38] text-white border-2 border-slate-900 font-black rounded-xl transition-all flex justify-center items-center shadow-brutal-black text-sm mt-6"
                >
                  {loading ? <Loader className="animate-spin text-white w-4 h-4" /> : '로그인 🚀'}
                </button>

                <button 
                  type="button" 
                  onClick={handleForgotPassword} 
                  className="block mx-auto text-[11px] text-[#E63946] hover:underline font-bold transition-colors"
                >
                  비밀번호를 잊으셨나요?
                </button>
              </form>
              
              <div className="border-t-2 border-slate-900 my-5" />

              <button 
                onClick={() => setShowLogin(false)} 
                className="w-full text-[10px] text-slate-400 hover:text-[#E63946] transition-colors font-black uppercase tracking-widest text-center"
              >
                뒤로가기
              </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
