import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Profile, Transaction, Withdrawal } from '../types';
import { CERAGEMERSHIP_VALUES } from '../constants';
import { 
  RefreshCw, Settings, TrendingUp, Users, 
  Edit3, X, FileText, BarChart3, Search, Heart, 
  ShoppingBag, Trash2, ShieldAlert, Lock, Info, MessageCircle, Calendar, UserPlus, AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AdminDashboardProps {
  currentUser: Profile;
  refreshData?: () => Promise<void>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, refreshData }) => {
  const [activeTab, setActiveTab] = useState<'ranking' | 'users' | 'praise_list' | 'withdrawal_requests' | 'stats' | 'control'>('ranking');
  const [users, setUsers] = useState<Profile[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [fullResetting, setFullResetting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [addingPointsUser, setAddingPointsUser] = useState<Profile | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState(100);
  const [newDepartment, setNewDepartment] = useState('');
  const [selectedPraiseDetail, setSelectedPraiseDetail] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [userData, txData, withdrawalData] = await Promise.all([
        api.getAllUsers(),
        api.getAllTransactions(),
        api.getAllWithdrawals()
      ]);
      setUsers(userData);
      setAllTransactions(txData);
      setAllWithdrawals(withdrawalData);
    } catch (e: any) {
      console.error("Admin Data fetch error:", e);
      if (e.message && e.message.includes("permission")) {
        setErrorMsg("데이터를 불러올 권한이 없습니다. Firestore 보안 규칙을 확인하세요.");
      } else {
        setErrorMsg("데이터를 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWithdrawalStatus = async (withdrawalId: string, status: 'approved' | 'rejected') => {
    const actionText = status === 'approved' ? '승인(발송 완료)' : '반려';
    if (!window.confirm(`이 구매/출금 신청을 정말 ${actionText}하시겠습니까?\n반려 시 차감되었던 포인트가 즉시 사용자에게 반환됩니다.`)) return;
    
    try {
      const success = await api.updateWithdrawalStatus(withdrawalId, status);
      if (success) {
        alert(`신청 건이 ${actionText} 처리되었습니다.`);
        fetchData();
        if (refreshData) await refreshData();
      } else {
        alert('신청 처리 중 오류가 발생했습니다.');
      }
    } catch (e: any) {
      alert('오류 발생: ' + e.message);
    }
  };

  const handleResetPassword = async (userId: string, name: string) => {
    if (window.confirm(`'${name}'님의 비밀번호 초기화는 Auth 서비스를 통해야 합니다. 초기화 링크를 발송하시겠습니까?`)) {
      alert('Auth 시스템을 통한 비밀번호 초기화 프로세스를 권장합니다.');
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (window.confirm(`'${name}' 사용자를 정말 삭제하시겠습니까?\n삭제 후 복구할 수 없으며, 해당 사용자의 프로필 데이터가 제거됩니다.`)) {
      const success = await api.deleteUser(userId);
      if (success) {
        alert('사용자가 삭제되었습니다.');
        fetchData();
      } else {
        alert('사용자 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleUpdateDept = async () => {
    if (!editingUser) return;
    const success = await api.updateDepartment(editingUser.id, newDepartment);
    if (success) {
      alert('부서 정보가 수정되었습니다.');
      setEditingUser(null);
      fetchData();
    }
  };

  const handleAddPoints = async () => {
    if (!addingPointsUser) return;
    const success = await api.addPoints(addingPointsUser.id, pointsToAdd);
    if (success) {
      alert(`${addingPointsUser.name}님에게 ${pointsToAdd}P가 지급되었습니다.`);
      setAddingPointsUser(null);
      fetchData();
      if (refreshData) await refreshData();
    } else {
      alert('포인트 지급 중 오류가 발생했습니다.');
    }
  };

  const handleGlobalReset = async () => {
    const confirmMessage = "🚨 [주의] 전 직원의 '보내는 포인트'를 10,000P로 초기화하고 칭찬 횟수 제한을 해제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    if (!window.confirm(confirmMessage)) return;
    
    setResetting(true);
    const result = await api.resetAllBudgets();
    if (result.success) {
      alert("전 직원 포인트 예산 초기화가 완료되었습니다.");
      if (refreshData) await refreshData();
      fetchData();
    } else {
      alert("초기화 중 오류가 발생했습니다.");
    }
    setResetting(false);
  };

  const handleSystemReset = async () => {
    const msg1 = "🚨 [경고] 정말로 시스템의 모든 데이터를 삭제하시겠습니까?\n\n- 모든 칭찬 내역 삭제\n- 모든 출금 신청 내역 삭제\n- 모든 알림 삭제\n- 모든 사용자 포인트 초기화 (보유:0, 예산:10,000)\n\n이 작업은 절대 되돌릴 수 없습니다.";
    if (!window.confirm(msg1)) return;

    const msg2 = "마지막 확인입니다. 정말 초기화 하시겠습니까?";
    if (!window.confirm(msg2)) return;

    setFullResetting(true);
    const result = await api.resetSystemData();
    
    if (result.success) {
      alert(result.message);
      if (refreshData) await refreshData();
      fetchData();
    } else {
      alert(result.message);
    }
    setFullResetting(false);
  };

  const handlePointsMigration = async () => {
    if (!window.confirm("⚠️ [경고] 정말로 모든 기존 회원의 보유 포인트와 칭찬 내역 포인트를 100배로 변경하시겠습니까?\n이 작업은 꼭 '최초 1회'만 실행해야 중복 마이그레이션을 방지할 수 있습니다.")) return;
    
    setMigrating(true);
    try {
      const result = await api.migratePointsTo100x();
      if (result.success) {
        alert(result.message);
        fetchData();
        if (refreshData) await refreshData();
      } else {
        alert(result.message);
      }
    } catch (e: any) {
      alert("마이그레이션 중 오류가 발생했습니다: " + e.message);
    } finally {
      setMigrating(false);
    }
  };

  const handleInitializeEmployees = async () => {
    const confirmMessage = "직원 명단에 대한 Auth 계정을 일괄 생성하시겠습니까?\n이미 생성된 계정은 건너뛰며, 초기 비밀번호는 000000(관리자는 지정비번)으로 설정됩니다.";
    if (!window.confirm(confirmMessage)) return;

    setInitializing(true);
    try {
      const result = await api.initializeEmployeeAccounts();
      if (result.success) {
        let msg = `${result.created}명의 계정이 성공적으로 생성/업데이트 되었습니다.`;
        if (result.errors.length > 0) {
          msg += `\n\n[참고 사항]:\n${result.errors.join('\n')}`;
        }
        alert(msg);
        fetchData();
      }
    } catch (e: any) {
      alert("초기화 중 치명적인 오류 발생: " + e.message);
    } finally {
      setInitializing(false);
    }
  };

  const getCeragemershipText = (id: number) => {
    return CERAGEMERSHIP_VALUES.find(cv => cv.id === id)?.text || '세라제머십';
  };

  const sortedUsersByPoints = [...users].sort((a, b) => {
    const totalA = (a.received_wallet || 0) + (a.spent_points || 0);
    const totalB = (b.received_wallet || 0) + (b.spent_points || 0);
    return totalB - totalA;
  });

  const statsData = CERAGEMERSHIP_VALUES.map(cv => ({
    id: cv.id,
    name: `세라제머십 ${cv.id}`,
    fullText: cv.text,
    count: allTransactions.filter(tx => tx.core_value_id === cv.id).length
  }));

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in pb-16">
      
      {/* Tab Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Navigation Tabs - Modern flat UI */}
        <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/50 scrollbar-hide">
          {[
            { id: 'ranking', icon: TrendingUp, label: '랭킹' },
            { id: 'users', icon: Users, label: '사용자' },
            { id: 'praise_list', icon: Heart, label: '칭찬내역' },
            { id: 'withdrawal_requests', icon: ShoppingBag, label: '기프티콘 관리' },
            { id: 'stats', icon: BarChart3, label: '통계' },
            { id: 'control', icon: Settings, label: '제어센터' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSearchTerm(''); }}
                className={`flex-1 min-w-[90px] lg:min-w-[120px] py-4 px-3 font-semibold text-xs lg:text-sm transition-all flex flex-col lg:flex-row items-center justify-center gap-2 relative border-r border-slate-100 last:border-r-0 ${
                  isActive ? 'bg-[#E63946]/5 text-[#E63946]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/40'
                }`}
              >
                <tab.icon size={15} className={isActive ? 'stroke-[2.5px] text-[#E63946]' : 'text-slate-400'} />
                <span className="whitespace-nowrap">{tab.label}</span>
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#E63946]" />}
              </button>
            );
          })}
        </div>

        {/* Tab Content Block */}
        <div className="p-6 lg:p-8 bg-[#FAF9F6]">
          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 text-[#E63946] rounded-xl border border-rose-100 font-medium flex items-center gap-3">
              <AlertTriangle size={18} className="stroke-[2.5px]" />
              <p className="text-xs">{errorMsg}</p>
              <button onClick={fetchData} className="ml-auto p-1.5 hover:bg-rose-100 rounded-lg transition-colors text-rose-600"><RefreshCw size={14} /></button>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300">
              <RefreshCw className="animate-spin mb-4 text-[#E63946]" size={28} />
              <p className="text-xs font-semibold text-slate-500">마스터 데이터 로드 중...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search Bar with thin clean border */}
              {(['users', 'praise_list', 'withdrawal_requests'].includes(activeTab)) && (
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="검색어를 입력하세요 (이름, 부서...)"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-[#E63946] focus:ring-1 focus:ring-[#E63946]/20 focus:outline-none text-xs font-medium text-slate-700 placeholder:text-slate-400 transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}

              {/* Ranking Tab */}
              {activeTab === 'ranking' && (
                <div className="space-y-8">
                  {/* Podium Section for Top 3 */}
                  {sortedUsersByPoints.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      {/* 2nd Place */}
                      {sortedUsersByPoints[1] && (
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden order-2 md:order-1 md:mt-6 transition-all duration-300 hover:shadow-md">
                          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-300" />
                          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border-4 border-slate-200 shadow-inner relative mb-3">
                            <span className="text-xl font-extrabold text-slate-500">2</span>
                            <div className="absolute -bottom-1 bg-slate-400 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">SILVER</div>
                          </div>
                          <h3 className="font-extrabold text-slate-800 text-base">{sortedUsersByPoints[1].name}</h3>
                          <p className="text-xs text-slate-400 font-bold mt-1">{sortedUsersByPoints[1].department || '부서 없음'}</p>
                          <div className="mt-4 bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-full text-xs font-black text-slate-600">
                            {((sortedUsersByPoints[1].received_wallet || 0) + (sortedUsersByPoints[1].spent_points || 0)).toLocaleString()} P
                          </div>
                        </div>
                      )}

                      {/* 1st Place */}
                      {sortedUsersByPoints[0] && (
                        <div className="bg-white rounded-3xl border-2 border-amber-200 p-8 shadow-md flex flex-col items-center text-center relative overflow-hidden order-1 md:order-2 transform md:-translate-y-2 transition-all duration-300 hover:shadow-lg">
                          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-yellow-300" />
                          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center border-4 border-amber-300 shadow-inner relative mb-3">
                            <span className="text-2xl font-extrabold text-amber-600">👑</span>
                            <div className="absolute -bottom-1 bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm">CHAMPION</div>
                          </div>
                          <h3 className="font-black text-slate-800 text-lg">{sortedUsersByPoints[0].name}</h3>
                          <p className="text-xs text-slate-400 font-bold mt-1">{sortedUsersByPoints[0].department || '부서 없음'}</p>
                          <div className="mt-4 bg-amber-50 border border-amber-100 px-5 py-2 rounded-full text-sm font-black text-[#E63946] shadow-sm">
                            {((sortedUsersByPoints[0].received_wallet || 0) + (sortedUsersByPoints[0].spent_points || 0)).toLocaleString()} P
                          </div>
                        </div>
                      )}

                      {/* 3rd Place */}
                      {sortedUsersByPoints[2] && (
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden order-3 md:order-3 md:mt-6 transition-all duration-300 hover:shadow-md">
                          <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-300" />
                          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center border-4 border-orange-200 shadow-inner relative mb-3">
                            <span className="text-xl font-extrabold text-orange-600">3</span>
                            <div className="absolute -bottom-1 bg-orange-400 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">BRONZE</div>
                          </div>
                          <h3 className="font-extrabold text-slate-800 text-base">{sortedUsersByPoints[2].name}</h3>
                          <p className="text-xs text-slate-400 font-bold mt-1">{sortedUsersByPoints[2].department || '부서 없음'}</p>
                          <div className="mt-4 bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-full text-xs font-black text-slate-600">
                            {((sortedUsersByPoints[2].received_wallet || 0) + (sortedUsersByPoints[2].spent_points || 0)).toLocaleString()} P
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Complete Ranking List Table */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <h2 className="font-extrabold text-slate-800 text-sm">전체 칭찬 랭킹 리스트</h2>
                      <span className="text-[11px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-md">총 {sortedUsersByPoints.length}명</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="px-8 py-4.5 text-left font-extrabold w-28">순위</th>
                            <th className="px-8 py-4.5 text-left font-extrabold">이름</th>
                            <th className="px-8 py-4.5 text-left font-extrabold">부서</th>
                            <th className="px-8 py-4.5 text-right font-extrabold">누적 획득 포인트</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedUsersByPoints.map((user, idx) => {
                            const rankNum = idx + 1;
                            return (
                              <tr key={user.id} className="hover:bg-slate-50/40 transition-all duration-150">
                                <td className="px-8 py-5">
                                  <span className={`w-8 h-8 inline-flex items-center justify-center rounded-xl font-extrabold text-xs shadow-sm border ${
                                    rankNum === 1 ? 'bg-amber-100 text-amber-800 border-amber-200' : 
                                    rankNum === 2 ? 'bg-slate-100 text-slate-700 border-slate-200' : 
                                    rankNum === 3 ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-white text-slate-400 border-slate-150'
                                  }`}>
                                    {rankNum}
                                  </span>
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200/50 shrink-0">
                                      {user.name.charAt(0)}
                                    </div>
                                    <span className="font-extrabold text-slate-800 text-sm">{user.name}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg font-bold border border-slate-200/30">
                                    {user.department || '부서 없음'}
                                  </span>
                                </td>
                                <td className="px-8 py-5 text-right font-black text-[#E63946] text-sm">
                                  {((user.received_wallet || 0) + (user.spent_points || 0)).toLocaleString()} P
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-left font-semibold">사용자 프로필</th>
                          <th className="px-6 py-4 text-left font-semibold">부서명</th>
                          <th className="px-6 py-4 text-right font-semibold">보유 / 예산</th>
                          <th className="px-6 py-4 text-right font-semibold">작업 관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.filter(u => u.name.includes(searchTerm) || u.department.includes(searchTerm)).map(user => (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  {user.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-800 text-xs">{user.name}</span>
                                    {user.role === 'admin' && <span className="bg-[#E63946]/10 text-[#E63946] text-[8px] px-1.5 py-0.5 rounded-md font-bold tracking-wider">ADMIN</span>}
                                  </div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">UID: {user.id.substring(0, 8)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                              <button onClick={() => { setEditingUser(user); setNewDepartment(user.department); }} className="hover:text-[#E63946] flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-2 py-1 rounded-lg transition-colors text-[11px]">
                                {user.department} <Edit3 size={10} />
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="text-xs font-bold text-slate-800">{user.received_wallet.toLocaleString()} P</div>
                               <div className="text-[10px] text-slate-400 mt-0.5">예산: {user.giving_budget} P</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex items-center justify-end gap-1.5">
                                 <button 
                                   onClick={() => { setAddingPointsUser(user); setPointsToAdd(100); }}
                                   className="p-1.5 hover:bg-[#E63946]/5 text-[#E63946] rounded-lg transition-all"
                                   title="포인트 수동 지급"
                                 >
                                   <TrendingUp size={13} />
                                 </button>
                                 <button 
                                   onClick={() => handleResetPassword(user.id, user.name)}
                                   className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-all"
                                   title="비밀번호 찾기 안내"
                                 >
                                   <Lock size={13} />
                                 </button>
                                 <button
                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                    className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-all"
                                    title="사용자 완전 삭제"
                                 >
                                    <Trash2 size={13} />
                                 </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Praise List Tab */}
              {activeTab === 'praise_list' && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-left font-semibold">보낸 사람</th>
                          <th className="px-6 py-4 text-left font-semibold">받은 사람</th>
                          <th className="px-6 py-4 text-left font-semibold">칭찬 메시지</th>
                          <th className="px-6 py-4 text-right font-semibold">포인트</th>
                          <th className="px-6 py-4 text-right font-semibold">보낸 날짜</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allTransactions.filter(tx => 
                          tx.sender?.name.includes(searchTerm) || 
                          tx.receiver?.name.includes(searchTerm) || 
                          tx.message.includes(searchTerm)
                        ).map(tx => (
                          <tr 
                            key={tx.id} 
                            onClick={() => setSelectedPraiseDetail(tx)}
                            className="text-xs hover:bg-[#E63946]/5 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 font-semibold text-slate-800">{tx.sender?.name}</td>
                            <td className="px-6 py-4 font-semibold text-slate-800">{tx.receiver?.name}</td>
                            <td className="px-6 py-4 text-slate-400 max-w-[200px] truncate font-medium">{tx.message}</td>
                            <td className="px-6 py-4 text-right font-bold text-[#E63946]">+{tx.points}P</td>
                            <td className="px-6 py-4 text-right text-slate-400 whitespace-nowrap font-medium">{new Date(tx.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Withdrawal Requests Tab */}
              {activeTab === 'withdrawal_requests' && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-left font-semibold">신청직원</th>
                          <th className="px-6 py-4 text-left font-semibold">상품명 / 구분</th>
                          <th className="px-6 py-4 text-right font-semibold">차감 포인트</th>
                          <th className="px-6 py-4 text-center font-semibold">상태</th>
                          <th className="px-6 py-4 text-right font-semibold">신청 시간</th>
                          <th className="px-6 py-4 text-center font-semibold">작업</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allWithdrawals.filter(w => w.user?.name.includes(searchTerm) || w.bank_name.includes(searchTerm) || w.account_holder.includes(searchTerm) || w.account_number.includes(searchTerm)).map(w => (
                          <tr key={w.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-800">{w.user?.name || w.account_holder}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{w.user?.department || '부서 없음'}</div>
                            </td>
                            <td className="px-6 py-4">
                              {w.bank_name === '기프티콘 구매' ? (
                                <>
                                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                    <span className="bg-[#03C75A]/5 text-[#03C75A] px-1.5 py-0.5 rounded text-[9px] font-bold">네이버페이</span>
                                    <span>{w.account_number}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">구분: {w.account_holder}</div>
                                </>
                              ) : w.bank_name === '급여 합산 지급' ? (
                                <span className="bg-rose-50 text-[#E63946] px-2.5 py-1 rounded-md text-[10px] font-bold border border-rose-100">
                                  급여 합산 지급 예정 (급여 계좌)
                                </span>
                              ) : (
                                <>
                                  <div className="font-semibold text-slate-700">{w.bank_name}</div>
                                  <div className="font-mono text-slate-500 text-[11px] mt-0.5">{w.account_number} (예금주: {w.account_holder})</div>
                                </>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-extrabold text-[#E63946]">
                              {w.points.toLocaleString()} P
                            </td>
                            <td className="px-6 py-4 text-center">
                              {w.status === 'pending' && (
                                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-100">
                                  대기중
                                </span>
                              )}
                              {w.status === 'approved' && (
                                <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-100">
                                  {w.bank_name === '기프티콘 구매' ? '발송완료' : '지급완료'}
                                </span>
                              )}
                              {w.status === 'rejected' && (
                                <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-rose-100">
                                  반려됨
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right text-slate-400 font-medium whitespace-nowrap">
                              {new Date(w.created_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {w.status === 'pending' ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleUpdateWithdrawalStatus(w.id, 'approved')}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-colors shadow-sm"
                                  >
                                    승인
                                  </button>
                                  <button
                                    onClick={() => handleUpdateWithdrawalStatus(w.id, 'rejected')}
                                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition-colors shadow-sm"
                                  >
                                    반려
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] font-medium">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Stats Tab */}
              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <div className="h-80 lg:h-[400px] bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="mb-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">핵심가치 7대 지표 수집 통계</span>
                    </div>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="95%">
                        <BarChart data={statsData} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} 
                            axisLine={{ stroke: '#f1f5f9', strokeWidth: 1 }} 
                            tickLine={false} 
                            dy={10}
                          />
                          <YAxis 
                            tick={{ fontSize: 9, fontWeight: 500, fill: '#94a3b8' }} 
                            axisLine={{ stroke: '#f1f5f9', strokeWidth: 1 }} 
                            tickLine={false} 
                          />
                          <Tooltip 
                            cursor={{ fill: '#f1f5f9/30' }}
                            contentStyle={{ 
                              borderRadius: '12px', 
                              border: '1px solid #f1f5f9', 
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                              padding: '12px',
                              backgroundColor: '#white'
                            }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="max-w-[240px]">
                                    <p className="text-[#E63946] font-bold text-xs mb-1">{data.name}</p>
                                    <p className="text-slate-800 font-bold text-sm mb-2">{data.count}건의 칭찬</p>
                                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                                      "{data.fullText}"
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                            {statsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="#E63946" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Control Tab */}
              {activeTab === 'control' && (
                <div className="max-w-xl mx-auto py-4 space-y-6">
                  {/* Action 1 */}
                  <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-slate-50 text-slate-700 rounded-xl shrink-0">
                        <UserPlus size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-0.5">직원 계정 동기화 (Auth)</h3>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                          지정된 직원 마스터 명단에 대해 Firebase Auth 계정을 일괄 생성하고 동기화합니다. 이미 생성된 계정은 유지되며, 비밀번호는 000000으로 설정됩니다.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={handleInitializeEmployees}
                      disabled={initializing}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 shadow-sm"
                    >
                      {initializing ? <RefreshCw className="animate-spin text-white w-4 h-4" /> : <UserPlus size={14} />}
                      <span>직원 Auth 계정 일괄 동기화</span>
                    </button>
                  </div>

                   {/* Action 2 */}
                  <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-[#E63946]/5 text-[#E63946] rounded-xl shrink-0">
                        <ShieldAlert size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-0.5">월 단위 예산 리셋</h3>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                          전 직원의 '보내는 포인트(Giving Budget)' 한도를 10,000P로 다시 채워주고 칭찬 횟수 한도를 해제합니다. (수신 보유 포인트는 유지됨)
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={handleGlobalReset}
                      disabled={resetting}
                      className="w-full py-3 bg-[#E63946] hover:bg-[#d52b38] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 shadow-sm"
                    >
                      {resetting ? <RefreshCw className="animate-spin text-white w-4 h-4" /> : <Trash2 size={14} />}
                      <span>칭찬 예산 리셋 실행 (10,000P 한도)</span>
                    </button>
                  </div>

                  {/* Action 3: Points 100x Migration */}
                  <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-0.5">기존 포인트 100배 마이그레이션</h3>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                          기존 50P 예산 시절의 데이터(보유 포인트 및 칭찬내역 포인트액)를 새로운 1:1 현금 교환 비율(10,000P 예산)에 맞추어 100배로 일괄 마이그레이션(예: 10P ➡️ 1,000P)합니다. (최초 1회만 실행해야 합니다)
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={handlePointsMigration}
                      disabled={migrating}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 shadow-sm"
                    >
                      {migrating ? <RefreshCw className="animate-spin text-white w-4 h-4" /> : <TrendingUp size={14} />}
                      <span>포인트 100배 마이그레이션 실행</span>
                    </button>
                  </div>

                  {/* Action 4 */}
                  <div className="p-6 bg-white border border-rose-100 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-0.5">시스템 토탈 초기화</h3>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                          칭찬 기록, 출금 신청 내역, 알림 등을 포함한 모든 활동 히스토리를 영구적으로 지우고 초기 상태로 가볍게 정리합니다.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={handleSystemReset}
                      disabled={fullResetting}
                      className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 shadow-sm"
                    >
                      {fullResetting ? <RefreshCw className="animate-spin text-white w-4 h-4" /> : <Trash2 size={14} />}
                      <span>시스템 전체 데이터 초기화 와이프</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Edit department */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm p-7 space-y-5 transform animate-scale-in">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">부서 수정</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-slate-50 rounded-full text-slate-400"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">사용자: {editingUser.name}</label>
              <input 
                type="text" 
                className="w-full p-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-[#E63946] focus:outline-none font-medium text-sm text-slate-800"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
              />
            </div>
            <button 
              onClick={handleUpdateDept}
              className="w-full py-3 bg-[#E63946] hover:bg-[#d52b38] text-white font-bold rounded-xl transition-all shadow-sm text-xs"
            >
              수정 완료
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Add Points */}
      {addingPointsUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm p-7 space-y-5 transform animate-scale-in">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">수동 포인트 지급</h3>
              <button onClick={() => setAddingPointsUser(null)} className="p-1 hover:bg-slate-50 rounded-full text-slate-400"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">대상자</p>
                <p className="font-bold text-slate-800 text-xs">{addingPointsUser.name} ({addingPointsUser.department})</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">보유지갑 추가할 포인트액</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 rounded-xl p-2">
                  <button 
                    onClick={() => setPointsToAdd(Math.max(10, pointsToAdd - 10))}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-xs font-bold text-slate-600"
                  >-</button>
                  <input 
                    type="number" 
                    className="flex-1 bg-transparent focus:outline-none font-bold text-center text-xs text-slate-800"
                    value={pointsToAdd}
                    onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)}
                  />
                  <button 
                    onClick={() => setPointsToAdd(pointsToAdd + 10)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-xs font-bold text-slate-600"
                  >+</button>
                </div>
              </div>
            </div>
            <button 
              onClick={handleAddPoints}
              className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-xl transition-all shadow-sm text-xs"
            >
              지급하기 ⚡
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Praise details */}
      {selectedPraiseDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden transform animate-scale-in">
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-[#E63946]/5">
              <div className="flex items-center space-x-2">
                <MessageCircle size={16} className="text-[#E63946]" />
                <h3 className="text-sm font-bold text-slate-800">칭찬 내역 상세</h3>
              </div>
              <button onClick={() => setSelectedPraiseDetail(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sender</p>
                  <p className="font-bold text-slate-800 text-xs">{selectedPraiseDetail.sender?.name || '알 수 없음'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-[#E63946] uppercase tracking-wider mb-1">Receiver</p>
                  <p className="font-bold text-slate-800 text-xs">{selectedPraiseDetail.receiver?.name || '알 수 없음'}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                 <div className="flex items-center gap-1.5 text-slate-400">
                   <Info size={12} />
                   <span className="text-[9px] font-bold uppercase tracking-wider">Ceragemership {selectedPraiseDetail.core_value_id}</span>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl text-slate-700 border border-slate-100">
                   <p className="text-[11px] font-semibold leading-relaxed">{getCeragemershipText(selectedPraiseDetail.core_value_id)}</p>
                 </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <FileText size={12} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Message</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap font-medium italic">
                    "{selectedPraiseDetail.message}"
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2">
                <div className="flex items-center gap-1"><Calendar size={11} /> {new Date(selectedPraiseDetail.created_at).toLocaleString()}</div>
                <div className="font-bold text-[#E63946] text-xs">+{selectedPraiseDetail.points}P</div>
              </div>
            </div>

            <div className="p-4.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedPraiseDetail(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
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

export default AdminDashboard;
