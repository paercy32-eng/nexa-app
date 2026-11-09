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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function loadMe() {
    const res = await fetch('/api/me?t=' + Date.now(), { cache: 'no-store' });
    if (res.status === 401) {
      router.replace('/login');
      return;
    }
    const data = await res.json();
    setMe(data.user);
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

  async function handleRent(product: Product) {
    if (pendingId) return;

    const balance = me?.balance ?? 0;
    const price = Number(product.price);
    const currency = me?.currency || 'UGX';

    if (balance < price) {
      setFeedback({
        ok: false,
        msg: `Insufficient balance. You need ${currency} ${(price - balance).toLocaleString()} more.`,
      });
      return;
    }

    setPendingId(product.id);
    setFeedback(null);

    try {
      const res = await fetch('/api/rentals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Server error (Status: ${res.status}). Please try again.`);
      }

      if (!res.ok) {
        setFeedback({ ok: false, msg: data?.error || 'Failed to invest.' });
        return;
      }

      setFeedback({ ok: true, msg: `🎉 You invested in ${product.name}!` });
      await loadMe();
    } catch (err: any) {
      setFeedback({ ok: false, msg: err.message || 'Network error.' });
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 bg-[#0a0a0f] text-zinc-100 animate-fade-in pb-24 selection:bg-amber-500/30">

      {feedback && (
        <div
          onClick={() => setFeedback(null)}
          className={`fixed top-3 left-3 right-3 z-[999999] p-3 rounded-xl text-xs font-semibold text-center border backdrop-blur-md cursor-pointer ${
            feedback.ok
              ? 'bg-amber-600/20 border-amber-500/40 text-amber-200'
              : 'bg-red-600/20 border-red-500/40 text-red-200'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8 px-1">
        <div className="flex items-center gap-3">
          {/* 👈 COCOA GRADIENT LOGO */}
          <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-900 rounded-xl shadow-[0_0_15px_rgba(217,119,6,0.5)] overflow-hidden">
            <span className="text-white font-black text-xl">C</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight tracking-widest uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">CADBURY</h1>
            {/* 👈 GOLD SUBTEXT */}
            <p className="text-[9px] text-amber-500 font-bold tracking-[0.2em] uppercase">Wealth</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Balance</div>
          <div className="text-sm font-bold text-zinc-200">
            {me?.currency || 'UGX'} {(me?.balance ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-sm font-bold text-zinc-200 tracking-wide uppercase">Available Assets</h2>
        {/* 👈 GOLD DIVIDER LINE */}
        <div className="h-px bg-gradient-to-r from-amber-500/50 to-transparent flex-1 ml-4"></div>
      </div>

      <div className="space-y-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            currency={me?.currency || 'UGX'}
            onRent={handleRent}
            loading={pendingId === p.id}
          />
        ))}
      </div>
    </main>
  );
      }
