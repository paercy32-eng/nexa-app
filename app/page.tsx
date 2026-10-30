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

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

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
      <div className="flex items-center justify-between mb-8 px-1">
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
// RENT MODAL (For purchasing assets)
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
