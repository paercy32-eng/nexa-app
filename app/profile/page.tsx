'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Me = {
  id: string;
  name: string;
  phone: string;
  balance: number;
  currency: string;
  total_deposited?: number;
  total_withdrawn?: number;
  bound_phone?: string;
  bound_name?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Bind Account State
  const [showBindAccount, setShowBindAccount] = useState(false);
  const [bindPhone, setBindPhone] = useState('');
  const [bindName, setBindName] = useState('');
  const [bindLoading, setBindLoading] = useState(false);
  const [bindMsg, setBindMsg] = useState('');

  async function loadMe() {
    const res = await fetch('/api/me?t=' + Date.now(), { cache: 'no-store' });
    if (res.status === 401) {
      router.replace('/login');
      return;
    }
    const data = await res.json();
    setMe(data.user);
    setBindPhone(data.user.bound_phone || '');
    setBindName(data.user.bound_name || '');
    setLoading(false);
  }

  useEffect(() => {
    loadMe();
  }, [router]);

  async function handleBindAccount(e: React.FormEvent) {
    e.preventDefault();
    setBindLoading(true);
    setBindMsg('');
    try {
      const res = await fetch('/api/user/bind-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bindPhone, fullName: bindName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBindMsg(data.error || 'Failed to bind account.');
      } else {
        setBindMsg('Account bound successfully!');
        setTimeout(() => {
          setShowBindAccount(false);
          setBindMsg('');
          loadMe();
        }, 1500);
      }
    } catch {
      setBindMsg('Something went wrong.');
    } finally {
      setBindLoading(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 animate-fade-in pb-24 bg-[#0a0a0f] text-zinc-100 selection:bg-violet-500/30">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-800 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.5)] flex items-center justify-center">
            <span className="text-white font-black text-xl">N</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight tracking-widest uppercase">NEXA</h1>
            <p className="text-[9px] text-violet-400 font-bold tracking-[0.2em] uppercase">Profile</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Signed In</div>
          <div className="text-sm font-bold text-zinc-200">{me?.name}</div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-900/40 via-[#12121a] to-[#0a0a0f] border border-violet-500/20 rounded-3xl p-6 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-3xl rounded-full"></div>
        
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Total Balance</div>
        <div className="text-4xl font-black text-white mb-6">
          <span className="text-lg text-violet-400 mr-1">{me?.currency}</span>
          {Number(me?.balance || 0).toLocaleString()}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-3">
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Deposited</div>
            <div className="text-sm font-bold text-cyan-400">
              {me?.currency} {Number(me?.total_deposited || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-3">
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Withdrawn</div>
            <div className="text-sm font-bold text-fuchsia-400">
              {me?.currency} {Number(me?.total_withdrawn || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions 2x2 Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        
        {/* Transaction History */}
        <button onClick={() => router.push('/history')} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center text-center gap-3 active:scale-[0.98] transition hover:bg-white/10 group">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"></path><circle cx="12" cy="12" r="9"></circle></svg>
          </div>
          <div className="text-xs font-bold text-zinc-200 uppercase tracking-wide">History</div>
        </button>

        {/* Bind Account */}
        <button onClick={() => setShowBindAccount(true)} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center text-center gap-3 active:scale-[0.98] transition hover:bg-white/10 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <div className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Bind Account</div>
          <div className="text-[9px] text-zinc-500 truncate w-full px-1">{me?.bound_phone ? me.bound_phone : 'Not bound'}</div>
        </button>

        {/* Rewards */}
        <button onClick={() => router.push('/rewards')} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center text-center gap-3 active:scale-[0.98] transition hover:bg-white/10 group">
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 group-hover:scale-110 transition">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10l1 7H6L7 4z"></path><path d="M5 11h14"></path></svg>
          </div>
          <div className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Rewards</div>
        </button>

        {/* Log out */}
        <button onClick={logout} className="bg-red-500/5 backdrop-blur-xl border border-red-500/10 rounded-3xl p-5 flex flex-col items-center justify-center text-center gap-3 active:scale-[0.98] transition hover:bg-red-500/10 group">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </div>
          <div className="text-xs font-bold text-red-400 uppercase tracking-wide">Log out</div>
        </button>
      </div>

      {/* Bind Account Modal */}
      {showBindAccount && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowBindAccount(false)}>
          <div className="w-full max-w-md bg-[#12121a] border-t border-white/10 rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-xl font-black text-white">Bind Wallet</div>
                <div className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-wider">Secure your payouts</div>
              </div>
              <button onClick={() => setShowBindAccount(false)} className="text-zinc-500 hover:text-white transition text-2xl leading-none">×</button>
            </div>
            
            <form onSubmit={handleBindAccount} className="space-y-4">
              <div>
                <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">Mobile Money Number</label>
                <input type="tel" value={bindPhone} onChange={(e) => setBindPhone(e.target.value)} placeholder="0700123456" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-violet-500 transition" required />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">Full Registered Name</label>
                <input type="text" value={bindName} onChange={(e) => setBindName(e.target.value)} placeholder="As registered on mobile money" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-violet-500 transition" required />
              </div>

              {bindMsg && <div className="text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3 text-sm">{bindMsg}</div>}

              <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-4 rounded-xl mt-4 shadow-[0_0_15px_rgba(139,92,246,0.2)] disabled:opacity-50" disabled={bindLoading}>
                {bindLoading ? 'Saving…' : 'Bind Account'}
              </button>
            </form>
            <button onClick={() => setShowBindAccount(false)} className="w-full mt-3 border border-white/10 text-zinc-400 font-bold py-4 rounded-xl active:scale-[0.98] transition bg-transparent hover:bg-white/5">Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
        }
