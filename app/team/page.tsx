'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Replace these with your actual API data if you fetch level stats
  const [activeTab, setActiveTab] = useState(1);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/me?t=' + Date.now());
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  const referralLink = `https://www.aurua.shop/register?ref=${user?.referral_code || ''}`;

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  }

  return (
    <main className="min-h-screen px-4 py-6 bg-[#0a0a0f] text-zinc-100 animate-fade-in pb-24 selection:bg-amber-500/30">
      
      {/* Header */}
      <div className="px-1 mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Network Hub</h1>
        <p className="text-amber-500 font-bold text-[10px] mt-1 tracking-[0.2em] uppercase">Build your downline & earn</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[#12121a] border border-white/5 rounded-2xl p-4 text-center">
          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Commission</div>
          <div className="text-lg font-black text-amber-500">UGX {Number(user?.balance || 0).toLocaleString()}</div>
        </div>
        <div className="bg-[#12121a] border border-white/5 rounded-2xl p-4 text-center">
          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Team Size</div>
          <div className="text-lg font-black text-cyan-400">{user?.team_size || 0} Members</div>
        </div>
      </div>

      {/* Invite Code & Link */}
      <div className="bg-[#12121a] border border-white/5 rounded-2xl p-4 mb-6">
        <div className="mb-4">
          <label className="block text-[9px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">Code</label>
          <div className="flex gap-2">
            <input 
              readOnly 
              value={user?.referral_code || 'NEXA-XXXXX'} 
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-bold tracking-widest"
            />
            <button onClick={() => copyToClipboard(user?.referral_code)} className="bg-gradient-to-r from-amber-600 to-amber-800 text-white font-bold px-4 rounded-xl text-xs active:scale-95 transition">
              COPY
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[9px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">Link</label>
          <div className="flex gap-2">
            <input 
              readOnly 
              value={referralLink} 
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-zinc-400 text-xs truncate"
            />
            <button onClick={() => copyToClipboard(referralLink)} className="bg-zinc-800 text-white font-bold px-4 rounded-xl text-xs active:scale-95 transition border border-white/10">
              COPY
            </button>
          </div>
        </div>
      </div>

      {/* Level Tabs (26% for Level 1) */}
      <div className="flex bg-[#12121a] p-1.5 rounded-2xl border border-white/5 mb-6">
        <button 
          onClick={() => setActiveTab(1)}
          className={`flex-1 py-2 rounded-xl text-center transition ${activeTab === 1 ? 'bg-gradient-to-r from-amber-600 to-amber-800 shadow-lg' : ''}`}
        >
          <div className={`text-[9px] font-bold uppercase ${activeTab === 1 ? 'text-white' : 'text-zinc-500'}`}>Level 1</div>
          <div className={`text-xs font-black mt-0.5 ${activeTab === 1 ? 'text-white' : 'text-amber-500'}`}>26% ({user?.l1_count || 0})</div>
        </button>
        <button 
          onClick={() => setActiveTab(2)}
          className={`flex-1 py-2 rounded-xl text-center transition ${activeTab === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-800 shadow-lg' : ''}`}
        >
          <div className={`text-[9px] font-bold uppercase ${activeTab === 2 ? 'text-white' : 'text-zinc-500'}`}>Level 2</div>
          <div className={`text-xs font-black mt-0.5 ${activeTab === 2 ? 'text-white' : 'text-amber-500'}`}>3% ({user?.l2_count || 0})</div>
        </button>
        <button 
          onClick={() => setActiveTab(3)}
          className={`flex-1 py-2 rounded-xl text-center transition ${activeTab === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-800 shadow-lg' : ''}`}
        >
          <div className={`text-[9px] font-bold uppercase ${activeTab === 3 ? 'text-white' : 'text-zinc-500'}`}>Level 3</div>
          <div className={`text-xs font-black mt-0.5 ${activeTab === 3 ? 'text-white' : 'text-amber-500'}`}>2% ({user?.l3_count || 0})</div>
        </button>
      </div>

      {/* Member List Area */}
      <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 text-center">
        <p className="text-zinc-400 text-sm mb-4">
          You have <strong className="text-white">{activeTab === 1 ? user?.l1_count || 0 : activeTab === 2 ? user?.l2_count || 0 : user?.l3_count || 0}</strong> members in Level {activeTab}.
        </p>
        <button className="w-full border border-white/10 bg-white/5 text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition hover:bg-white/10">
          View Member List &gt;
        </button>
      </div>

    </main>
  );
}
