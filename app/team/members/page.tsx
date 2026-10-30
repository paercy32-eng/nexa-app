'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ReferralEntry {
  id: string;
  referred_id: string;
  name: string;
  phone: string;
  earnings: number;
  joined_at: string;
  isValid: boolean;
}

interface ReferralsResponse {
  counts: { level1: number; level2: number; level3: number };
  levels: {
    level1: ReferralEntry[];
    level2: ReferralEntry[];
    level3: ReferralEntry[];
  };
}

function MembersList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLevel = Number(searchParams.get('level')) || 1;
  
  const [data, setData] = useState<ReferralsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(initialLevel as 1 | 2 | 3);

  async function loadReferrals() {
    setLoading(true);
    try {
      const res = await fetch('/api/team?t=' + Date.now(), { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || 'Could not load team');
        setLoading(false);
        return;
      }

      setData(json);
      setLoading(false);
    } catch (err) {
      toast.error('Network error');
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferrals();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20 bg-[#0a0a0f] min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 bg-[#0a0a0f] min-h-screen">
        <p className="text-zinc-500 text-sm">Could not load data.</p>
      </div>
    );
  }

  const currentLevelList = 
    activeLevel === 1 ? data.levels.level1 : 
    activeLevel === 2 ? data.levels.level2 : 
    data.levels.level3;

  return (
    <div className="animate-fade-in bg-[#0a0a0f] min-h-screen pb-24 text-zinc-100 selection:bg-violet-500/30">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-8 pb-6">
        <Link href="/team" className="text-zinc-500 hover:text-white transition text-xl">←</Link>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Team Members</h1>
          <p className="text-violet-400 font-bold text-[10px] mt-1 tracking-[0.2em] uppercase">Your Downline</p>
        </div>
      </div>

      <div className="px-4">
        
        {/* Level Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-6 bg-[#12121a] p-1.5 rounded-2xl border border-white/5">
          {([1, 2, 3] as const).map((level) => {
            const count = level === 1 ? data.counts.level1 : level === 2 ? data.counts.level2 : data.counts.level3;
            const isActive = activeLevel === level;

            return (
              <button
                key={level}
                onClick={() => setActiveLevel(level)}
                className={`py-3 rounded-xl text-xs font-bold transition flex flex-col items-center leading-tight ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/30 text-white shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                <span className="uppercase tracking-wider">Level {level}</span>
                <span className={`text-[10px] mt-1 font-black ${isActive ? 'text-cyan-400' : 'text-zinc-600'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Member List */}
        {currentLevelList.length > 0 ? (
          <div className="space-y-3">
            {currentLevelList.map((member) => (
              <div key={member.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition">
                <div>
                  <p className="text-sm font-bold text-zinc-200 tracking-wide">{member.name}</p>
                  <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{member.phone}</p>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border ${
                  member.isValid 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                    : 'bg-zinc-800/50 text-zinc-500 border-zinc-700'
                }`}>
                  {member.isValid ? 'Active' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-[#12121a] rounded-2xl border border-white/5">
            <p className="text-xs text-zinc-500 font-medium">No members at Level {activeLevel} yet.</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    }>
      <MembersList />
    </Suspense>
  );
}
