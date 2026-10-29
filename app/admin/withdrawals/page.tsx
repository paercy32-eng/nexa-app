'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  recipient_phone: string;
  recipient_name: string;
  created_at: string;
  user: {
    name: string;
    phone: string;
    country: string;
  } | null;
};

type Filter = 'pending' | 'completed' | 'all';

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadWithdrawals() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals?status=${filter}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const data = await res.json();
      setWithdrawals(data.withdrawals ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawals();
  }, [router, filter]);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    const confirmMsg = action === 'approve' 
      ? 'Are you sure you want to approve this payout? The money will be sent immediately.'
      : 'Are you sure you want to reject this request? The user will be refunded.';
      
    if (!window.confirm(confirmMsg)) return;

    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id, action }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Action failed');
      } else {
        alert(`Withdrawal ${action === 'approve' ? 'Approved' : 'Rejected'} successfully.`);
        loadWithdrawals(); // Refresh the list
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
        <div className="flex items-center gap-3 mb-4">
          <Link href="/admin" className="text-slate-400 text-xl active:scale-95 transition">←</Link>
          <h1 className="text-xl font-bold text-white">Withdrawals</h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-slate-900/50 p-1 rounded-xl">
          {(['pending', 'completed', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-xs font-bold capitalize rounded-lg transition ${
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
        ) : withdrawals.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-slate-800 rounded-2xl border border-slate-700">
            No {filter} withdrawals found.
          </div>
        ) : (
          withdrawals.map((wd) => {
            const fee = Math.round(wd.amount * 0.16);
            const net = Math.round(wd.amount * 0.84);
            const isPending = wd.status === 'pending';

            return (
              <div key={wd.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                
                {/* User Info */}
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-700">
                  <div>
                    <h3 className="text-white font-bold text-sm">{wd.recipient_name}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">{wd.recipient_phone}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase">
                        {wd.user?.country || 'N/A'}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded uppercase ${
                        wd.gateway === 'pesajet' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-blue-900/50 text-blue-400'
                      }`}>
                        {wd.gateway}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-sm">{wd.currency} {wd.amount.toLocaleString()}</div>
                    <div className="text-[10px] text-red-400 mt-1">Fee: {wd.currency} {fee.toLocaleString()}</div>
                    <div className="text-[10px] text-emerald-400 font-bold mt-0.5">Net: {wd.currency} {net.toLocaleString()}</div>
                  </div>
                </div>

                {/* Actions */}
                {isPending ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAction(wd.id, 'reject')}
                      disabled={processingId === wd.id}
                      className="bg-red-500/20 text-red-400 font-bold py-2.5 rounded-xl text-xs active:scale-95 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(wd.id, 'approve')}
                      disabled={processingId === wd.id}
                      className="bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs active:scale-95 transition disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {processingId === wd.id ? (
                         <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Approve'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className={`text-xs font-bold uppercase ${
                      wd.status === 'completed' ? 'text-emerald-500' : 
                      wd.status === 'rejected' ? 'text-red-500' : 'text-slate-500'
                    }`}>
                      {wd.status}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
