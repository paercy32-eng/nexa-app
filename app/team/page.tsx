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
    
    // 🚨 Use the Vercel Env Variable first, fallback to window if not set
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
      <div className="px-5 pt-8 pb-6">
        <h1 className="text-3xl font-black text-white tracking-tight">Network Hub</h1>
        <p className="text-violet-400 font-bold text-[10px] mt-1 tracking-[0.2em] uppercase">Build your downline & earn</p>
      </div>

      <div className="px-4">
        
        {/* Top Totals */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-900/40 to-[#12121a] border border-violet-500/20 rounded-3xl p-5 shadow-2xl">
            <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/20 blur-2xl rounded-full"></div>
            <div className="text-[9px] text-violet-300 font-bold uppercase tracking-widest mb-1.5 relative z-10">Total Commission</div>
            <div className="text-xl font-black text-white relative z-10">
              <span className="text-xs text-violet-400 mr-1">{data.currency || 'UGX'}</span>
              {data.totalEarnings.toLocaleString()}
            </div>
          </div>
          
          <div className="relative overflow-hidden bg-gradient-to-br from-cyan-900/40 to-[#12121a] border border-cyan-500/20 rounded-3xl p-5 shadow-2xl">
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/20 blur-2xl rounded-full"></div>
            <div className="text-[9px] text-cyan-300 font-bold uppercase tracking-widest mb-1.5 relative z-10">Team Size</div>
            <div className="text-xl font-black text-white relative z-10">
              {data.counts.level1 + data.counts.level2 + data.counts.level3}
              <span className="text-xs text-cyan-400 ml-1.5 font-bold">Members</span>
            </div>
          </div>
        </div>

        {/* Referral Link Section */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl mb-8 relative overflow-hidden">
          <div className="mb-5">
            <label className="block text-[9px] text-zinc-500 font-bold mb-2 uppercase tracking-widest">Your Invite Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={data.referralCode}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-violet-300 font-black font-mono tracking-widest text-sm outline-none"
              />
              <button
                onClick={() => copyToClipboard(data.referralCode, 'code')}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 rounded-xl text-[10px] font-bold uppercase tracking-wider active:scale-95 transition shadow-[0_0_15px_rgba(139,92,246,0.3)]"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-zinc-500 font-bold mb-2 uppercase tracking-widest">Your Invite Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-zinc-400 text-xs outline-none"
              />
              <button
                onClick={() => copyToClipboard(referralLink, 'link')}
                className="bg-white/10 hover:bg-white/20 text-white px-5 rounded-xl text-[10px] font-bold uppercase tracking-wider active:scale-95 transition border border-white/10"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

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
