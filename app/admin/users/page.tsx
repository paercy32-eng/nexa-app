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
  is_banned: boolean;
  created_at: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
};

// 🚨 Country Tabs Data
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // 🚨 State for the active country tab
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

  // 🚨 Filter users based on the selected country tab
  const filteredUsers = users.filter(u => 
    activeCountry === 'ALL' || u.country === activeCountry
  );

  return (
    <main className="min-h-screen bg-slate-900 pb-24">
      
      {/* Header & Country Tabs */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-400 text-xl active:scale-95 transition">←</Link>
            <h1 className="text-xl font-bold text-white">Manage Users</h1>
          </div>
          <div className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
            {filteredUsers.length} Users
          </div>
        </div>

        {/* Country Scrollable Tabs */}
        <div className="flex overflow-x-auto gap-2 px-4 pb-3 scrollbar-hide">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setActiveCountry(c.code)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                activeCountry === c.code
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:text-white'
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
            <button
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              className="w-full text-left bg-slate-800 border border-slate-700 rounded-2xl p-4 active:scale-[0.99] transition hover:bg-slate-750"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-sm">{u.name}</h3>
                  {u.is_banned && (
                    <span className="text-[9px] bg-red-900 text-red-300 font-bold px-2 py-0.5 rounded-full">BANNED</span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold text-sm">
                    {u.currency} {Number(u.balance || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>{u.phone}</span>
                <span className="bg-slate-900 px-2 py-1 rounded-md border border-slate-700">{u.country || 'N/A'}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* User Details Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefresh={() => {
            setSelectedUserId(null);
            loadUsers();
          }}
        />
      )}
    </main>
  );
}

// ==========================================
// USER DETAILS MODAL
// ==========================================
function UserDetailModal({ userId, onClose, onRefresh }: { userId: string, onClose: () => void, onRefresh: () => void }) {
  const [data, setData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  async function loadDetails() {
    try {
      setLoading(true);
      setErrorMsg('');
      
      const res = await fetch(`/api/admin/users/${userId}?t=` + Date.now());
      if (!res.ok) throw new Error(`Failed to load user (Status: ${res.status})`);
      
      const json = await res.json();
      if (!json.user) throw new Error('User data not found in response');
      setData(json);

      const prodRes = await fetch(`/api/admin/products?t=` + Date.now());
      const prodData = await prodRes.json();
      setProducts(prodData.products ?? []);
      
      if (prodData.products?.length > 0) {
        setSelectedProduct(prodData.products[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load user details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [userId]);

  async function handleAction(action: string, payload: any = {}) {
    setActionLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, ...payload }),
      });
      const json = await res.json();
      
      if (!res.ok) {
        setMsg(json.error || 'Action failed');
      } else {
        setMsg('✓ Action successful');
        setTimeout(() => {
          setMsg('');
          loadDetails(); // Reload data to show changes
        }, 1500);
      }
    } catch {
      setMsg('Something went wrong');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-red-500/50 p-6 rounded-3xl text-center max-w-sm w-full">
          <p className="text-red-400 font-bold mb-4">{errorMsg || 'Could not load user data.'}</p>
          <button onClick={onClose} className="bg-slate-800 text-white px-6 py-2 rounded-xl text-sm font-bold active:scale-95 transition">Close</button>
        </div>
      </div>
    );
  }

  const { user, activeModules, referrals } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              {user.name}
              {user.is_banned && <span className="text-[9px] bg-red-900 text-red-300 px-2 py-0.5 rounded-full">BANNED</span>}
            </div>
            <div className="text-xs text-slate-400">{user.phone} · {user.country}</div>
          </div>
          <button onClick={onClose} className="text-slate-500 text-2xl leading-none">×</button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl">
            <div className="text-[9px] text-slate-500 font-bold uppercase">Balance</div>
            <div className="text-emerald-400 font-bold text-sm mt-1">{user.currency} {Number(user.balance || 0).toLocaleString()}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl">
            <div className="text-[9px] text-slate-500 font-bold uppercase">Total Deposited</div>
            <div className="text-white font-bold text-sm mt-1">{user.currency} {Number(user.total_deposited || 0).toLocaleString()}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl">
            <div className="text-[9px] text-slate-500 font-bold uppercase">Active Products</div>
            <div className="text-white font-bold text-sm mt-1">{activeModules?.length || 0}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl">
            <div className="text-[9px] text-slate-500 font-bold uppercase">Direct Referrals</div>
            <div className="text-white font-bold text-sm mt-1">{referrals?.length || 0}</div>
          </div>
        </div>

        {/* Active Products List */}
        {activeModules && activeModules.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Active Assets</div>
            <div className="space-y-2">
              {activeModules.map((m: any) => (
                <div key={m.id} className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-white text-xs font-bold">{m.product_name}</div>
                    <div className="text-[10px] text-slate-400">Daily: {user.currency} {Number(m.daily_return).toLocaleString()}</div>
                  </div>
                  <div className="text-[9px] text-emerald-400 font-bold uppercase">{m.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referrals List */}
        {referrals && referrals.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Referred Users (Level 1)</div>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {referrals.map((r: any) => (
                <div key={r.id} className="bg-slate-800/50 border border-slate-700/50 p-2.5 rounded-lg flex justify-between items-center">
                  <span className="text-xs text-slate-300">{r.name}</span>
                  <span className="text-[10px] text-slate-500">{r.phone}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Sections */}
        <div className="space-y-4 pt-4 border-t border-slate-700">
          
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Adjust Balance (Use - to subtract)</div>
            <div className="flex gap-2 mb-2">
              <input type="number" placeholder="e.g. 5000" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" />
              <input type="text" placeholder="Reason" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
            <button onClick={() => { handleAction('adjust', { amount: Number(adjustAmount), reason: adjustReason }); setAdjustAmount(''); setAdjustReason(''); }} disabled={!adjustAmount || actionLoading} className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">
              Apply Balance Adjustment
            </button>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Grant Free Asset</div>
            <div className="flex gap-2">
              <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({Number(p.price).toLocaleString()})</option>
                ))}
              </select>
              <button onClick={() => handleAction('grant', { productId: selectedProduct })} disabled={!selectedProduct || actionLoading} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
                Grant
              </button>
            </div>
          </div>

          <button onClick={() => handleAction('ban')} disabled={actionLoading} className={`w-full py-3 rounded-xl text-xs font-bold transition ${user.is_banned ? 'bg-emerald-600 text-white' : 'bg-red-600/20 text-red-400 border border-red-600/30'}`}>
            {user.is_banned ? 'Unban Account' : 'Ban Account'}
          </button>

          {msg && <div className="text-center text-xs font-bold text-emerald-400 bg-emerald-400/10 py-2 rounded-lg">{msg}</div>}

        </div>
      </div>
    </div>
  );
            }
