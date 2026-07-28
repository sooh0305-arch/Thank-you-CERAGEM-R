import React, { useState, useEffect } from 'react';
import { ArrowRight, Loader, Heart, ThumbsUp, MessageSquare, Sparkles } from 'lucide-react';
import { api, initialEmployees } from '../lib/api';
import { signInWithPopup, signInWithRedirect, getRedirectResult, SAMLAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface LandingPageProps {
  onLogin?: (email: string, pass: string) => Promise<string | null>;
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

// Naver Works Icon matching the official branding perfectly and optimized for tiny sizes (no text/margins)
const NaverWorksIcon: React.FC = () => (
  <svg viewBox="0 0 120 100" className="w-5 h-5 mr-2 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision">
    <defs>
      <linearGradient id="nw-green-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00E365" />
        <stop offset="100%" stopColor="#00C45B" />
      </linearGradient>
      <linearGradient id="nw-purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6058F8" />
        <stop offset="100%" stopColor="#1C68FF" />
      </linearGradient>
      <linearGradient id="nw-arch-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#18C5FF" />
        <stop offset="100%" stopColor="#0082FF" />
      </linearGradient>
    </defs>
    
    {/* Entire group skewed at -11.5 degrees, centered with padding to prevent any clipping */}
    <g transform="translate(60, 50) skewX(-11.5) translate(-60, -50)">
      {/* 1. Right Pillar (at the bottom to allow weaving illusion) */}
      <rect x="76" y="12" width="20" height="76" rx="10" fill="url(#nw-purple-grad)" />
      
      {/* 2. Middle Arch (drawn over the right pillar and under the left pillar to create weaving effect) */}
      <path
        d="M 34 68 C 34 34, 86 34, 86 68"
        stroke="url(#nw-arch-grad)"
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* 3. Left Pillar (at the top layer of the arch) */}
      <rect x="24" y="12" width="20" height="76" rx="10" fill="url(#nw-green-grad)" />
    </g>
  </svg>
);

const ssoEmployees = [
  { name: "이동현", email: "sooh@ceragem.com", dept: "세라제머육성팀", password: "educeragem01" },
  { name: "조진국", email: "jkcho@ceragem.com", dept: "세라제머육성팀", password: "000000" },
  { name: "김우진", email: "kwoozin123@ceragem.com", dept: "세라제머육성팀", password: "000000" },
  { name: "백승휘", email: "shbaik@ceragem.com", dept: "세라제머육성팀", password: "000000" },
  { name: "손화연", email: "hy0000@ceragem.com", dept: "세라제머육성팀", password: "000000" },
  { name: "김은성", email: "eskim@ceragem.com", dept: "세라제머HR실", password: "000000" },
  { name: "곽승훈", email: "sh3257@ceragem.com", dept: "세라제머인사팀", password: "000000" },
  { name: "김소영", email: "sykim@ceragem.com", dept: "세라제머육성팀", password: "000000" }
];

const LandingPage: React.FC<LandingPageProps> = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Handle SAML Redirect Login Result if redirected back via Firebase
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          if (!user.email || !user.email.toLowerCase().endsWith('@ceragem.com')) {
            alert("세라젬 임직원 계정(@ceragem.com)만 로그인 가능합니다.");
            await signOut(auth);
            setError("세라젬 임직원 계정이 아닙니다.");
            return;
          }
          await api.ensureProfileExists(user.uid, user.email, user.displayName);
        }
      } catch (e: any) {
        console.error("SAML Redirect Login Error:", e);
        setError(`네이버웍스 SAML 로그인 실패: ${e?.message || e}`);
      }
    };

    checkRedirectResult();
  }, []);

  // Direct page redirect to /auth/login for Naver Works SSO (No popup)
  const handleNaverWorksLogin = () => {
    setError(null);
    window.location.href = '/auth/login';
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
            <span className="font-black text-xs tracking-wider">THANK YOU! 💌</span>
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
              <div className="bg-slate-900 text-[#FAF9F6] border-2 border-slate-900 px-6 py-2.5 rounded-full transform -rotate-2 hover:rotate-0 transition-transform duration-300 font-black text-xs md:text-sm tracking-wider">
                🤝 칭찬으로 만드는 건강한 조직문화
              </div>
            </div>

            {/* Giant Bold Typography Section */}
            <div className="flex flex-col items-center justify-center select-none text-center transform -translate-y-4">
              <h1 className="text-[13vw] md:text-[7.5rem] lg:text-[9rem] font-black leading-none tracking-tight flex flex-col items-center gap-0">
                <span 
                  className="block transform hover:scale-105 hover:rotate-1 transition-transform duration-300 cursor-default select-none text-white font-extrabold"
                  style={{ 
                    WebkitTextStroke: '8px #0f172a',
                    paintOrder: 'stroke fill'
                  }}
                >
                  Thank you
                </span>
                <span 
                  className="block text-yellow-300 transform -rotate-3 hover:rotate-0 transition-transform duration-300 cursor-default select-none -mt-1 md:-mt-3 font-extrabold"
                  style={{ 
                    WebkitTextStroke: '8px #0f172a',
                    paintOrder: 'stroke fill'
                  }}
                >
                  CERAGEM
                </span>
              </h1>
            </div>

            {/* Bottom Call to Action */}
            <div className="absolute bottom-[13%] md:bottom-[15%] pointer-events-auto">
              <button 
                onClick={handleNaverWorksLogin} 
                className="group relative flex items-center justify-center px-12 py-6 md:px-20 md:py-7 bg-slate-900 text-[#FAF9F6] rounded-2xl border-2 border-slate-900 shadow-brutal-brand hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_#E63946] active:translate-x-[0px] active:translate-y-[0px] active:shadow-brutal-brand transition-all duration-300 gap-3"
              >
                <NaverWorksIcon />
                <span className="text-base md:text-xl font-black tracking-wide">네이버 웍스로 시작하기</span>
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-yellow-300 group-hover:translate-x-1.5 transition-transform duration-300 ml-1" />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-[90%] md:w-full max-w-sm py-10 px-8 md:py-12 md:px-9 bg-white rounded-2xl border-2 border-slate-900 shadow-brutal-black transform transition-all animate-scale-in relative z-50 pointer-events-auto text-center">
             
             {/* Login Header */}
             <div className="text-center mb-6 flex flex-col items-center">
               <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-white border-2 border-slate-900 shadow-brutal-black mb-4">
                 <NaverWorksIcon />
               </div>
               <h2 className="text-xl font-black text-slate-800 tracking-tight">네이버 웍스 SSO 로그인</h2>
               <p className="text-slate-400 font-bold text-xs mt-1.5">세라젬 사내 계정(@ceragem.com)으로 계속하기</p>
             </div>

              {error && (
                <div className="p-3.5 mb-5 bg-rose-50 text-[#E63946] text-xs rounded-xl text-left border-2 border-slate-900 font-bold shadow-[2px_2px_0px_0px_#0f172a] whitespace-pre-line leading-relaxed">
                  ⚠️ {error}
                </div>
              )}

              {/* Large Central Naver Works SSO Button */}
              <button 
                type="button"
                onClick={handleNaverWorksLogin}
                className="w-full py-4 px-6 bg-[#00C73C] hover:bg-[#00b335] text-white border-2 border-slate-900 font-black rounded-2xl transition-all flex justify-center items-center gap-3 shadow-brutal-black text-base my-2 hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-0 active:translate-y-0"
              >
                <NaverWorksIcon />
                <span>네이버 웍스로 시작하기</span>
              </button>

              <div className="border-t-2 border-slate-900 my-6" />

              <button 
                onClick={() => setShowLogin(false)} 
                className="w-full text-xs text-slate-400 hover:text-[#E63946] transition-colors font-black uppercase tracking-widest text-center"
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
