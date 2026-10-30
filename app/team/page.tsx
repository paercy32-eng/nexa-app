'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  referralCode: string;
  currency: string;
  totalEarnings: number;
  counts: { level1: number; level2: number; level3: number };
  levels: {
    level1: ReferralEntry[];
    level2: ReferralEntry[];
    level3: ReferralEntry[];
  };
}

export default function TeamPage() {
  const router = useRouter();
  const [data, setData] = useState<ReferralsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(1);
  const [baseUrl, setBaseUrl] = useState('');
  
  // 🚨 State for the modal
  const [showMembersModal, setShowMembersModal] = useState(false);

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
    if (typeof window !== 'undefined') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      setBaseUrl(appUrl);
    }
  }, []);

  async function copyToClipboard(text: string, type: 'code' | 'link') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast.success(type === 'code' ? 'Code copied!' : 'Link copied!');
        return;
      }
      
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        toast.success(type === 'code' ? 'Code copied!' : 'Link copied!');
      } else {
        toast.error('Could not copy automatically.');
      }
    } catch (err) {
      toast.error('Could not copy.');
    }
  }

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
        <p className="text-zinc-500 text-sm">Could not load team data.</p>
      </div>
    );
  }

  const currentLevelList = 
    activeLevel === 1 ? data.levels.level1 : 
    activeLevel === 2 ? data.levels.level2 : 
    data.levels.level3;

  const referralLink = `${baseUrl}/register?ref=${data.referralCode}`;

  return (
    <div className="animate-fade-in bg-[#0a0a0f] min-h-screen pb-24 text-zinc-100 selection:bg-violet-500/30">
      
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black text-white tracking-tight">Network Hub</h1>
        <p className="text-violet-400 font-bold text-[9px] mt-1 tracking-[0.2em] uppercase">Build your downline & earn</p>
      </div>

      <div className="px-4">
        
        {/* MINIMIZED Top Totals */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 bg-[#12121a] border border-violet-500/20 rounded-2xl p-3 text-center">
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Commission</div>
            <div className="text-sm font-black text-violet-400">
              {data.currency} {data.totalEarnings.toLocaleString()}
            </div>
          </div>
          <div className="flex-1 bg-[#12121a] border border-cyan-500/20 rounded-2xl p-3 text-center">
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Team Size</div>
            <div className="text-sm font-black text-cyan-400">
              {data.counts.level1 + data.counts.level2 + data.counts.level3} Members
            </div>
          </div>
        </div>

        {/* MINIMIZED Referral Link Section */}
        <div className="bg-[#12121a] border border-white/5 rounded-2xl p-3 shadow-lg mb-6">
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="block text-[8px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">Code</label>
              <input
                type="text"
                readOnly
                value={data.referralCode}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-violet-300 font-black font-mono tracking-widest text-xs outline-none"
              />
            </div>
            <button
              onClick={() => copyToClipboard(data.referralCode, 'code')}
              className="mt-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider active:scale-95 transition"
            >
              Copy
            </button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[8px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">Link</label>
              <input
                type="text"
                readOnly
                value={referralLink}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-zinc-400 text-xs outline-none"
              />
            </div>
            <button
              onClick={() => copyToClipboard(referralLink, 'link')}
              className="mt-4 bg-white/10 text-white px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider active:scale-95 transition border border-white/10"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Level Tabs */}
        <div className="grid grid-cols-3 gap-1 mb-4 bg-[#12121a] p-1 rounded-xl border border-white/5">
          {([1, 2, 3] as const).map((level) => {
            const count = level === 1 ? data.counts.level1 : level === 2 ? data.counts.level2 : data.counts.level3;
            const isActive = activeLevel === level;

            return (
              <button
                key={level}
                onClick={() => setActiveLevel(level)}
                className={`py-2 rounded-lg text-xs font-bold transition flex flex-col items-center leading-tight ${
                  isActive
                    ? 'bg-violet-600/20 text-white border border-violet-500/30'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                <span className="uppercase tracking-wider text-[10px]">Level {level}</span>
                <span className={`text-[10px] mt-0.5 font-black ${isActive ? 'text-cyan-400' : 'text-zinc-600'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* 🚨 View Members Button (Instead of inline list) */}
        <div className="bg-[#12121a] border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-xs text-zinc-400 mb-3">You have <span className="font-bold text-white">{currentLevelList.length}</span> members in Level {activeLevel}.</p>
          <button
            onClick={() => setShowMembersModal(true)}
            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            View Member List
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

      </div>

      {/* 🚨 MEMBERS MODAL */}
      {showMembersModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowMembersModal(false)}>
          <div className="w-full max-w-md bg-[#12121a] border border-white/10 rounded-3xl p-5 shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-black text-white">Level {activeLevel} Members</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total: {currentLevelList.length}</p>
              </div>
              <button onClick={() => setShowMembersModal(false)} className="text-zinc-500 hover:text-white transition text-2xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 pb-4">
              {currentLevelList.length > 0 ? (
                currentLevelList.map((member) => (
                  <div key={member.id} className="bg-black/40 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-200">{member.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{member.phone}</p>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded border ${
                      member.isValid 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-zinc-800/50 text-zinc-500 border-zinc-700'
                    }`}>
                      {member.isValid ? 'Active' : 'Pending'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-zinc-500 font-medium">No members at this level yet.</p>
                </div>
              )}
            </div>

            <button onClick={() => setShowMembersModal(false)} className="w-full bg-white/5 border border-white/10 text-white font-bold py-3 rounded-xl mt-2">
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
