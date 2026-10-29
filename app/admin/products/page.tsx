'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Product = {
  id: string;
  name: string;
  price: number;
  cycle_days: number;
  daily_return: number;
  is_active: boolean;
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products?t=' + Date.now(), { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, [router]);

  async function toggleStatus(id: string, currentStatus: boolean) {
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id, action: 'toggle_status' }),
      });
      
      if (!res.ok) {
        alert('Failed to update status');
      } else {
        // Optimistically update the UI
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p))
        );
      }
    } catch {
      alert('Something went wrong');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 pb-24">
      
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/admin" className="text-slate-400 text-xl active:scale-95 transition">←</Link>
          <h1 className="text-xl font-bold text-white">Assets Management</h1>
        </div>
        <p className="text-slate-400 text-xs ml-8">Toggle products on or off for users</p>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 py-10">Loading assets...</div>
        ) : products.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-slate-800 rounded-2xl border border-slate-700">
            No products found.
          </div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center justify-between">
              
              <div>
                <h3 className={`font-bold text-sm ${p.is_active ? 'text-white' : 'text-slate-500 line-through'}`}>
                  {p.name}
                </h3>
                <div className="flex gap-3 text-[10px] mt-1">
                  <span className="text-slate-400">Cost: <span className="text-emerald-400 font-bold">UGX {Number(p.price).toLocaleString()}</span></span>
                  <span className="text-slate-400">Daily: <span className="text-emerald-400 font-bold">{Number(p.daily_return).toLocaleString()}</span></span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Cycle: {p.cycle_days} Days</div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => toggleStatus(p.id, p.is_active)}
                disabled={processingId === p.id}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  p.is_active ? 'bg-emerald-500' : 'bg-slate-600'
                } ${processingId === p.id ? 'opacity-50' : ''}`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    p.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>

            </div>
          ))
        )}
      </div>
    </main>
  );
}
