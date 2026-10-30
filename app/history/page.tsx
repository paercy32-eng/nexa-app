'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  meta: any;
  created_at: string;
};

type Filter = 'all' | 'deposits' | 'income' | 'withdrawals';

export default function HistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/transactions/history?t=' + Date.now(), {
          cache: 'no-store',
        });

        if (res.status === 401) {
          router.replace('/login');
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to load: Status ${res.status}`);
        }

        const data = await res.json();
        setTransactions(data.transactions ?? []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Could not load history. Please try again.');
      } finally {
        setLoading(false); // 🚨 ALWAYS stop spinning
      }
    }
    load();
  }, [router]);

  function typeLabel(type: string): string {
    const map: Record<string, string> = {
      welcome: 'Welcome Bonus',
      welcome_bonus: 'Welcome Bonus',
      daily_checkin: 'Daily Check-in',
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      withdrawal_request: 'Withdrawal Request',
      withdrawal_refund: 'Withdrawal Refund',
      rental_earning: 'Daily Earning',
      rental: 'Investment',
      giftcard: 'Gift Card',
      referral: 'Referral Bonus',
      reward: 'Team Reward',
      admin_grant: 'Admin Grant',
      team_reward: 'Team Reward',
      spin_win: 'Spin & Win',
    };
    return map[type] || type.replace(/_/g, ' ');
  }

  function isCredit(type: string): boolean {
    return ['deposit', 'welcome_bonus', 'welcome', 'daily_checkin', 'giftcard', 'referral', 'reward', 'team_reward', 'rental_earning', 'withdrawal_refund', 'spin_win'].includes(type);
  }

  function matchesFilter(t: Transaction): boolean {
    if (filter === 'all') return true;
    if (filter === 'deposits') return t.type === 'deposit';
    if (filter === 'income') return ['daily_checkin', 'welcome_bonus', 'welcome', 'giftcard', 'referral', 'reward', 'team_reward', 'rental_earning', 'spin_win'].includes(t.type);
    if (filter === 'withdrawals') return t.type.startsWith('withdrawal');
    return true;
  }

  const filtered = transactions.filter(matchesFilter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 animate-fade-in pb-24 bg-[#0a0a0f] text-zinc-100 selection:bg-violet-500/30">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 px-1">
        <Link href="/profile" className="text-zinc-500 hover:text-white transition text-xl">←</Link>
        <h1 className="text-xl font-black text-white tracking-wide uppercase">History</h1>
      </div>

      {error ? (
        <div className="text-center py-20">
          <div className="text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20 mb-4 max-w-sm mx-auto text-sm">
            {error}
          </div>
          <button onClick={() => window.location.reload()} className="text-violet-400 text-xs font-bold underline">
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex bg-[#12121a] p-1.5 rounded-2xl border border-white/5 mb-6">
            {([
              { k: 'all', label: 'All' },
              { k: 'deposits', label: 'Deposits' },
              { k: 'income', label: 'Income' },
              { k: 'withdrawals', label: 'Withdraws' },
            ] as const).map((f) => (
              <button
                key={f.k}
                onClick={() => setFilter(f.k as Filter)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${
                  filter === f.k
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Transactions List */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 opacity-70">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 shadow-xl">
                <svg viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </div>
              <div className="text-zinc-400 text-sm font-bold tracking-wide uppercase mb-1">No transactions yet</div>
              <div className="text-zinc-600 text-[10px]">
                {filter === 'all' ? 'Your activity will appear here.' : `No ${filter} found.`}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => {
                const credit = isCredit(t.type);
                return (
                  <div
                    key={t.id}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-lg group hover:bg-white/10 transition"
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-lg ${
                      credit 
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
                        : 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 shadow-[0_0_10px_rgba(217,70,239,0.1)]'
                    }`}>
                      {credit ? '↓' : '↑'}
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-zinc-200 tracking-wide truncate">
                        {typeLabel(t.type)}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                        {new Date(t.created_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                    
                    {/* Amount & Status */}
                    <div className="text-right">
                      <div className={`text-sm font-black tracking-wider ${credit ? 'text-cyan-400' : 'text-fuchsia-400'}`}>
                        {credit ? '+' : '−'}{Number(t.amount).toLocaleString()}
                      </div>
                      <div className={`text-[9px] font-bold uppercase mt-1 tracking-wider ${
                        t.status === 'completed' ? 'text-emerald-500' :
                        t.status === 'pending' ? 'text-orange-400' :
                        'text-red-500'
                      }`}>
                        {t.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
                    }
