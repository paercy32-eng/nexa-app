'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { convertFromUGX } from '@/lib/currency';

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currency, setCurrency] = useState('UGX');
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    
    // Check if the user has already seen the popup
    const hasSeen = localStorage.getItem('hasSeenNexaWelcome');
    if (!hasSeen) {
      // Fetch user currency to show correct limits
      fetch('/api/me').then(res => res.json()).then(data => {
        if (data?.user?.currency) setCurrency(data.user.currency);
      }).catch(() => {});

      // Add a small delay to ensure auth redirects finish
      setTimeout(() => {
        setIsOpen(true);
      }, 500);
    }
  }, []);

  function handleClose() {
    localStorage.setItem('hasSeenNexaWelcome', 'true');
    setIsOpen(false);
  }

  // Don't render until mounted to prevent flashing before redirect
  if (!isMounted) return null;

  // Hide on auth pages and admin
  if (pathname.includes('/login') || pathname.includes('/register') || pathname.includes('/admin')) {
    return null;
  }

  if (!isOpen) return null;

  // 🚨 Calculate dynamic amounts based on user's currency
  const minDeposit = convertFromUGX(2000, currency); // Assuming 2000 base min
  const minWithdraw = convertFromUGX(4000, currency); // 4000 base min
  const welcomeBonus = convertFromUGX(2000, currency); // 2000 base bonus

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.3)] border border-violet-500/30 bg-[#12121a]">
        
        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-600/30 blur-3xl rounded-full"></div>

        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Content */}
        <div className="relative z-10 p-6 flex flex-col items-center">
          
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)] mb-4">
            <span className="text-white font-black text-2xl">N</span>
          </div>

          <h2 className="text-xl font-black text-white mb-6 text-center">
            Welcome to Nexa Capital
          </h2>

          {/* Rules Box */}
          <div className="w-full border border-white/10 rounded-2xl overflow-hidden mb-6 bg-black/40">
            {/* Welcome Bonus Row (Highlighted) */}
            <div className="p-3 text-center text-xs font-bold text-emerald-400 border-b border-white/5 bg-emerald-500/5">
              Welcome Bonus: <span className="text-white">{currency} {welcomeBonus.toLocaleString()}</span>
            </div>
            {/* Min Deposit */}
            <div className="p-3 text-center text-xs font-bold text-zinc-300 border-b border-white/5">
              Min Deposit: <span className="text-white">{currency} {minDeposit.toLocaleString()}</span>
            </div>
            {/* Min Withdraw */}
            <div className="p-3 text-center text-xs font-bold text-zinc-300 border-b border-white/5">
              Min Withdraw: <span className="text-white">{currency} {minWithdraw.toLocaleString()}</span>
            </div>
            {/* Withdraw Fee */}
            <div className="p-3 text-center text-xs font-bold text-zinc-300">
              Withdraw Fee: <span className="text-white">13%</span>
            </div>
          </div>

          {/* Security Warning */}
          <p className="text-[10px] text-zinc-400 text-center font-medium leading-relaxed mb-6 px-2">
            Official customer service will <span className="text-red-400 font-bold">never</span> proactively ask for your password or screenshots of your deposits; please remain vigilant.
          </p>

          {/* Join Group Button */}
          <a 
            href="https://t.me/+oKe1TSwObNpiMzA0" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
            </svg>
            Join Group
          </a>

        </div>
      </div>
    </div>
  );
}
