'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminGiftCodesPage() {
  const router = useRouter();
  const [quantity, setQuantity] = useState('10');
  const [loading, setLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<any[]>([]);
  const [error, setError] = useState('');

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setGeneratedCodes([]);

    try {
      const res = await fetch('/api/admin/giftcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: Number(quantity) }),
      });

      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate codes.');
      } else {
        setGeneratedCodes(data.codes);
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Code copied!');
  }

  return (
    <main className="min-h-screen bg-slate-900 pb-24">
      
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/admin" className="text-slate-400 text-xl active:scale-95 transition">←</Link>
          <h1 className="text-xl font-bold text-white">Gift Codes</h1>
        </div>
      </div>

      <div className="p-4">
        
        {/* Generator Form */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6 shadow-lg">
          <h2 className="text-white font-bold mb-4">Generate New Codes</h2>
          <form onSubmit={handleGenerate} className="flex gap-2">
            <input 
              type="number" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max="100"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold"
              placeholder="Quantity"
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-amber-600 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? '...' : 'Generate'}
            </button>
          </form>
          <p className="text-xs text-slate-400 mt-2">Generates random values between 50 and 700 UGX.</p>
          
          {error && <div className="mt-3 text-red-400 text-xs bg-red-400/10 p-2 rounded-lg border border-red-400/20">{error}</div>}
        </div>

        {/* Generated Codes List */}
        {generatedCodes.length > 0 && (
          <div>
            <h2 className="text-white font-bold mb-3 px-1">Generated Codes</h2>
            <div className="space-y-2">
              {generatedCodes.map((c) => (
                <div key={c.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="text-amber-400 font-mono font-bold text-lg">{c.code}</div>
                    <div className="text-xs text-slate-400">Value: UGX {c.amount}</div>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(c.code)}
                    className="bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-lg active:scale-95 transition"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
      }
