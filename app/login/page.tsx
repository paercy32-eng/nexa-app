'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const COUNTRIES = [
  { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬', placeholder: '700123456' },
];

function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('UG');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: `${selectedCountry.dial}${phone.replace(/^0+/, '')}`,
          password,
        }),
      });

      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (!res.ok) {
          setError(data.error || 'Login failed');
        } else {
          router.replace('/');
          router.refresh();
        }
      } catch (parseError) {
        setError(`Server error (Status ${res.status}). Please try again.`);
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-[#120804] selection:bg-purple-500/30">
      
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/70 z-10 backdrop-blur-[3px]"></div>
        <img 
          src="https://images.unsplash.com/photo-1511381939415-e44015466834?q=80&w=2000&auto=format&fit=crop" 
          alt="Chocolate Background" 
          className="w-full h-full object-cover" 
        />
      </div>

      <div className="w-full max-w-sm relative z-20">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-5">
            {/* 👈 RELIABLE WIKIPEDIA LOGO */}
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Cadbury_logo.svg/1200px-Cadbury_logo.svg.png" 
              alt="Cadbury Logo" 
              className="h-16 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">Welcome Back</h1>
        </div>

        {/* Premium Glass Form Container */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-[10px] text-zinc-300 font-bold mb-1.5 uppercase tracking-widest">Country</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-purple-500 transition text-sm appearance-none cursor-pointer"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} className="text-black bg-white">
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-300 font-bold mb-1.5 uppercase tracking-widest">Phone Number</label>
              <div className="flex items-center bg-black/40 border border-white/10 rounded-xl focus-within:border-purple-500 transition overflow-hidden">
                <span className="pl-3 pr-2 text-zinc-200 text-sm font-bold select-none border-r border-white/10">
                  {selectedCountry.dial}
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').replace(/^0+/, ''))}
                  placeholder={selectedCountry.placeholder}
                  className="w-full bg-transparent px-3 py-3 text-white placeholder-zinc-500 focus:outline-none text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-300 font-bold mb-1.5 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition pr-12 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px] font-bold hover:text-white uppercase tracking-wider"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[11px] text-red-400 bg-red-500/20 rounded-lg px-3 py-2 border border-red-500/30 text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition text-sm mt-2 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-[11px] text-zinc-300 font-medium">
            Don't have an account?{' '}
            <Link href="/register" className="text-amber-400 font-bold hover:text-amber-300 transition">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#120804]">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
