'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Tier = {
  target: number;
  reward: number;
  isClaimed: boolean;
};

export default function TasksPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'spin' | 'rewards'>('spin');
  
  // Rewards State
  const [teamInvestment, setTeamInvestment] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);

  // Spin State
  const [canSpin, setCanSpin] = useState(false);
  const [spinReason, setSpinReason] = useState('Loading...');
  const [invitesToday, setInvitesToday] = useState(0);
  const [loadingSpin, setLoadingSpin] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Load Rewards
        const rewardsRes = await fetch('/api/rewards');
        if (rewardsRes.status === 401) {
          router.replace('/login');
          return;
        }
        if (rewardsRes.ok) {
          const rewardsData = await rewardsRes.json();
          setTeamInvestment(rewardsData.teamInvestment || 0);
          setTeamSize(rewardsData.teamSize || 0);
          setTiers(rewardsData.tiers || []);
        }
        setLoadingRewards(false);

        // Load Spin Status
        const spinRes = await fetch('/api/spin');
        if (spinRes.ok) {
          const spinData = await spinRes.json();
          setCanSpin(spinData.canSpin);
          setSpinReason(spinData.reason || '');
          setInvitesToday(spinData.invitesToday || 0);
        }
        setLoadingSpin(false);

      } catch (err) {
        console.error(err);
        setLoadingRewards(false);
        setLoadingSpin(false);
      }
    }
    loadData();
  }, [router]);

  async function handleSpin() {
    if (!canSpin || spinning) return;

    setSpinning(true);
    setSpinResult(null);

    try {
      // Add a fake delay for the spinning animation effect
      await new Promise(resolve => setTimeout(resolve, 2000));

      const res = await fetch('/api/spin', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Spin failed');
        setCanSpin(false);
        setSpinReason(data.error);
      } else {
        setSpinResult(data.prize);
        setCanSpin(false);
        setSpinReason('You have already spun today. Come back tomorrow!');
        toast.success('Congratulations!');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSpinning(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 bg-[#0a0a0f] text-zinc-100 animate-fade-in pb-24 selection:bg-violet-500/30">
      
      {/* Header */}
      <div className="px-1 mb-6">
        <h1 className="text-3xl font-black text-white tracking-tight">Tasks & Rewards</h1>
        <p className="text-violet-400 font-bold text-[10px] mt-1 tracking-[0.2em] uppercase">Earn daily prizes</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-[#12121a] p-1.5 rounded-2xl border border-white/5 mb-6">
        <button
          onClick={() => setActiveTab('spin')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            activeTab === 'spin'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
          Spin to Win
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            activeTab === 'rewards'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
          Team Rewards
        </button>
      </div>

      {/* ========================================= */}
      {/* SPIN TAB */}
      {/* ========================================= */}
      {activeTab === 'spin' && (
        <div className="animate-fade-in">
          {loadingSpin ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              
              {/* Spin Wheel Area */}
              <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
                {/* Glowing Rings */}
                <div className={`absolute inset-0 rounded-full border-4 border-dashed border-violet-500/30 ${spinning ? 'animate-spin-slow' : ''}`}></div>
                <div className={`absolute inset-4 rounded-full border-2 border-cyan-500/20 ${spinning ? 'animate-reverse-spin' : ''}`}></div>
                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-violet-900/40 to-[#12121a] border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.2)]"></div>
                
                {/* Center Spin Button */}
                <button
                  onClick={handleSpin}
                  disabled={!canSpin || spinning}
                  className={`relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
                    canSpin 
                      ? 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_0_30px_rgba(139,92,246,0.6)] active:scale-95' 
                      : 'bg-zinc-800 border-2 border-zinc-700 opacity-80 cursor-not-allowed'
                  }`}
                >
                  {spinning ? (
                    <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={canSpin ? 'text-white mb-1' : 'text-zinc-500 mb-1'}>
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                      <span className={`text-sm font-black uppercase tracking-widest ${canSpin ? 'text-white' : 'text-zinc-500'}`}>
                        {canSpin ? 'SPIN' : 'LOCKED'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Status / Rules */}
              <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-5 text-center">
                {canSpin ? (
                  <div className="text-emerald-400 font-bold text-sm">
                    You are eligible! Tap the wheel to spin.
                  </div>
                ) : (
                  <div className="text-zinc-400 font-medium text-sm leading-relaxed">
                    <span className="text-red-400 block mb-1 font-bold">Cannot Spin</span>
                    {spinReason}
                  </div>
                )}
                
                {/* Daily Invite Progress */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Daily Active Invites</div>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3].map((num) => (
                      <div key={num} className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs ${
                        invitesToday >= num 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-black/50 border-white/10 text-zinc-600'
                      }`}>
                        {num}
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-2">Invite 3 active users today to unlock</div>
                </div>
              </div>

              {/* Rules Card */}
              <div className="w-full max-w-sm mt-4 bg-[#12121a] border border-white/5 rounded-3xl p-5">
                 <div className="text-[10px] text-violet-400 font-bold uppercase tracking-wider mb-3">Prize Pool</div>
                 <ul className="text-xs text-zinc-400 space-y-2">
                   <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-violet-500 rounded-full"></span> Win a free Nexa Flow Node (Worth 20k, 4k daily)</li>
                   <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span> Win instant cash prizes (5k, 10k, 20k UGX value)</li>
                 </ul>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ========================================= */}
      {/* REWARDS TAB */}
      {/* ========================================= */}
      {activeTab === 'rewards' && (
        <div className="animate-fade-in">
          {loadingRewards ? (
             <div className="flex justify-center py-20">
               <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
             </div>
          ) : (
            <>
              {/* Summary Card */}
              <div className="relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-3xl rounded-full"></div>
                
                <div className="relative z-10 flex items-center gap-4 mb-6">
                  <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400 border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 12 20 22 4 22 4 12"></polyline>
                      <rect x="2" y="7" width="20" height="5"></rect>
                      <line x1="12" y1="22" x2="12" y2="7"></line>
                      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-white tracking-wide uppercase">Team Rewards</h1>
                    <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mt-1">Unlock tiers as your team grows</p>
                  </div>
                </div>
                
                <div className="relative z-10 grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                    <div className="text-[9px] text-zinc-500 font-bold tracking-wider mb-1 uppercase">Team Investment</div>
                    <div className="text-lg font-black text-violet-400">UGX {teamInvestment.toLocaleString()}</div>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                    <div className="text-[9px] text-zinc-500 font-bold tracking-wider mb-1 uppercase">Team Size</div>
                    <div className="text-lg font-black text-cyan-400">{teamSize}</div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 py-2.5 rounded-xl">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Automatic claim once reached!
                </div>
              </div>

              {/* Reward Tiers Header */}
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-sm font-bold text-zinc-200 tracking-wide uppercase">Reward Tiers</h2>
                <div className="h-px bg-gradient-to-r from-violet-500/50 to-transparent flex-1 ml-4"></div>
              </div>

              {/* Tiers List */}
              <div className="space-y-4">
                {tiers.map((tier, index) => {
                  const progress = Math.min((teamInvestment / tier.target) * 100, 100);
                  const isCompleted = teamInvestment >= tier.target;
                  const remaining = Math.max(tier.target - teamInvestment, 0);

                  return (
                    <div key={index} className="relative overflow-hidden bg-[#12121a] border border-white/10 rounded-3xl p-5 shadow-lg group">
                      <div className="relative z-10 flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                            isCompleted 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                              : 'bg-black/50 text-zinc-500 border-white/5'
                          }`}>
                            {isCompleted ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            )}
                          </div>
                          <div>
                            <div className="font-black text-white text-base tracking-wide">UGX {tier.target.toLocaleString()}</div>
                            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Team Investment Goal</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-black text-sm ${isCompleted ? 'text-cyan-400' : 'text-violet-400'}`}>
                            +UGX {tier.reward.toLocaleString()}
                          </div>
                          <div className={`text-[9px] font-black px-2 py-1 rounded-md mt-1 inline-block border tracking-wider ${
                            isCompleted 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-black/50 text-zinc-500 border-white/5'
                          }`}>
                            {isCompleted ? 'UNLOCKED' : 'LOCKED'}
                          </div>
                        </div>
                      </div>

                      <div className="relative z-10 w-full h-2.5 bg-black/50 border border-white/5 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            isCompleted 
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                              : 'bg-gradient-to-r from-violet-600 to-indigo-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="relative z-10 flex justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-zinc-500">UGX {teamInvestment.toLocaleString()} / {tier.target.toLocaleString()}</span>
                        {!isCompleted && (
                          <span className="text-violet-400">+UGX {remaining.toLocaleString()} to go</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* 🚨 Spin Result Modal */}
      {spinResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setSpinResult(null)}>
          <div className="w-full max-w-sm bg-[#12121a] border border-violet-500/30 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(139,92,246,0.3)] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="w-20 h-20 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(139,92,246,0.5)]">
              <span className="text-4xl">🎉</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">You Won!</h2>
            
            {spinResult.type === 'product' ? (
              <div className="mb-6">
                <div className="text-cyan-400 font-bold text-lg mb-1">{spinResult.productName}</div>
                <div className="text-zinc-400 text-xs">Worth 20,000 UGX</div>
                <div className="text-emerald-400 font-bold text-sm mt-2">Earning 4,000 UGX daily</div>
                <div className="text-[10px] text-zinc-500 mt-2 bg-white/5 py-2 rounded-lg border border-white/10">Check your Portfolio to see it!</div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="text-emerald-400 font-black text-4xl mb-2">
                  {spinResult.currency} {Number(spinResult.amount).toLocaleString()}
                </div>
                <div className="text-zinc-400 text-xs">Has been added to your balance!</div>
              </div>
            )}

            <button onClick={() => setSpinResult(null)} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition">
              Awesome!
            </button>
          </div>
        </div>
      )}

    </main>
  );
          }
