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
  image_url: string | null;
  is_active: boolean;
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
      
      if (res.ok) {
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
        <p className="text-slate-400 text-xs ml-8">Edit prices, upload images, toggle status</p>
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
              
              <button 
                onClick={() => setEditingProduct(p)}
                className="flex items-center gap-3 text-left flex-1"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-600 font-bold text-xl">N</span>
                  )}
                </div>
                
                <div>
                  <h3 className={`font-bold text-sm ${p.is_active ? 'text-white' : 'text-slate-500 line-through'}`}>
                    {p.name}
                  </h3>
                  <div className="flex gap-3 text-[10px] mt-1 text-slate-400">
                    <span>Cost: <span className="text-emerald-400 font-bold">UGX {Number(p.price).toLocaleString()}</span></span>
                    <span>Daily: <span className="text-violet-400 font-bold">{Number(p.daily_return).toLocaleString()}</span></span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Cycle: {p.cycle_days} Days</div>
                </div>
              </button>

              {/* Toggle Switch */}
              <button
                onClick={() => toggleStatus(p.id, p.is_active)}
                disabled={processingId === p.id}
                className={`relative w-12 h-7 rounded-full transition-colors ml-4 flex-shrink-0 ${
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

      {/* Edit Modal */}
      {editingProduct && (
        <EditProductModal 
          product={editingProduct} 
          onClose={() => setEditingProduct(null)} 
          onSaved={() => {
            setEditingProduct(null);
            loadProducts();
          }} 
        />
      )}
    </main>
  );
}

// ==========================================
// EDIT PRODUCT MODAL
// ==========================================
function EditProductModal({ product, onClose, onSaved }: { product: Product, onClose: () => void, onSaved: () => void }) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [dailyReturn, setDailyReturn] = useState(String(product.daily_return));
  const [cycleDays, setCycleDays] = useState(String(product.cycle_days));
  const [imageUrl, setImageUrl] = useState(product.image_url);
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setMsg('File is too large. Select an image under 4MB.');
      return;
    }

    setUploading(true);
    setMsg('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setImageUrl(data.url);
      setMsg('✓ Image uploaded successfully');
    } catch (err: any) {
      setMsg(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_details',
          productId: product.id,
          name,
          price: Number(price),
          daily_return: Number(dailyReturn),
          cycle_days: Number(cycleDays),
          image_url: imageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg('✓ Saved successfully');
      setTimeout(onSaved, 1000);
    } catch (err: any) {
      setMsg(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="text-xl font-bold text-white">Edit Asset</div>
          <button onClick={onClose} className="text-slate-500 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Image Upload Section */}
          <div className="flex gap-4 items-center mb-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-slate-700">N</span>
              )}
            </div>
            <label className="flex-1">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              <div className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl text-xs text-center cursor-pointer transition">
                {uploading ? 'Uploading…' : 'Upload Image'}
              </div>
            </label>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Asset Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Price (UGX)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-emerald-400 font-bold text-sm focus:outline-none focus:border-emerald-500 transition" required />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Daily Return</label>
              <input type="number" value={dailyReturn} onChange={e => setDailyReturn(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-violet-400 font-bold text-sm focus:outline-none focus:border-violet-500 transition" required />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Cycle (Days)</label>
            <input type="number" value={cycleDays} onChange={e => setCycleDays(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition" required />
          </div>

          {msg && (
            <div className={`text-xs font-bold text-center p-3 rounded-xl border ${msg.startsWith('✓') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {msg}
            </div>
          )}

          <button type="submit" disabled={saving || uploading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-4 rounded-xl mt-2 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
