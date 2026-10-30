'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const COUNTRIES = [
  { code: 'UG', name: 'Uganda', dial: '+256', currency: 'UGX', flag: '🇺🇬', placeholder: '700123456' },
  { code: 'KE', name: 'Kenya', dial: '+254', currency: 'KES', flag: '🇰🇪', placeholder: '712345678' },
  { code: 'RW', name: 'Rwanda', dial: '+250', currency: 'RWF', flag: '🇷🇼', placeholder: '781234567' },
  { code: 'ZM', name: 'Zambia', dial: '+260', currency: 'ZMW', flag: '🇿🇲', placeholder: '971234567' },
  { code: 'CM', name: 'Cameroon', dial: '+237', currency: 'XAF', flag: '🇨🇲', placeholder: '671234567' },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [countryCode, setCountryCode] = useState('UG'); 
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: `${selectedCountry.dial}${phone.replace(/^0+/, '')}`,
          password,
          confirmPassword,
          referralCode: referralCode.trim() || undefined,
          country: selectedCountry.code,
          currency: selectedCountry.currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
      } else {
        router.replace('/');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center px-4 py-8 overflow-hidden bg-[#0a0a0f]">
      
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/80 z-10 backdrop-blur-sm"></div>
        <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80" alt="Nexa" className="w-full h-full object-cover opacity-40" />
      </div>

      <div className="w-full max-w-sm relative z-20">
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <span className="text-white font-black text-2xl">N</span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Join Nexa</h1>
          <p className="text-zinc-400 text-xs mt-1">Invest in high-yield assets.</p>
        </div>

        {/* Minimized Form Container */}
        <div className="bg-[#12121a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-3">
            
            <div>
              <label className="block text-[9px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">Country</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 transition text-sm appearance-none cursor-pointer"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} className="text-black bg-white">
                    {c.flag} {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">Phone Number</label>
              <div className="flex items-center bg-black/50 border border-white/10 rounded-xl focus-within:border-violet-500 transition overflow-hidden">
                <span className="pl-3 pr-2 text-zinc-300 text-sm font-bold select-none border-r border-white/10">
                  {selectedCountry.dial}
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').replace(/^0+/, ''))}
                  placeholder={selectedCountry.placeholder}
                  className="w-full bg-transparent px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition pr-12 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[9px] font-bold hover:text-white uppercase tracking-wider"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[9px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">
                Referral Code <span className="text-zinc-600 lowercase font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="NEXA-XXXXX"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition text-sm"
              />
            </div>

            {error && (
              <div className="text-[10px] text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20 text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl active:scale-[0.98] transition text-sm mt-2 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-center text-[10px] text-zinc-500 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-400 font-bold hover:text-violet-300 transition">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
              }
