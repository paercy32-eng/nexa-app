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
      msg: `🎉 You invested in ${product.name}! Daily return: ${Number(product.daily_return).toLocaleString()} ${me?.currency}`,
    });
    await loadMe();
    setTimeout(() => {
      setSelected(null);
      setFeedback(null);
    }, 2500);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-emerald-600 font-semibold">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 bg-slate-50 animate-fade-in pb-24">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-5 px-2">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-10 h-10 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-600/30 overflow-hidden">
            <span className="text-white font-black text-xl">N</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight tracking-tight">NEXA</h1>
            <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase">Capital</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500 font-medium">Welcome back</div>
          <div className="text-sm font-bold text-slate-900">{me?.name}</div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 mb-4 shadow-sm">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
          Available Balance ({me?.currency || 'UGX'})
        </div>
        <div className="text-4xl font-black text-slate-900 mb-1">
          {Number(me?.balance || 0).toLocaleString()}
        </div>
      </div>

      {/* 4 Circular Action Icons */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        
        <button onClick={() => setShowRecharge(true)} className="flex flex-col items-center gap-2 active:scale-95 transition">
          <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span className="text-xs font-semibold text-slate-700">Deposit</span>
        </button>

        <button onClick={() => setShowWithdraw(true)} className="flex flex-col items-center gap-2 active:scale-95 transition">
          <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><path d="M15 15h3" /></svg>
          </div>
          <span className="text-xs font-semibold text-slate-700">Withdraw</span>
        </button>

        <a href={CS_TELEGRAM_LINK} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 active:scale-95 transition">
          <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
          </div>
          <span className="text-xs font-semibold text-slate-700">Service</span>
        </a>

        <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 active:scale-95 transition">
          <div className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" /></svg>
          </div>
          <span className="text-xs font-semibold text-slate-700">Group</span>
        </a>

      </div>

      {/* Products List */}
      <h2 className="text-lg font-bold mb-4 px-2 text-slate-900">Investment Assets</h2>

      <div className="space-y-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onRent={handleRent} />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-lg font-bold text-gray-900">Confirm Investment</div>
            <div className="text-xs text-emerald-600 font-bold">{product.name}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs mb-4 space-y-2">
          <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-semibold">{currency} {price.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Daily return</span><span className="font-bold text-emerald-600">{currency} {Number(product.daily_return).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Your balance</span><span className="font-semibold">{currency} {balance.toLocaleString()}</span></div>
        </div>

        {shortfall > 0 && !feedback && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-3">You need {shortfall.toLocaleString()} more.</div>
        )}

        {feedback && (
          <div className={`p-3 rounded-xl text-sm mb-3 border ${feedback.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>{feedback.msg}</div>
        )}

        {!feedback?.ok && (
          <button onClick={go} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl" disabled={loading}>
            {loading ? 'Processing…' : `Invest ${price.toLocaleString()}`}
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-bold text-gray-900">Deposit {currency}</div>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        {!sent ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-500 font-bold mb-1">AMOUNT</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-3" required />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-bold mb-1">PHONE NUMBER</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-3" required />
            </div>
            {msg && <div className="text-red-500 text-sm">{msg}</div>}
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl">{loading ? 'Sending...' : 'Send Request'}</button>
          </form>
        ) : (
          <div className="text-center py-6 text-emerald-600 font-bold">Check your phone for the PIN prompt!</div>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-bold text-gray-900">Withdraw {currency}</div>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 font-bold mb-1">AMOUNT</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-3" required />
          </div>
          {msg && <div className="text-red-500 text-sm">{msg}</div>}
          <button type="submit" disabled={loading} className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl">{loading ? 'Submitting...' : 'Request Withdrawal'}</button>
        </form>
      </div>
    </div>
  );
        }
