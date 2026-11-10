'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { convertFromUGX } from '@/lib/currency';

type Tier = {
  target: number;
  reward: number;
  isTargetHit: boolean;
  isClaimed: boolean;
};

export default function TasksPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState('UGX');
  
  const [teamInvestment, setTeamInvestment] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  async function loadData() {
    try {
      const meRes = await fetch('/api/me?t=' + Date.now());
      if (meRes.status === 401) {
        router.replace('/login');
        return;
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrency(meData.user.currency || 'UGX');
      }

      const rewardsRes = await fetch('/api/rewards?t=' + Date.now());
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
    } catch (err) {
      console.error(err);
      setLoadingRewards(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [router]);

  async function handleClaim(target: number) {
    setClaimingId(target);
    try {
      const res = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || 'Failed to claim');
      } else {
        toast.success('Reward claimed successfully!');
        const rewardsRes = await fetch('/api/rewards?t=' + Date.now());
        if (rewardsRes.ok) {
          const rewardsData = await rewardsRes.json();
          setTiers(rewardsData.tiers || []);
        }
      }
    } catch {
      toast.error('Network error');
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 bg-[#0a0a0f] text-zinc-100 animate-fade-in pb-24 selection:bg-amber-500/30">
      
      {/* Header */}
      <div className="px-1 mb-6">
        <h1 className="text-3xl font-black text-white tracking-tight">Team Rewards</h1>
        <p className="text-amber-500 font-bold text-[10px] mt-1 tracking-[0.2em] uppercase">Earn Milestone Prizes</p>
      </div>

      {loadingRewards ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Card */}
          <div className="relative overflow-hidden bg-[#12121a] border border-white/10 rounded-2xl p-4 mb-6 shadow-xl flex items-center justify-between">
            <div>
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Team Investment</div>
              <div className="text-lg font-black text-amber-500">{currency} {convertFromUGX(teamInvestment, currency).toLocaleString()}</div>
            </div>
            <div className="w-px h-8 bg-white/10 mx-2"></div>
            <div className="text-right">
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Team Size</div>
              <div className="text-lg font-black text-cyan-400">{teamSize}</div>
            </div>
          </div>

          {/* Tiers List */}
          <div className="space-y-3">
            {tiers.map((tier, index) => {
              const progress = Math.min((teamInvestment / tier.target) * 100, 100);
              const remaining = Math.max(tier.target - teamInvestment, 0);

              return (
                <div key={index} className="bg-[#12121a] border border-white/10 rounded-2xl p-3 shadow-md">
                  
                  {/* Header: Icon, Target, Reward */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                        tier.isClaimed 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-black/50 text-zinc-500 border-white/5'
                      }`}>
                        {tier.isClaimed ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{currency} {convertFromUGX(tier.target, currency).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className={`font-black text-xs ${tier.isClaimed ? 'text-zinc-500 line-through' : 'text-amber-500'}`}>
                      +{convertFromUGX(tier.reward, currency).toLocaleString()}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-black/50 border border-white/5 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        tier.isClaimed 
                          ? 'bg-emerald-500' 
                          : 'bg-gradient-to-r from-amber-600 to-amber-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Footer: Progress text OR Claim Button */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-[9px] font-bold text-zinc-500">
                      {tier.isClaimed ? 'Completed' : `${currency} ${convertFromUGX(remaining, currency).toLocaleString()} to go`}
                    </div>
                    
                    {tier.isTargetHit && !tier.isClaimed && (
                      <button
                        onClick={() => handleClaim(tier.target)}
                        disabled={claimingId === tier.target}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase px-4 py-1.5 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse disabled:opacity-50"
                      >
                        {claimingId === tier.target ? '...' : 'Claim'}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
