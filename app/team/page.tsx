'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function TeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(1);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/me?t=' + Date.now());
      if (res.status === 401) { router.replace('/login'); return; }
      const data = await res.json();
      setUser(data.user);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#120804]">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  const referralLink = `https://www.aurua.shop/register?ref=${user?.referral_code || ''}`;

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  }

  return (
    <main className="min-h-screen px-4 py-6 bg-[#120804] text-zinc-100 animate-fade-in pb-24 selection:bg-purple-500/30">
      <div className="px-1 mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Network Hub</h1>
        <p className="text-purple-400 font-bold text-[10px] mt-1 tracking-[0.2em] uppercase">Build your downline & earn</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[#1a0b1c] border border-purple-500/20 rounded-2xl p-4 text-center">
          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Commission</div>
          <div className="text-lg font-black text-amber-400">UGX {Number(user?.balance || 0).toLocaleString()}</div>
        </div>
        <div className="bg-[#1a0b1c] border border-purple-500/20 rounded-2xl p-4 text-center">
          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Team Size</div>
          {/* 👈 Changed to Users */}
          <div className="text-lg font-black text-purple-300">{user?.team_size || 0} Users</div>
        </div>
      </div>

      <div className="bg-[#1a0b1c] border border-purple-500/20 rounded-2xl p-4 mb-6">
        <div className="mb-4">
          <label className="block text-[9px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">Code</label>
          <div className="flex gap-2">
            <input readOnly value={user?.referral_code || 'CADB-XXXXX'} className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-bold tracking-widest" />
            <button onClick={() => copyToClipboard(user?.referral_code)} className="bg-gradient-to-r from-purple-700 to-purple-900 text-white font-bold px-4 rounded-xl text-xs active:scale-95 transition shadow-[0_0_15px_rgba(168,85,247,0.2)]">COPY</button>
          </div>
        </div>
        <div>
          <label className="block text-[9px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">Link</label>
          <div className="flex gap-2">
            <input readOnly value={referralLink} className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-zinc-400 text-xs truncate" />
            <button onClick={() => copyToClipboard(referralLink)} className="bg-zinc-800 text-white font-bold px-4 rounded-xl text-xs active:scale-95 transition border border-white/10">COPY</button>
          </div>
        </div>
      </div>

      <div className="flex bg-[#1a0b1c] p-1.5 rounded-2xl border border-purple-500/20 mb-6">
        <button onClick={() => setActiveTab(1)} className={`flex-1 py-2 rounded-xl text-center transition ${activeTab === 1 ? 'bg-gradient-to-r from-purple-700 to-purple-900 shadow-lg' : ''}`}>
          <div className={`text-[9px] font-bold uppercase ${activeTab === 1 ? 'text-white' : 'text-zinc-500'}`}>Level 1</div>
          <div className={`text-xs font-black mt-0.5 ${activeTab === 1 ? 'text-white' : 'text-amber-400'}`}>26% ({user?.l1_count || 0})</div>
        </button>
        <button onClick={() => setActiveTab(2)} className={`flex-1 py-2 rounded-xl text-center transition ${activeTab === 2 ? 'bg-gradient-to-r from-purple-700 to-purple-900 shadow-lg' : ''}`}>
          <div className={`text-[9px] font-bold uppercase ${activeTab === 2 ? 'text-white' : 'text-zinc-500'}`}>Level 2</div>
          <div className={`text-xs font-black mt-0.5 ${activeTab === 2 ? 'text-white' : 'text-amber-400'}`}>3% ({user?.l2_count || 0})</div>
        </button>
        <button onClick={() => setActiveTab(3)} className={`flex-1 py-2 rounded-xl text-center transition ${activeTab === 3 ? 'bg-gradient-to-r from-purple-700 to-purple-900 shadow-lg' : ''}`}>
          <div className={`text-[9px] font-bold uppercase ${activeTab === 3 ? 'text-white' : 'text-zinc-500'}`}>Level 3</div>
          <div className={`text-xs font-black mt-0.5 ${activeTab === 3 ? 'text-white' : 'text-amber-400'}`}>2% ({user?.l3_count || 0})</div>
        </button>
      </div>

      <div className="bg-[#1a0b1c] border border-purple-500/20 rounded-2xl p-6 text-center">
        <p className="text-zinc-400 text-sm mb-4">
          {/* 👈 Changed to Users */}
          You have <strong className="text-white">{activeTab === 1 ? user?.l1_count || 0 : activeTab === 2 ? user?.l2_count || 0 : user?.l3_count || 0}</strong> users in Level {activeTab}.
        </p>
        {/* 👈 Changed to View Team */}
        <button className="w-full border border-purple-500/30 bg-white/5 text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition hover:bg-white/10">View Team &gt;</button>
      </div>
      
      <BottomNav />
    </main>
  );
}
