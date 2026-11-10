'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    if (res.status === 401) { setIsAuthenticated(false); return; }
    const data = await res.json();
    setMe(data.user);
    setIsAuthenticated(true);
  }

  useEffect(() => {
    async function init() {
      // Check auth
      const meRes = await fetch('/api/me?t=' + Date.now(), { cache: 'no-store' });
      
      if (meRes.status === 401) {
        // Not logged in, show splash for 2 seconds then redirect to login
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
        return;
      }

      // Logged in, load data
      const meData = await meRes.json();
      setMe(meData.user);
      setIsAuthenticated(true);

      const prodRes = await fetch('/api/products?t=' + Date.now(), { cache: 'no-store' });
      const prodData = await prodRes.json();
      setProducts(prodData.products ?? []);
      setLoading(false);
    }
    init();
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

  // 🍫 SPLASH SCREEN (Shows while loading or redirecting to login)
  if (loading || !isAuthenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#3A1065]">
        <div className="flex flex-col items-center animate-fade-in">
          {/* Logo Container */}
          <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)] mb-6 overflow-hidden p-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Cadbury_logo.svg/1200px-Cadbury_logo.svg.png" 
              alt="Cadbury" 
              className="w-full object-contain"
              referrerPolicy="no-referrer" // 👈 Fixes the broken image
            />
          </div>
          
          <h1 className="text-3xl font-black text-white tracking-widest mb-12">CADBURY WEALTH</h1>
          
          {/* Loading Bar */}
          <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-white animate-pulse w-full"></div>
          </div>
          <p className="text-white/70 text-xs font-bold tracking-widest uppercase">Loading...</p>
        </div>
      </main>
    );
  }

  // 📱 DASHBOARD
  return (
    <main className="min-h-screen px-4 py-6 bg-[#120804] text-zinc-100 animate-fade-in pb-24 selection:bg-purple-500/30">
      {feedback && (
        <div onClick={() => setFeedback(null)} className={`fixed top-3 left-3 right-3 z-[999999] p-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border backdrop-blur-md cursor-pointer shadow-lg ${feedback.ok ? 'bg-purple-600/20 border-purple-500/40 text-purple-200' : 'bg-red-600/20 border-red-500/40 text-red-200'}`}>
          <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-white shrink-0 ${feedback.ok ? 'bg-purple-700' : 'bg-red-700'}`}>C</div>
          {feedback.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-8 px-1">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-700 to-purple-900 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.5)] overflow-hidden border border-purple-500/30">
            <span className="text-white font-black text-xl">C</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight tracking-widest uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">CADBURY</h1>
            <p className="text-[9px] text-amber-400 font-bold tracking-[0.2em] uppercase">Wealth</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Balance</div>
          <div className="text-sm font-bold text-amber-400">{me?.currency || 'UGX'} {(me?.balance ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-sm font-bold text-zinc-200 tracking-wide uppercase">Available Assets</h2>
        <div className="h-px bg-gradient-to-r from-purple-500/50 to-transparent flex-1 ml-4"></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} currency={me?.currency || 'UGX'} onRent={handleRent} loading={pendingId === p.id} />
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
