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
    <main className="min-h-screen flex flex-col bg-[#120804] selection:bg-purple-500/30">
      
      {/* 🍫 Hero Image Section (Matches Pringles style) */}
      <div className="relative w-full h-[35vh] min-h-[250px]">
        <img 
          src="https://images.unsplash.com/photo-1548907040-4baa42d10919?q=80&w=2000&auto=format&fit=crop" 
          alt="People enjoying chocolate" 
          className="w-full h-full object-cover" 
        />
        {/* Gradient Fade at the bottom to blend into the dark background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#120804] via-[#120804]/40 to-transparent"></div>
      </div>

      {/* Form Section */}
      <div className="flex-1 px-6 -mt-16 relative z-10 pb-10 w-full max-w-md mx-auto">
        
        <h1 className="text-3xl font-black text-white tracking-tight mb-8 drop-shadow-md">Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl focus-within:border-purple-500 transition overflow-hidden backdrop-blur-md">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-transparent pl-4 pr-2 py-4 text-purple-400 font-bold focus:outline-none text-sm appearance-none cursor-pointer border-r border-white/10"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} className="text-black bg-white">
                    {c.dial}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').replace(/^0+/, ''))}
                placeholder="Enter Username Number"
                className="w-full bg-transparent px-4 py-4 text-white placeholder-zinc-500 focus:outline-none text-sm font-medium"
                required
              />
            </div>
          </div>

          <div>
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl focus-within:border-purple-500 transition backdrop-blur-md">
              <div className="pl-4 text-zinc-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-transparent px-4 py-4 text-white placeholder-zinc-500 focus:outline-none pr-12 text-sm font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-zinc-400 hover:text-white transition"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-[11px] text-red-400 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20 text-center font-medium backdrop-blur-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 text-white font-bold py-4 rounded-full active:scale-[0.98] transition text-sm mt-4 shadow-[0_0_20px_rgba(168,85,247,0.4)] tracking-wider"
          >
            {loading ? 'LOGGING IN…' : 'LOGIN'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-zinc-400 font-medium">
          New here?{' '}
          <Link href="/register" className="text-purple-400 font-bold hover:text-purple-300 transition">
            Create Account
          </Link>
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
