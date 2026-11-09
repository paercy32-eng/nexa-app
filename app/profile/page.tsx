'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { convertFromUGX } from '@/lib/currency';

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

const TELEGRAM_LINK = 'https://t.me/+oKe1TSwObNpiMzA0'; 
const CS_TELEGRAM_LINK = 'https://t.me/aaaaa56590'; 

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showBindAccount, setShowBindAccount] = useState(false);
  const [bindPhone, setBindPhone] = useState('');
  const [bindName, setBindName] = useState('');
  const [bindLoading, setBindLoading] = useState(false);
  const [bindMsg, setBindMsg] = useState('');

  const [canCheckIn, setCanCheckIn] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState('');

  const [showRecharge, setShowRecharge] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

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

  async function loadCheckinStatus() {
    try {
      const res = await fetch('/api/checkin?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCanCheckIn(data.canCheckIn === true);
      }
    } catch {}
  }

  useEffect(() => {
    loadMe();
    loadCheckinStatus();
  }, [router]);

  async function handleCheckIn() {
    setCheckinLoading(true);
    setCheckinMsg('');
    try {
      const res = await fetch('/api/checkin', { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok) {
        setCheckinMsg(data.error || 'Check-in failed.');
      } else {
        setCheckinMsg(data.message || 'You earned your bonus!');
        setCanCheckIn(false);
        setMe((prev) => {
          if (!prev) return prev;
          return { ...prev, balance: data.newBalance };
        });
      }
    } catch {
      setCheckinMsg('Something went wrong.');
    } finally {
      setCheckinLoading(false);
      setTimeout(() => setCheckinMsg(''), 4000);
    }
  }

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
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 animate-fade-in pb-24 bg-[#0a0a0f] text-zinc-100 selection:bg-amber-500/30">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 px-1">
        <div className="flex items-center gap-3">
          {/* COCOA GRADIENT LOGO */}
          <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-900 rounded-xl shadow-[0_0_15px_rgba(217,119,6,0.5)] flex items-center justify-center">
            <span className="text-white font-black text-xl">C</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight tracking-widest uppercase">CADBURY</h1>
            <p className="text-[9px] text-amber-500 font-bold tracking-[0.2em] uppercase">Profile</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Signed In</div>
          <div className="text-sm font-bold text-zinc-200">{me?.name}</div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-900/40 via-[#12121a] to-[#0a0a0f] border border-amber-500/20 rounded-3xl p-6 mb-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/10 blur-3xl rounded-full"></div>
        
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Available Balance</div>
        <div className="text-4xl font-black text-white mb-6">
          <span className="text-lg text-amber-500 mr-1">{me?.currency}</span>
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

      {/* 4 Action Icons */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <button onClick={() => setShowRecharge(true)} className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20 group-active:scale-95 transition shadow-[0_0_15px_rgba(217,119,6,0.1)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider group-hover:text-amber-500 transition">Deposit</span>
        </button>

        <button onClick={() => setShowWithdraw(true)} className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 group-active:scale-95 transition shadow-[0_0_15px_rgba(34,211,238,0.1)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider group-hover:text-cyan-400 transition">Withdraw</span>
        </button>

        <a href={CS_TELEGRAM_LINK} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 group-hover:bg-fuchsia-500/20 group-active:scale-95 transition shadow-[0_0_15px_rgba(217,70,239,0.1)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider group-hover:text-fuchsia-400 transition">Service</span>
        </a>

        <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 group-active:scale-95 transition shadow-[0_0_15px_rgba(99,102,241,0.1)]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" /></svg>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider group-hover:text-indigo-400 transition">Group</span>
        </a>
      </div>

      {/* Daily Check-in */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">Daily Check-in</div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">Claim free rewards</div>
          </div>
        </div>
        <button
          onClick={handleCheckIn}
          disabled={!canCheckIn || checkinLoading}
          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
            canCheckIn
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
          }`}
        >
          {checkinLoading ? '...' : canCheckIn ? 'Check In' : 'Claimed'}
        </button>
      </div>
      {checkinMsg && (
        <div className="mb-4 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-center">
          {checkinMsg}
        </div>
      )}

      {/* Compact Quick Actions */}
      <div className="space-y-2 mb-6">
        <button onClick={() => router.push('/history')} className="w-full bg-[#12121a] border border-white/5 rounded-2xl p-3 flex items-center gap-3 active:scale-[0.99] transition hover:bg-white/5 group">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"></path><circle cx="12" cy="12" r="9"></circle></svg>
          </div>
          <span className="text-xs font-bold text-zinc-300 tracking-wide uppercase">Transaction History</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto group-hover:text-white transition"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>

        <button onClick={() => setShowBindAccount(true)} className="w-full bg-[#12121a] border border-white/5 rounded-2xl p-3 flex items-center gap-3 active:scale-[0.99] transition hover:bg-white/5 group">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <div className="text-left flex-1">
             <div className="text-xs font-bold text-zinc-300 tracking-wide uppercase">Bind Account</div>
             <div className="text-[9px] text-zinc-500">{me?.bound_phone ? me.bound_phone : 'Not bound'}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto group-hover:text-white transition"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>

        {/* WHATSAPP CHANNEL LINK */}
        <a href="https://whatsapp.com/channel/0029Vb9HI2CKgsNtliNvbq0L" target="_blank" rel="noopener noreferrer" className="w-full bg-[#12121a] border border-white/5 rounded-2xl p-3 flex items-center gap-3 active:scale-[0.99] transition hover:bg-white/5 group">
          <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="text-left flex-1">
             <div className="text-xs font-bold text-zinc-300 tracking-wide uppercase">RWANDA & ZAMBIA TEAM</div>
             <div className="text-[9px] text-zinc-500">Join WhatsApp Channel</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto group-hover:text-white transition"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </a>
      </div>

      {/* Log out */}
      <button onClick={logout} className="w-full bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex items-center justify-center gap-2 active:scale-[0.98] transition hover:bg-red-500/10 group">
        <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </div>
        <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Log out</div>
      </button>

      {/* Bind Account Modal */}
      {showBindAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setShowBindAccount(false)}>
          <div className="w-full max-w-md bg-[#12121a] border border-white/10 rounded-3xl p-6 shadow-2xl my-auto" onClick={(e) => e.stopPropagation()}>
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
                <input type="tel" value={bindPhone} onChange={(e) => setBindPhone(e.target.value)} placeholder="0700123456" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-amber-500 transition" required />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">Full Registered Name</label>
                <input type="text" value={bindName} onChange={(e) => setBindName(e.target.value)} placeholder="As registered on mobile money" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-amber-500 transition" required />
              </div>

              {bindMsg && <div className="text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm">{bindMsg}</div>}

              <button type="submit" className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-bold py-4 rounded-xl mt-4 shadow-[0_0_15px_rgba(217,119,6,0.2)] disabled:opacity-50" disabled={bindLoading}>
                {bindLoading ? 'Saving…' : 'Bind Account'}
              </button>
            </form>
            <button onClick={() => setShowBindAccount(false)} className="w-full mt-3 border border-white/10 text-zinc-400 font-bold py-4 rounded-xl active:scale-[0.98] transition bg-transparent hover:bg-white/5">Cancel</button>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {showRecharge && (
        <RechargeModal
          currency={me?.currency || 'UGX'}
          onClose={() => setShowRecharge(false)}
          onSuccess={async () => {
            await loadMe();
            setShowRecharge(false);
          }}
        />
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <WithdrawModal
          balance={me?.balance ?? 0}
          currency={me?.currency || 'UGX'}
          onClose={() => setShowWithdraw(false)}
          onSuccess={async () => {
            await loadMe();
            setShowWithdraw(false);
          }}
        />
      )}
    </main>
  );
}

// ==========================================
// RECHARGE (DEPOSIT) MODAL 
// ==========================================
function RechargeModal({ currency, onClose, onSuccess }: any) {
  const minDeposit = convertFromUGX(20000, currency);
  const isManual = currency === 'ZMW' || currency === 'RWF'; 
  
  const [amount, setAmount] = useState(String(minDeposit));
  const [phone, setPhone] = useState('');
  const [manualTxId, setManualTxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  
  const [sent, setSent] = useState(false);
  const [reference, setReference] = useState('');
  const [txId, setTxId] = useState('');
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    fetch('/api/me').then(res => res.json()).then(data => { if (data?.user?.phone) setPhone(data.user.phone); });
  }, []);

  async function submit(e: any) {
    e.preventDefault();
    
    if (isManual && !manualTxId) {
      setMsg('Please enter the Transaction ID from your mobile money.');
      return;
    }

    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/deposits/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: Number(amount), 
          phone,
          transactionId: isManual ? manualTxId : undefined 
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setMsg(data.error);
      } else {
        setSent(true);
        
        if (isManual) {
          setMsg(data.message || 'Deposit submitted! Waiting for admin approval.');
        } else {
          setReference(data.reference);
          setTxId(data.transactionId);
          startPolling(data.reference, data.transactionId);
        }
      }
    } catch { 
      setMsg('Something went wrong.'); 
    } finally { 
      setLoading(false); 
    }
  }

  function startPolling(ref: string, transactionId: string) {
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      setPollCount(count);
      
      if (count >= 20) {
        clearInterval(interval);
        onClose();
        return;
      }

      try {
        const res = await fetch('/api/deposits/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: ref, transactionId }),
        });
        
        const data = await res.json();
        
        if (data.status === 'completed') {
          clearInterval(interval);
          onSuccess();
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setMsg('Payment failed or expired. Please try again.');
          setSent(false);
        }
      } catch (e) {}
    }, 3000);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md bg-[#12121a] border border-white/10 rounded-3xl p-6 shadow-2xl my-auto pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="text-xl font-black text-white">Deposit Funds</div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-2xl leading-none">×</button>
        </div>
        
        {!sent ? (
          <form onSubmit={submit} className="space-y-4">
            
            {isManual && (
              <div className="bg-[#1a1a24] border border-amber-500/30 rounded-xl p-4 text-xs space-y-2 mb-4">
                <div className="font-bold text-amber-500 mb-2 uppercase tracking-wider">Manual Deposit</div>
                
                {currency === 'RWF' ? (
                  <>
                    <div className="text-zinc-300">1. Dial <strong className="text-white">*182#</strong></div>
                    <div className="text-zinc-300">2. Send MTN to: <strong className="text-white select-all">+256 768 521 710</strong><br/><span className="text-zinc-400 text-[10px]">(Nabirye Flavia)</span></div>
                    <div className="text-zinc-300">   OR Airtel to: <strong className="text-white select-all">+256 749 507 321</strong><br/><span className="text-zinc-400 text-[10px]">(Naiema Katuramu)</span></div>
                  </>
                ) : (
                  <>
                    <div className="text-zinc-300">1. Dial <strong className="text-white">*115#</strong> (or your network's transfer code)</div>
                    <div className="text-zinc-300">2. Select International / Cross-Border Transfer if prompted</div>
                    <div className="text-zinc-300">3. Send to: <strong className="text-white select-all">+256 705 371 032</strong></div>
                    <div className="text-zinc-300">4. Name: <strong className="text-white">Ronald Lubwama</strong></div>
                  </>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">
                Amount ({currency})
              </label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                min={minDeposit}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white font-bold focus:outline-none focus:border-amber-500 transition" 
                required 
              />
              <div className="text-[10px] text-zinc-500 mt-2 font-medium">
                Minimum deposit: {currency} {minDeposit.toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-amber-500 transition" required />
            </div>

            {isManual && (
              <div>
                <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">Transaction ID</label>
                <input type="text" value={manualTxId} onChange={(e) => setManualTxId(e.target.value)} placeholder="e.g. TX123456789" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-amber-500 transition" required />
              </div>
            )}

            {msg && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">{msg}</div>}
            
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-bold py-4 rounded-xl mt-4 shadow-[0_0_15px_rgba(217,119,6,0.3)] disabled:opacity-50">
              {loading ? 'Sending Request...' : (isManual ? 'Submit Deposit' : 'Deposit Now')}
            </button>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              {isManual ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              )}
            </div>
            <div className="text-lg font-bold text-white mb-2">
              {isManual ? 'Deposit Submitted!' : 'Check your phone'}
            </div>
            <div className="text-sm text-zinc-400 mb-4">
              {isManual ? 'Admin will verify your Transaction ID and credit your account shortly.' : 'Enter your PIN to complete the deposit.'}
            </div>
            
            {!isManual && (
              <div className="text-xs text-amber-500 font-bold animate-pulse">
                Verifying payment... ({60 - pollCount * 3}s)
              </div>
            )}
            
            {isManual && (
               <button onClick={onClose} className="mt-6 w-full border border-white/10 text-zinc-300 font-bold py-4 rounded-xl hover:bg-white/5 transition">
                 Close
               </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// WITHDRAW MODAL 
// ==========================================
function WithdrawModal({ balance, currency, onClose, onSuccess }: any) {
  const minWithdraw = convertFromUGX(4000, currency);
  const isManual = currency === 'ZMW' || currency === 'RWF';
  
  const [amount, setAmount] = useState(String(minWithdraw));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const numAmount = Number(amount) || 0;
  const fee = Math.round(numAmount * 0.13);
  const net = Math.round(numAmount * 0.87);

  async function submit(e: any) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/withdrawals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(data.error);
      else {
        if (isManual) {
          setMsg('Withdrawal submitted! Admin will process it shortly.');
          setTimeout(() => onSuccess(), 2000);
        } else {
          onSuccess();
        }
      }
    } catch { setMsg('Something went wrong.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md bg-[#12121a] border border-white/10 rounded-3xl p-6 shadow-2xl my-auto pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-xl font-black text-white">Withdraw</div>
            <div className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-wider">Available: {currency} {Number(balance).toLocaleString()}</div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-2xl leading-none">×</button>
        </div>
        
        <form onSubmit={submit} className="space-y-4">
          
          {isManual && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-[10px] text-blue-300 text-center font-medium mb-2">
              Manual Withdrawal. Admin will send funds to your bound account number.
            </div>
          )}

          <div>
            <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">Amount ({currency})</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={minWithdraw} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white font-bold focus:outline-none focus:border-cyan-500 transition" required />
            <div className="text-[10px] text-zinc-500 mt-2 font-medium">Minimum withdraw: {currency} {minWithdraw.toLocaleString()}</div>
          </div>

          {numAmount > 0 && (
             <div className="bg-black/40 border border-white/5 rounded-2xl p-3 text-xs space-y-2">
                <div className="flex justify-between text-zinc-400"><span>Request Amount</span><span className="font-semibold text-white">{currency} {numAmount.toLocaleString()}</span></div>
                <div className="flex justify-between text-zinc-400"><span>Fee (13%)</span><span className="font-semibold text-red-400">-{currency} {fee.toLocaleString()}</span></div>
                <div className="flex justify-between border-t border-white/10 pt-2 mt-2"><span className="text-white font-bold">You Receive</span><span className="font-black text-emerald-400">{currency} {net.toLocaleString()}</span></div>
             </div>
          )}

          {msg && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">{msg}</div>}
          
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold py-4 rounded-xl mt-4 shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50">
            {loading ? 'Submitting...' : 'Confirm Withdrawal'}
          </button>
        </form>
      </div>
    </div>
  );
                                   }
