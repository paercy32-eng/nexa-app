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
    const hasSeen = localStorage.getItem('hasSeenCadburyWelcome');
    
    if (!hasSeen) {
      // 🚨 Wait for the user's currency to load before showing the popup
      fetch('/api/me')
        .then(res => res.json())
        .then(data => {
          if (data?.user?.currency) {
            setCurrency(data.user.currency);
          }
          setIsOpen(true); // Only open after we have the data
        })
        .catch(() => {
          setIsOpen(true); // Fallback to open if API fails
        });
    }
  }, []);

  function handleClose() {
    localStorage.setItem('hasSeenCadburyWelcome', 'true');
    setIsOpen(false);
  }

  // Don't render until mounted to prevent flashing before redirect
  if (!isMounted) return null;

  // Hide on auth pages and admin
  if (pathname.includes('/login') || pathname.includes('/register') || pathname.includes('/admin')) {
    return null;
  }

  if (!isOpen) return null;

  // Calculate dynamic amounts based on user's currency
  const minDeposit = convertFromUGX(20000, currency);
  const minWithdraw = convertFromUGX(4000, currency);
  const welcomeBonus = convertFromUGX(2000, currency);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(217,119,6,0.3)] border border-amber-500/30 bg-[#12121a]">
        
        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-600/30 blur-3xl rounded-full"></div>

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
          
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.5)] mb-4">
            <span className="text-white font-black text-2xl">C</span>
          </div>

          <h2 className="text-xl font-black text-white mb-6 text-center">
            Welcome to Cadbury
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
              Withdraw Fee: <span className="text-white">16%</span>
            </div>
          </div>

          {/* Security Warning */}
          <p className="text-[10px] text-zinc-400 text-center font-medium leading-relaxed mb-6 px-2">
            Official customer service will <span className="text-red-400 font-bold">never</span> proactively ask for your password or screenshots of your deposits; please remain vigilant.
          </p>

          {/* Join Channel Button */}
          <a 
            href="https://whatsapp.com/channel/0029VbDiFDI3LdQdJfKehp1m"
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-[0_0_15px_rgba(217,119,6,0.3)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Join WhatsApp Channel
          </a>

        </div>
      </div>
    </div>
  );
}
