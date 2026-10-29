'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type User = {
  id: string;
  name: string;
  phone: string;
  balance: number;
  country: string;
  currency: string;
  created_at: string;
  is_banned: boolean;
};

const COUNTRIES = [
  { code: 'ALL', label: 'All', flag: '🌍' },
  { code: 'UG', label: 'Uganda', flag: '🇺🇬' },
  { code: 'KE', label: 'Kenya', flag: '🇰🇪' },
  { code: 'RW', label: 'Rwanda', flag: '🇷🇼' },
  { code: 'ZM', label: 'Zambia', flag: '🇿🇲' },
  { code: 'CM', label: 'Cameroon', flag: '🇨🇲' },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCountry, setActiveCountry] = useState('ALL');

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users?t=' + Date.now(), { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [router]);

  // Filter users based on the selected country tab
  const filteredUsers = users.filter(u => 
    activeCountry === 'ALL' || u.country === activeCountry
  );

  return (
    <main className="min-h-screen bg-slate-900 pb-24">
      
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/admin" className="text-slate-400 text-xl active:scale-95 transition">←</Link>
          <h1 className="text-xl font-bold text-white">Manage Users</h1>
        </div>

        {/* Country Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setActiveCountry(c.code)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeCountry === c.code
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span>{c.flag}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 py-10">Loading users…</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-slate-800 rounded-2xl border border-slate-700">
            No users found for this country.
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div key={u.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-sm">{u.name}</h3>
                    {u.is_banned && (
                      <span className="text-[9px] bg-red-900 text-red-300 font-bold px-2 py-0.5 rounded-full">BANNED</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">{u.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold text-sm">
                    {u.currency} {Number(u.balance || 0).toLocaleString()}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-1">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
