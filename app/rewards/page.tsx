'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Tier = {
  target: number;
  reward: number;
  isClaimed: boolean;
};

export default function RewardsPage() {
  const router = useRouter();
  const [teamInvestment, setTeamInvestment] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/rewards');
        
        if (res.status === 401) {
          router.replace('/login');
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to load rewards');
        }

        const data = await res.json();
        setTeamInvestment(data.teamInvestment ?? 0);
        setTeamSize(data.teamSize ?? 0);
        setTiers(data.tiers ?? []);
      } catch (err) {
        console.error('Rewards load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 animate-fade-in pb-24 bg-[#0a0a0f] text-zinc-100 selection:bg-violet-500/30">
      
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
                  {/* Lock / Check Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                    isCompleted 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'bg-black/50 text-zinc-500 border-white/5'
                  }`}>
                    {isCompleted ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
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

              {/* Progress Bar */}
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

              {/* Progress Text */}
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
    </main>
  );
                   }
