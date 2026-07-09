import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction, Profile } from '../types';
import { CERAGEMERSHIP_VALUES } from '../constants';
import { MessageSquare, Quote, X, Trophy, Heart, Calendar } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface HistoryProps {
  user: Profile;
  users: Profile[];
}

const History: React.FC<HistoryProps> = ({ user, users }) => {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPraise, setSelectedPraise] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);

    const q = query(
      collection(db, "transactions"),
      where("receiver_id", "==", user.id)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const userMap = new Map(users.map(u => [u.id, u]));

      const txs = snap.docs.map(d => {
        const data = d.data();
        
        let createdAtIso = new Date().toISOString();
        if (data.created_at) {
            if (typeof data.created_at.toDate === 'function') {
                createdAtIso = data.created_at.toDate().toISOString();
            } 
            else if (data.created_at instanceof Date) {
                createdAtIso = data.created_at.toISOString();
            } else if (typeof data.created_at === 'string') {
                createdAtIso = data.created_at;
            }
        }

        return {
          id: d.id,
          ...data,
          core_value_id: Number(data.core_value_id),
          points: Number(data.points),
          created_at: createdAtIso,
          sender: userMap.get(data.sender_id) || { name: '알 수 없음', department: 'Unknown' }
        } as Transaction;
      });

      txs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setHistory(txs);
      setLoading(false);
    }, (error) => {
      console.error("History listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.id, users]);

  const getCeragemershipText = (id: number) => {
    return CERAGEMERSHIP_VALUES.find(cv => cv.id === id)?.text || '세라제머십';
  };

  const chartData = CERAGEMERSHIP_VALUES.map(cv => {
    const points = history
      .filter(t => t.core_value_id === cv.id)
      .reduce((acc, curr) => acc + (curr.points || 0), 0);
    return {
      id: cv.id,
      shortName: `세라제머십 ${cv.id}`, 
      name: `세라제머십 ${cv.id}`,
      points,
    };
  });

  if (loading && history.length === 0) return (
    <div className="flex flex-col items-center justify-center py-40 text-slate-300">
      <div className="w-10 h-10 border-4 border-rose-200 border-t-[#E63946] rounded-full animate-spin mb-4" />
      <p className="font-black text-sm text-slate-500">칭찬 기록을 불러오는 중...</p>
    </div>
  );

  const valueStyles = [
    { bg: 'bg-slate-50', border: 'border-slate-200/60', text: 'text-slate-600', barColor: '#E63946' },
    { bg: 'bg-slate-50', border: 'border-slate-200/60', text: 'text-slate-600', barColor: '#E63946' },
    { bg: 'bg-slate-50', border: 'border-slate-200/60', text: 'text-slate-600', barColor: '#E63946' },
    { bg: 'bg-slate-50', border: 'border-slate-200/60', text: 'text-slate-600', barColor: '#E63946' },
    { bg: 'bg-slate-50', border: 'border-slate-200/60', text: 'text-slate-600', barColor: '#E63946' },
    { bg: 'bg-slate-50', border: 'border-slate-200/60', text: 'text-slate-600', barColor: '#E63946' },
    { bg: 'bg-slate-50', border: 'border-slate-200/60', text: 'text-slate-600', barColor: '#E63946' },
  ];

  return (
    <div className="space-y-8 lg:space-y-12 animate-fade-in pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="flex flex-col">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">나의 히스토리</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">동료들이 나에게 선물한 소중한 캔과 포인트 기록입니다.</p>
        </div>
        <div className="bg-amber-400/10 text-amber-800 px-4 py-2 rounded-xl border border-amber-200/60 inline-block self-start sm:self-center font-bold text-sm">
          🏆 누적 {history.length}건 수신
        </div>
      </header>

      {/* Chart Section - Clean minimal styling */}
      <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-100 shadow-sm h-80 lg:h-[400px] overflow-hidden flex flex-col justify-between">
        <div className="mb-4 flex items-center gap-2">
           <Trophy size={16} className="text-amber-500" />
           <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">세라제머십 핵심가치별 수신 포인트</span>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="95%">
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="shortName" 
                tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} 
                axisLine={{ stroke: '#f1f5f9', strokeWidth: 1 }} 
                tickLine={false}
                interval={0}
                dy={10}
              />
              <YAxis 
                tick={{ fontSize: 10, fontWeight: 500, fill: '#94a3b8' }} 
                axisLine={{ stroke: '#f1f5f9', strokeWidth: 1 }} 
                tickLine={false} 
              />
              <Tooltip 
                cursor={{ fill: '#00000005' }}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: '1px solid #f1f5f9', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  padding: '12px',
                  backgroundColor: '#white'
                }}
                itemStyle={{ fontWeight: 700, color: '#E63946' }}
                labelStyle={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}
                formatter={(value: any) => [`${value} P`, '획득 포인트']}
              />
              <Bar dataKey="points" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {chartData.map((entry, index) => {
                  const style = valueStyles[index % valueStyles.length];
                  return (
                    <Cell key={`cell-${index}`} fill={style.barColor} />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-5">
        <div className="px-1 flex items-center justify-between">
          <h3 className="font-bold text-base lg:text-lg text-slate-900 flex items-center gap-2">
            <Heart size={18} className="text-[#E63946] fill-[#E63946]" />
            도착한 칭찬 리스트
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time update active</p>
        </div>
        
        {history.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 flex flex-col items-center justify-center shadow-sm">
            <MessageSquare size={36} className="mb-4 opacity-15 text-[#E63946]" />
            <p className="font-bold text-slate-800 text-sm">아직 도착한 칭찬 카드가 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">멋진 동료들과 기여를 나누며 첫 카드를 수신해보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {history.map(tx => {
              const themeStyle = valueStyles[(tx.core_value_id - 1) % valueStyles.length] || valueStyles[0];
              return (
                <div 
                  key={tx.id} 
                  onClick={() => setSelectedPraise(tx)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4 group animate-fade-in"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-[#E63946]/10 text-[#E63946] flex items-center justify-center font-bold text-base">
                      {tx.sender?.name.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm leading-none">{tx.sender?.name || '알 수 없음'}</span>
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                          세라제머십 {tx.core_value_id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-2 font-medium">"{tx.message}"</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#E63946] text-base">+{tx.points}P</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      {new Date(tx.created_at).toLocaleDateString('ko-KR', {month: '2-digit', day: '2-digit'})}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPraise && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl w-full max-w-lg overflow-hidden transform animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#E63946]/10 text-[#E63946] rounded-xl">
                  <Heart size={16} fill="currentColor" />
                </div>
                <h3 className="text-base font-bold text-slate-800">칭찬 카드 상세</h3>
              </div>
              <button onClick={() => setSelectedPraise(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 lg:p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="flex items-center justify-between p-5 bg-slate-50/50 border border-slate-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-[#E63946]/10 text-[#E63946] flex items-center justify-center font-bold text-lg">
                     {selectedPraise.sender?.name.charAt(0) || '?'}
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">SENDER</p>
                     <p className="font-bold text-slate-950 text-base">
                       {selectedPraise.sender?.name || '알 수 없음'}{' '}
                       <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider ml-1">{selectedPraise.sender?.department}</span>
                     </p>
                   </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">POINTS RECVD</p>
                  <p className="text-xl font-bold text-[#E63946]">+{selectedPraise.points}P</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Quote size={14} className="rotate-180" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">MESSAGE CARD</span>
                </div>
                <div className="bg-slate-50/30 p-5 rounded-2xl border border-slate-100 relative">
                  <Quote size={20} className="text-rose-100 absolute -top-1 -left-1 rotate-180 opacity-50" />
                  <p className="text-slate-700 text-sm lg:text-base leading-relaxed whitespace-pre-wrap font-semibold italic relative z-10 pl-2">
                    "{selectedPraise.message}"
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Trophy size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">CERAGEMERSHIP VALUE</span>
                </div>
                <div className="p-5 bg-slate-900 rounded-2xl text-white">
                  <p className="text-[#E63946] font-bold text-[10px] uppercase tracking-widest mb-1.5">
                    Ceragemership {selectedPraise.core_value_id}
                  </p>
                  <p className="text-xs lg:text-sm font-semibold leading-relaxed text-slate-200">
                    {getCeragemershipText(selectedPraise.core_value_id)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-slate-400 pt-2 font-semibold text-xs">
                <Calendar size={12} />
                <span>{new Date(selectedPraise.created_at).toLocaleString('ko-KR')}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedPraise(null)}
                className="px-5 py-2.5 bg-[#E63946] hover:bg-[#d52b38] text-white rounded-xl font-bold shadow-sm transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
