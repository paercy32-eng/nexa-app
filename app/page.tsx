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
    // This will be connected to the backend purchase route later
    setFeedback({ ok: true, msg: `Ready to invest in ${product.name}!` });
    setTimeout(() => {
      setSelected(null);
      setFeedback(null);
    }, 2000);
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
        
        <button onClick={() => alert('Deposit modal coming soon!')} className="flex flex-col items-center gap-2 active:scale-95 transition">
          <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span className="text-xs font-semibold text-slate-700">Deposit</span>
        </button>

        <button onClick={() => alert('Withdraw modal coming soon!')} className="flex flex-col items-center gap-2 active:scale-95 transition">
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

      {/* Basic Purchase Modal Placeholder */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-white rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Investment</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.name}</p>
            {feedback && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm mb-4">{feedback.msg}</div>}
            <button onClick={() => confirmRent(selected)} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl">Invest {selected.price.toLocaleString()}</button>
            <button onClick={() => setSelected(null)} className="w-full mt-2 text-gray-500 text-sm">Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
}
