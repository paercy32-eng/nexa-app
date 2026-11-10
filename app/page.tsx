'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import BottomNav from '@/components/BottomNav';

type Me = { id: string; name: string; phone: string; balance: number; currency: string; };
type Product = { id: string; name: string; price: number; cycle_days: number; daily_return: number; };

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function loadMe() {
    const res = await fetch('/api/me?t=' + Date.now(), { cache: 'no-store' });
    if (res.status === 401) { setIsAuthenticated(false); setLoading(false); return; }
    const data = await res.json();
    setMe(data.user);
    setIsAuthenticated(true);
  }

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/me?t=' + Date.now(), { cache: 'no-store' });
      if (meRes.status === 401) { setIsAuthenticated(false); setLoading(false); return; }
      const meData = await meRes.json();
      setMe(meData.user);
      setIsAuthenticated(true);
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
      setFeedback({ ok: false, msg: `Insufficient balance. You need ${currency} ${(price - balance).toLocaleString()} more.` });
      return;
    }
    setPendingId(product.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/rentals/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { throw new Error(`Server error (Status: ${res.status}).`); }
      if (!res.ok) { setFeedback({ ok: false, msg: data?.error || 'Failed to invest.' }); return; }
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

  // ==========================================
  // 🍫 LANDING PAGE (Not logged in)
  // ==========================================
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen relative flex flex-col items-center justify-center px-6 overflow-hidden">
        
        {/* Crisp Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1549007994-cb92caefcdbf?q=80&w=2000&auto=format&fit=crop" 
            alt="Chocolate Background" 
            className="w-full h-full object-cover" 
          />
        </div>

        <div className="relative z-20 w-full max-w-sm text-center animate-fade-in mb-20">
          
          {/* Official Cadbury Logo (No broken text) */}
          <div className="flex justify-center mb-8">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Cadbury_logo.svg/1200px-Cadbury_logo.svg.png" 
              alt="" 
              className="h-20 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
            />
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-3 drop-shadow-lg">
            The Sweet Taste of <span className="text-amber-400">Success</span>
          </h1>
          
          <p className="text-zinc-200 text-sm mb-12 font-medium leading-relaxed drop-shadow-md">
            Invest in premium Cadbury assets and earn daily returns. Unwrap your financial future today.
          </p>

          {/* Single Join Button */}
          <Link 
            href="/register" 
            className="block w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-black text-lg py-4 rounded-2xl shadow-[0_0_30px_rgba(217,119,6,0.4)] active:scale-95 transition"
          >
            Join Cadbury
          </Link>
        </div>
      </main>
    );
  }

  // ==========================================
  // 📱 DASHBOARD (Logged in)
  // ==========================================
  return (
    <main className="min-h-screen px-4 py-6 bg-[#0a0a0f] text-zinc-100 animate-fade-in pb-24 selection:bg-amber-500/30">
      
      {feedback && (
        <div onClick={() => setFeedback(null)} className={`fixed top-3 left-3 right-3 z-[999999] p-3 rounded-xl text-xs font-semibold text-center border backdrop-blur-md cursor-pointer ${feedback.ok ? 'bg-amber-600/20 border-amber-500/40 text-amber-200' : 'bg-red-600/20 border-red-500/40 text-red-200'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-8 px-1">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-900 rounded-xl shadow-[0_0_15px_rgba(217,119,6,0.5)] overflow-hidden">
            <span className="text-white font-black text-xl">C</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight tracking-widest uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">CADBURY</h1>
            <p className="text-[9px] text-amber-500 font-bold tracking-[0.2em] uppercase">Wealth</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Balance</div>
          <div className="text-sm font-bold text-zinc-200">{me?.currency || 'UGX'} {(me?.balance ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-sm font-bold text-zinc-200 tracking-wide uppercase">Available Assets</h2>
        <div className="h-px bg-gradient-to-r from-amber-500/50 to-transparent flex-1 ml-4"></div>
      </div>

      <div className="space-y-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} currency={me?.currency || 'UGX'} onRent={handleRent} loading={pendingId === p.id} />
        ))}
      </div>

      {/* 👈 Bottom Nav only appears on the dashboard */}
      <BottomNav />
    </main>
  );
        }
