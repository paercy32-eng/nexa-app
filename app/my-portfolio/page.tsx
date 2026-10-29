'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Rental = {
  id: string;
  product_name: string;
  price_paid: number;
  daily_profit: number;
  duration_days: number;
  days_remaining: number;
  total_earned: number;
  start_at: string;
  last_credit_at: string;
  status: string;
};

export default function MyPortfolioPage() {
  const router = useRouter();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/rentals/mine');
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      const data = await res.json();
      setRentals(data.rentals ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 animate-fade-in bg-[#0a0a0f] text-zinc-100 pb-24 selection:bg-violet-500/30">
      
      {/* Header */}
      <div className="px-1 mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">My Portfolio</h1>
        <p className="text-zinc-500 text-xs mt-1 font-medium uppercase tracking-wider">
          {rentals.length === 0
            ? 'Your active assets will appear here.'
            : `You have ${rentals.length} active asset${rentals.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {rentals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-70">
          <div className="mb-6 text-zinc-600">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 8L12 3L3 8V16L12 21L21 16V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M3 8L12 13L21 8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 21V13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <div className="text-zinc-500 font-bold text-lg tracking-wide uppercase">
            No active assets
          </div>
          <button onClick={() => router.push('/')} className="mt-6 text-xs text-violet-400 font-bold hover:text-violet-300 transition">
            Browse Assets &rarr;
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rentals.map((r) => {
            const progress =
              ((r.duration_days - r.days_remaining) / r.duration_days) * 100;

            const nextPayout = new Date(
              new Date(r.last_credit_at).getTime() + 24 * 60 * 60 * 1000
            );

            return (
              <div key={r.id} className="relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl group">
                
                {/* Subtle Glow Effect */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-2xl rounded-full group-hover:bg-cyan-500/10 transition"></div>

                <div className="relative z-10 flex items-start justify-between mb-5">
                  <div>
                    <div className="font-black text-white text-lg tracking-wide">
                      {r.product_name}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 font-medium uppercase tracking-wider">
                      Started {new Date(r.start_at).toLocaleDateString()}
                    </div>
                    {r.status === 'active' && (
                      <div className="text-[10px] text-violet-400 mt-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Next: {nextPayout.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border ${
                      r.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {r.status}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="relative z-10 grid grid-cols-3 gap-3 mb-5">
                  <Stat
                    label="Daily Yield"
                    value={`${r.daily_profit.toLocaleString()}`}
                    highlight="cyan"
                  />
                  <Stat
                    label="Total Earned"
                    value={`${r.total_earned.toLocaleString()}`}
                    highlight="violet"
                  />
                  <Stat label="Days Left" value={r.days_remaining.toString()} />
                </div>

                {/* Progress Bar */}
                <div className="relative z-10">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-bold mb-2 tracking-wider uppercase">
                    <span>Asset Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'cyan' | 'violet';
}) {
  return (
    <div className="rounded-2xl p-3 text-center bg-black/40 border border-white/5">
      <div className="text-[9px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`text-[11px] font-black ${
          highlight === 'cyan' ? 'text-cyan-400' : 
          highlight === 'violet' ? 'text-violet-400' : 
          'text-zinc-200'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
