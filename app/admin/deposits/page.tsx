'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Deposit = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  reference: string;
  created_at: string;
  user: {
    name: string;
    phone: string;
    country: string;
  } | null;
};

type Filter = 'all' | 'pending' | 'completed' | 'failed';

export default function AdminDepositsPage() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  async function loadDeposits() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/deposits?status=${filter}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const data = await res.json();
      setDeposits(data.deposits ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeposits();
  }, [router, filter]);

  return (
    <main className="min-h-screen bg-slate-900 pb-24">
      
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/admin" className="text-slate-400 text-xl active:scale-95 transition">←</Link>
          <h1 className="text-xl font-bold text-white">Deposits</h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-slate-900/50 p-1 rounded-xl overflow-x-auto">
          {(['all', 'pending', 'completed', 'failed'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 px-3 text-xs font-bold capitalize rounded-lg transition whitespace-nowrap ${
                filter === f 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 py-10">Loading...</div>
        ) : deposits.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-slate-800 rounded-2xl border border-slate-700">
            No {filter} deposits found.
          </div>
        ) : (
          deposits.map((dep) => (
            <div key={dep.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
              
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-bold text-sm">{dep.user?.name || 'Unknown User'}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{dep.user?.phone}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase border border-slate-600">
                      {dep.user?.country || 'N/A'}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded uppercase border ${
                      dep.gateway === 'pesajet' 
                        ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50' 
                        : 'bg-blue-900/30 text-blue-400 border-blue-700/50'
                    }`}>
                      {dep.gateway}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-emerald-400 font-bold text-base">
                    {dep.currency} {Number(dep.amount).toLocaleString()}
                  </div>
                  <div className={`text-[10px] font-bold uppercase mt-1 ${
                    dep.status === 'completed' ? 'text-emerald-500' : 
                    dep.status === 'pending' ? 'text-orange-500' : 
                    'text-red-500'
                  }`}>
                    {dep.status}
                  </div>
                </div>
              </div>

              {/* Reference & Date */}
              <div className="pt-3 border-t border-slate-700 flex justify-between items-center text-[10px] text-slate-500">
                <div className="truncate max-w-[150px]">
                  Ref: {dep.reference}
                </div>
                <div>
                  {new Date(dep.created_at).toLocaleString()}
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </main>
  );
}
