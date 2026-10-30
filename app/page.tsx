'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';

type Me = {
  id: string;
  name: string;
  phone: string;
  balance: number;
  currency: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  cycle_days: number;
  daily_return: number;
};

const TELEGRAM_LINK = 'https://t.me/'; 
const CS_TELEGRAM_LINK = 'https://t.me/'; 

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

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
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/me?t=' + Date.now(), { cache: 'no-store' });
      if (meRes.status === 401) {
        router.replace('/login');
        return;
      }
      const meData = await meRes.json();
      setMe(meData.user);

      const prodRes = await fetch('/api/products?t=' + Date.now(), { cache: 'no-store' });
      const prodData = await prodRes.json();
      setProducts(prodData.products ?? []);

      setLoading(false);
    }
    load();
  }, [router]);

  function handleRent(product: Product) {
    setFeedback(null);
    setSelected(product);
  }

  async function confirmRent(product: Product) {
    const res = await fetch('/api/rentals/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id }),
    });
    const data = await res.json();

    if (!res.ok) {
      setFeedback({ ok: false, msg: data.error || 'Failed to invest.' });
      return;
    }

    setFeedback({
      ok: true,
      msg: `🎉 You invested in ${product.name}! Daily return: ${me?.currency} ${Number(product.daily_return).toLocaleString()}`,
    });
    await loadMe();
    setTimeout(() => {
      setSelected(null);
      setFeedback(null);
    }, 2500);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 bg-[#0a0a0f] text-zinc-100 animate-fade-in pb-24 selection:bg-violet-500/30">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-800 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.5)] overflow-hidden">
            <span className="text-white font-black text-xl">N</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight tracking-widest uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">NEXA</h1>
            <p className="text-[9px] text-violet-400 font-bold tracking-[0.2em] uppercase">Capital</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Welcome</div>
          <div className="text-sm font-bold text-zinc-200">{me?.name}</div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 shadow-2xl">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-600/30 blur-3xl rounded-full"></div>
        <div className="relative z-10">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
            Available Balance
          </div>
          <div className="text-5xl font-black text-white tracking-tight mb-1">
            <span className="text-xl text-violet-400 mr-1">{me?.currency || 'UGX'}</span>
            {Number(me?.balance || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 4 Circular Action Icons */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        
        <button onClick={() => setShowRecharge(true)} className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/20 group-active:scale-95 transition shadow-[0_0_15px_rgba(139,92,246,0.1)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider group-hover:text-violet-400 transition">Deposit</span>
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

      {/* Products List */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-sm font-bold text-zinc-200 tracking-wide uppercase">Available Assets</h2>
        <div className="h-px bg-gradient-to-r from-violet-500/50 to-transparent flex-1 ml-4"></div>
      </div>

      <div className="space-y-4">
        {products.map((p) => (
          <ProductCard 
            key={p.id} 
            product={p} 
            currency={me?.currency || 'UGX'} 
            onRent={handleRent} 
          />
        ))}
      </div>

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

      {/* Purchase Modal */}
      {selected && (
        <RentModal
          product={selected}
          balance={me?.balance ?? 0}
          currency={me?.currency || 'UGX'}
          feedback={feedback}
          onClose={() => {
            setSelected(null);
            setFeedback(null);
          }}
          onConfirm={confirmRent}
        />
      )}
    </main>
  );
}

// ==========================================
// MODALS (Dark Theme)
// ==========================================

function RentModal({ product, balance, currency, feedback, onClose, onConfirm }: any) {
  const [loading, setLoading] = useState(false);
  const price = Number(product.price);
  const shortfall = price - balance;

  async function go() {
    setLoading(true);
    await onConfirm(product);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#12121a] border border-white/10 rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xl font-black text-white">Confirm Investment</div>
            <div className="text-xs text-violet-400 font-bold mt-1 uppercase tracking-wider">{product.name}</div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-2xl leading-none">×</button>
        </div>

        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-xs mb-6 space-y-3">
          <div className="flex justify-between items-center"><span className="text-zinc-500 font-medium">Asset Price</span><span className="font-bold text-white text-sm">{currency} {price.toLocaleString()}</span></div>
          <div className="flex justify-between items-center"><span className="text-zinc-500 font-medium">Daily Yield</span><span className="font-bold text-cyan-400 text-sm">{currency} {Number(product.daily_return).toLocaleString()}</span></div>
          <div className="flex justify-between items-center"><span className="text-zinc-500 font-medium">Your Balance</span><span className="font-bold text-zinc-300 text-sm">{currency} {balance.toLocaleString()}</span></div>
        </div>

        {shortfall > 0 && !feedback && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4 text-center">
            You need {currency} {shortfall.toLocaleString()} more to invest.
          </div>
        )}

        {feedback && (
          <div className={`p-4 rounded-xl text-sm mb-4 text-center font-medium border ${feedback.ok ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {feedback.msg}
          </div>
        )}

        {!feedback?.ok && (
          <button onClick={go} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50" disabled={loading}>
            {loading ? 'Processing…' : `Invest ${currency} ${price.toLocaleString()}`}
          </button>
        )}
      </div>
    </div>
  );
}

function RechargeModal({ currency, onClose, onSuccess }: any) {
  const [amount, setAmount] = useState('20000');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch('/api/me').then(res => res.json()).then(data => { if (data?.user?.phone) setPhone(data.user.phone); });
  }, []);

  async function submit(e: any) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/deposits/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), phone }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(data.error);
      else { setSent(true); setTimeout(onSuccess, 3000); }
    } catch { setMsg('Something went wrong.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#12121a] border-t border-white/10 rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="text-xl font-black text-white">Deposit Funds</div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-2xl leading-none">×</button>
        </div>
        
        {!sent ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">Amount ({currency})</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white font-bold focus:outline-none focus:border-violet-500 transition" required />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-violet-500 transition" required />
            </div>
            {msg && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">{msg}</div>}
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-4 rounded-xl mt-4 shadow-[0_0_15px_rgba(139,92,246,0.2)] disabled:opacity-50">
              {loading ? 'Sending Request...' : 'Initiate Deposit'}
            </button>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            </div>
            <div className="text-lg font-bold text-white mb-2">Check your phone</div>
            <div className="text-sm text-zinc-400">Enter your PIN to complete the deposit.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function WithdrawModal({ balance, currency, onClose, onSuccess }: any) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

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
      else onSuccess();
    } catch { setMsg('Something went wrong.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#12121a] border-t border-white/10 rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-xl font-black text-white">Withdraw</div>
            <div className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-wider">Available: {currency} {Number(balance).toLocaleString()}</div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-2xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">Amount ({currency})</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white font-bold focus:outline-none focus:border-cyan-500 transition" required />
          </div>
          {msg && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">{msg}</div>}
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold py-4 rounded-xl mt-4 shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50">
            {loading ? 'Submitting...' : 'Request Withdrawal'}
          </button>
        </form>
      </div>
    </div>
  );
            }
