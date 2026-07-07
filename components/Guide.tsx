import React from 'react';
import { HelpCircle, Coins, Heart, Gift, ArrowDown, Star, Trophy, CheckCircle, AlertCircle, Sparkles, Wallet, Landmark } from 'lucide-react';

const Guide: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-16">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-[#E63946]/5 px-4 py-2 rounded-full border border-[#E63946]/15">
          <Heart size={14} className="text-[#E63946] fill-[#E63946]" />
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Thank you CERAGEM 가이드북 📖</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-slate-800 tracking-tight leading-tight">
          How to <span className="text-[#E63946] italic">Thank you CERAGEM!</span>
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          동료에게 감사와 칭찬의 마음을 기쁘게 전하세요! 플랫폼의 포인트 이용 정책과 다양한 환급 혜택을 소개합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Point Policy */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-full hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-[#E63946]/5 rounded-xl text-[#E63946]">
              <Coins size={20} />
            </div>
            <h2 className="text-base font-bold text-slate-800">포인트 이용 규칙</h2>
          </div>

          <div className="space-y-5 flex-1">
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="text-[#E63946] shrink-0 mt-0.5" size={16} />
                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1">보내는 예산 ≠ 받는 포인트</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    매달 자동 충전되는 <span className="text-[#E63946] font-bold">보내는 예산(Giving)</span>은 동료 선물 전용이며, 현금 출금 신청은 동료들에게 <span className="text-[#E63946] font-bold">받은 포인트</span>로만 가능합니다!
                  </p>
                </div>
              </div>
            </div>

            <ul className="space-y-3.5">
              <li className="flex gap-2.5">
                <CheckCircle size={15} className="text-[#E63946] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-800">매월 1일 10,000P 리셋 충전</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">동료들을 칭찬하고 응원하기 위해 채워지는 칭찬 전용 예산입니다.</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <CheckCircle size={15} className="text-[#E63946] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-800">미사용분 소멸 정책</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">매 회차 미사용 Giving 포인트는 리셋 시점 소멸됩니다. 아낌없이 듬뿍 전하세요!</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <CheckCircle size={15} className="text-[#E63946] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-800">1회 발송: 100P ~ 1,000P 제한</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">전송하고 싶은 기여나 마음의 깊이에 맞춰 100P에서 1,000P까지 설정하세요.</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <CheckCircle size={15} className="text-[#E63946] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-800">동일 동료 회차당 2회 제한</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">다양한 전사 동료들과 고루 소통하기 위해 동일인 제한을 적용합니다.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* 2. How to Praise */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-full hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Heart size={20} />
            </div>
            <h2 className="text-base font-bold text-slate-800">칭찬하는 방법</h2>
          </div>

          <div className="space-y-4 flex-1">
            {[
              { step: 1, text: "칭찬할 세라제머 동료 찾기" },
              { step: 2, text: "부합하는 세라제머십 핵심가치 선택" },
              { step: 3, text: "진심 어린 카드 메시지 작성 (50자 이상)" },
            ].map((item, idx) => (
              <React.Fragment key={item.step}>
                <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-amber-400 flex items-center justify-center text-[10px] font-bold text-slate-800">
                    {item.step}
                  </span>
                  <span className="text-xs font-bold text-slate-700">{item.text}</span>
                </div>
                {idx < 2 && (
                  <div className="flex justify-center text-slate-300">
                    <ArrowDown size={14} />
                  </div>
                )}
              </React.Fragment>
            ))}
            <div className="flex justify-center text-slate-300">
              <ArrowDown size={14} />
            </div>
            <div className="bg-[#E63946] p-4 rounded-xl flex items-center gap-3 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-amber-300 flex items-center justify-center text-slate-800 shrink-0">
                <Star size={11} className="fill-slate-800 text-none" />
              </div>
              <span className="text-xs font-bold text-white tracking-wide">칭찬과 함께 기분 좋은 포인트 발송! 🚀</span>
            </div>
          </div>
        </div>

        {/* 3. Rewards */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-full hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <Gift size={20} />
            </div>
            <h2 className="text-base font-bold text-slate-800">환급 및 리워드 혜택</h2>
          </div>

          <div className="space-y-5 flex-1">
            {/* Track 1 */}
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-md inline-block">BENEFIT 1</p>
              <div className="p-4 bg-purple-50/30 rounded-xl border border-purple-100 text-center">
                <h4 className="font-bold text-slate-800 text-xs mb-1 flex items-center justify-center gap-1.5 text-purple-700">
                  <Wallet size={13} /> 100% 현금 환급 서비스
                </h4>
                <p className="text-[10px] text-slate-400 mb-2 font-medium leading-relaxed">
                  받은 포인트는 1P = 1원 비율로 100% 다음 달 급여에 합산되어 등록된 급여 계좌로 편리하게 환급됩니다. (최소 10,000P 이상 신청 가능)
                </p>
                <div className="h-px w-6 bg-purple-100 mx-auto my-2" />
                <p className="text-[10px] text-[#E63946] font-bold flex items-center justify-center gap-1">
                  ✨ 나만의 진정한 가치 보상을 만나세요!
                </p>
              </div>
            </div>

            {/* Track 2 */}
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md inline-block">BENEFIT 2</p>
              <div className="p-4 bg-slate-900 rounded-xl text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5">
                  <Trophy size={42} className="text-white" />
                </div>
                <h4 className="font-bold text-amber-300 text-xs mb-1 flex items-center justify-center gap-1">
                  <Trophy size={12} /> 연말 명예 세라제머 시상
                </h4>
                <p className="text-[10px] text-slate-400 mb-2.5 font-medium leading-relaxed">
                  가장 많은 칭찬 카드를 받고 건강한 소통 문화를 이끌어 준 동료를 연말에 최종 정산하여 대규모 특별 보상과 시상을 진행합니다.
                </p>
                <div className="inline-flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  <Star size={8} className="text-amber-300 fill-amber-300" />
                  <span className="text-[9px] font-bold text-white">최종 랭킹 특별 보상</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-6 border-t border-slate-100">
         <p className="text-xs font-bold text-slate-400 tracking-wider">
          서로를 아끼고 인정하는 생동감 넘치는 일터, <span className="text-[#E63946] font-bold underline">Thank you CERAGEM</span>이 함께 만들어갑니다. 💖
        </p>
      </div>
    </div>
  );
};

export default Guide;
