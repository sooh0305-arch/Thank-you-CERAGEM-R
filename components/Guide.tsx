import React from 'react';
import { HelpCircle, Coins, Heart, Gift, ArrowDown, Star, Trophy, CheckCircle, AlertCircle, Sparkles, Wallet, Landmark } from 'lucide-react';

const Guide: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-16">
      {/* Header Section */}
      <div className="text-center space-y-5">
        <div className="inline-flex items-center gap-2.5 bg-[#E63946]/5 px-6 py-2.5 rounded-full border border-[#E63946]/15">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Thank you CERAGEM 가이드북</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tight leading-tight">
          How to <span className="text-[#E63946] italic">Thank you CERAGEM!</span>
        </h1>
        <p className="text-slate-500 font-medium text-base md:text-lg max-w-none leading-relaxed">
          동료에게 감사와 칭찬의 마음을 기쁘게 전하세요! 플랫폼의 포인트 이용 정책과 모바일 기프티콘 구매 방식을 소개합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. Point Policy */}
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col h-full hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="p-3 bg-[#E63946]/5 rounded-xl text-[#E63946]">
              <HelpCircle size={24} />
            </div>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-800">포인트 이용 규칙</h2>
          </div>

          <div className="space-y-6 flex-1">
            <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-100">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-[#E63946] shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1.5">보내는 예산 ≠ 받는 포인트</h4>
                  <p className="text-xs md:text-[13px] text-slate-600 leading-relaxed font-semibold">
                    매달 자동 충전되는 <span className="text-[#E63946] font-extrabold">보내는 예산(Giving)</span>은 동료 선물 전용이며, 기프티콘 구매 신청은 동료들에게 <span className="text-[#E63946] font-extrabold">받은 포인트</span>로만 가능합니다!
                  </p>
                </div>
              </div>
            </div>

            <ul className="space-y-4.5">
              <li className="flex gap-3">
                <CheckCircle size={18} className="text-[#E63946] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm md:text-base font-bold text-slate-800">매월 1일 10,000P 리셋 충전</p>
                  <p className="text-xs md:text-sm text-slate-400 font-medium mt-1 leading-relaxed">동료들을 칭찬하고 응원하기 위해 채워지는 칭찬 전용 예산입니다.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <CheckCircle size={18} className="text-[#E63946] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm md:text-base font-bold text-slate-800">미사용분 소멸 정책</p>
                  <p className="text-xs md:text-sm text-slate-400 font-medium mt-1 leading-relaxed">매 회차 미사용 Giving 포인트는 리셋 시점 소멸됩니다. 아낌없이 듬뿍 전하세요!</p>
                </div>
              </li>
              <li className="flex gap-3">
                <CheckCircle size={18} className="text-[#E63946] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm md:text-base font-bold text-slate-800">1회 발송: 100P ~ 1,000P 제한</p>
                  <p className="text-xs md:text-sm text-slate-400 font-medium mt-1 leading-relaxed">전송하고 싶은 기여나 마음의 깊이에 맞춰 100P에서 1,000P까지 설정하세요.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <CheckCircle size={18} className="text-[#E63946] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm md:text-base font-bold text-slate-800">동일 동료 회차당 2회 제한</p>
                  <p className="text-xs md:text-sm text-slate-400 font-medium mt-1 leading-relaxed">다양한 전사 동료들과 고루 소통하기 위해 동일인 제한을 적용합니다.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* 2. How to Praise */}
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col h-full hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Sparkles size={24} />
            </div>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-800">칭찬하는 방법</h2>
          </div>

          <div className="space-y-5 flex-1">
            {[
              { step: 1, text: "칭찬할 세라제머 동료 찾기" },
              { step: 2, text: "부합하는 세라제머십 핵심가치 선택" },
              { step: 3, text: "진심 어린 카드 메시지 작성 (50자 이상)" },
            ].map((item, idx) => (
              <React.Fragment key={item.step}>
                <div className="bg-slate-50 border border-slate-150 p-4.5 rounded-xl flex items-center gap-3.5">
                  <span className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center text-xs font-black text-slate-800 shrink-0">
                    {item.step}
                  </span>
                  <span className="text-xs md:text-sm font-bold text-slate-700 leading-relaxed">{item.text}</span>
                </div>
                {idx < 2 && (
                  <div className="flex justify-center text-slate-300">
                    <ArrowDown size={16} />
                  </div>
                )}
              </React.Fragment>
            ))}
            <div className="flex justify-center text-slate-300">
              <ArrowDown size={16} />
            </div>
            <div className="bg-[#E63946] p-5 rounded-xl flex items-center gap-3.5 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-amber-300 flex items-center justify-center text-slate-800 shrink-0">
                <Star size={13} className="fill-slate-800 text-none" />
              </div>
              <span className="text-xs md:text-sm font-bold text-white tracking-wide leading-relaxed">칭찬과 함께 기분 좋은 포인트 발송! 🚀</span>
            </div>
          </div>
        </div>

        {/* 3. Rewards */}
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col h-full hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Star size={24} />
            </div>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-800">기프티콘 및 혜택</h2>
          </div>

          <div className="space-y-6 flex-1">
            {/* Track 1 */}
            <div className="space-y-2.5">
              <p className="text-[10px] md:text-xs font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-md inline-block">BENEFIT 1</p>
              <div className="p-5 bg-purple-50/30 rounded-xl border border-purple-100 text-center">
                <h4 className="font-bold text-purple-700 text-sm md:text-base mb-2 flex items-center justify-center gap-1.5">
                  기프티콘 상점 서비스
                </h4>
                <p className="text-xs md:text-[13px] text-slate-500 mb-3 font-medium leading-relaxed">
                  받은 포인트는 기프티콘 상점에서 네이버페이 포인트 쿠폰 및 CU 모바일 금액권으로 교환 신청이 가능하며, <strong className="text-purple-700 font-extrabold">기프티콘 발송은 매월 마지막일에 발송됩니다.</strong> (최소 1,000P부터 신청 가능!)
                </p>
                <div className="h-px w-8 bg-purple-100 mx-auto my-2.5" />
                <p className="text-xs md:text-sm text-[#E63946] font-bold flex items-center justify-center gap-1">
                  나만의 진정한 가치 보상을 만나세요!
                </p>
              </div>
            </div>

            {/* Track 2 */}
            <div className="space-y-2.5">
              <p className="text-[10px] md:text-xs font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-md inline-block">BENEFIT 2</p>
              <div className="p-5 bg-slate-900 rounded-xl text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Trophy size={48} className="text-white" />
                </div>
                <h4 className="font-bold text-amber-300 text-sm md:text-base mb-2 flex items-center justify-center gap-1.5">
                  <Trophy size={14} /> 분기별 우수 세라제머 시상
                </h4>
                <p className="text-xs md:text-[13px] text-slate-400 mb-3.5 font-medium leading-relaxed">
                  가장 많은 칭찬 카드를 받고 건강한 소통 문화를 이끌어 준 동료를 분기마다 2명 선정하여 특별 보상과 시상을 진행합니다.
                </p>
                <div className="inline-flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded border border-slate-700">
                  <Star size={10} className="text-amber-300 fill-amber-300" />
                  <span className="text-[10px] md:text-xs font-bold text-white">최종 랭킹 특별 보상</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-8 border-t border-slate-100">
        <p className="text-sm md:text-base font-bold text-slate-400 tracking-wider">
          서로를 아끼고 인정하는 생동감 넘치는 일터, <span className="text-[#E63946] font-bold underline">Thank you CERAGEM</span>이 함께 만들어갑니다.
        </p>
      </div>
    </div>
  );
};

export default Guide;
