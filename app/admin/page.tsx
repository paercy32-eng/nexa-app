'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Stats = {
  totalUsers: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalInvested: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function checkAuthAndLoadStats() {
      try {
        // Fetch stats to verify auth and get data
        const res = await fetch('/api/admin/stats');
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndLoadStats();
  }, [router]);

  async function logout() {
    document.cookie = 'nexa_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.replace('/admin/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 pb-24">
      
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Nexa Admin</h1>
          <p className="text-slate-400 text-xs mt-1">Platform Management</p>
        </div>
        <button 
          onClick={logout}
          className="text-xs font-bold text-red-400 bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20 active:scale-95 transition"
        >
          Log out
        </button>
      </div>

      <div className="p-4">
        
        {/* 🚨 Platform Overview Stats */}
        <h2 className="text-white font-bold mb-3 px-1 text-sm uppercase tracking-wider">Platform Overview</h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-12 h-12 bg-blue-500/10 rounded-full blur-xl"></div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Users</div>
            <div className="text-2xl font-black text-blue-400">
              {stats?.totalUsers.toLocaleString() || 0}
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl"></div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Deposited</div>
            <div className="text-lg font-black text-emerald-400 truncate">
              {stats?.totalDeposited.toLocaleString() || 0}
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-12 h-12 bg-violet-500/10 rounded-full blur-xl"></div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Invested</div>
            <div className="text-lg font-black text-violet-400 truncate">
              {stats?.totalInvested.toLocaleString() || 0}
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-12 h-12 bg-orange-500/10 rounded-full blur-xl"></div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Withdrawn</div>
            <div className="text-lg font-black text-orange-400 truncate">
              {stats?.totalWithdrawn.toLocaleString() || 0}
            </div>
          </div>

        </div>

        {/* Quick Links Grid */}
        <h2 className="text-white font-bold mb-3 px-1 text-sm uppercase tracking-wider">Management Menu</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          
          {/* Users */}
          <Link href="/admin/users" className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 active:scale-[0.98] transition hover:bg-slate-750">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div className="text-white font-bold text-sm">Users</div>
            <div className="text-slate-400 text-[10px]">Manage all accounts</div>
          </Link>

          {/* Deposits */}
          <Link href="/admin/deposits" className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 active:scale-[0.98] transition hover:bg-slate-750">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div className="text-white font-bold text-sm">Deposits</div>
            <div className="text-slate-400 text-[10px]">View incoming funds</div>
          </Link>

          {/* Withdrawals */}
          <Link href="/admin/withdrawals" className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 active:scale-[0.98] transition hover:bg-slate-750">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><path d="M15 15h3" /></svg>
            </div>
            <div className="text-white font-bold text-sm">Withdrawals</div>
            <div className="text-slate-400 text-[10px]">Approve payouts</div>
          </Link>

          {/* Products */}
          <Link href="/admin/products" className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 active:scale-[0.98] transition hover:bg-slate-750">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <div className="text-white font-bold text-sm">Assets</div>
            <div className="text-slate-400 text-[10px]">Manage investments</div>
          </Link>

        </div>

        {/* Info Banner */}
        <div className="bg-emerald-900/30 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-emerald-400 text-xs font-bold mb-1">Nexa Platform is Live</p>
          <p className="text-slate-400 text-[10px]">Remember to check the Withdrawals tab daily to approve user payouts.</p>
        </div>
      </div>
    </main>
  );
}
