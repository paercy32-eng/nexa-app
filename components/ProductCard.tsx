'use client';

type Product = {
  id: string;
  name: string;
  price: number;
  cycle_days: number;
  daily_return: number;
  image_url?: string | null;
};

export default function ProductCard({
  product,
  currency,
  onRent,
  loading = false,
}: {
  product: Product;
  currency: string;
  onRent: (p: Product) => void;
  loading?: boolean;
}) {
  const totalReturn = Number(product.daily_return) * product.cycle_days;

  return (
    <div className="relative flex flex-col bg-[#12121a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl transition hover:border-amber-500/40 group">
      
      {/* 🍫 Full Width Image Section */}
      <div className="relative w-full h-48 bg-[#0a0a0f] overflow-hidden">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition duration-700" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-black text-amber-500/20">C</span>
          </div>
        )}
        
        {/* Gradient Fade at the bottom of the image to blend into the card */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-[#12121a]/20 to-transparent"></div>

        {/* Glowing Cycle Badge */}
        <div className="absolute top-3 left-3 bg-amber-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(217,119,6,0.6)] border border-amber-400/30">
          {product.cycle_days} Days Cycle
        </div>
      </div>

      {/* 🍫 Details Section */}
      <div className="px-5 pb-5 -mt-6 relative z-10">
        
        {/* Title */}
        <h3 className="font-black text-white text-xl leading-tight mb-4 drop-shadow-md">
          {product.name}
        </h3>
        
        {/* 3-Column Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-black/40 border border-white/5 rounded-xl p-2 text-center">
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Daily</div>
            <div className="text-xs font-black text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]">
              {currency} {Number(product.daily_return).toLocaleString()}
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-xl p-2 text-center">
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Total</div>
            <div className="text-xs font-bold text-zinc-300">
              {currency} {totalReturn.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-xl p-2 text-center">
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Price</div>
            <div className="text-xs font-black text-white">
              {currency} {Number(product.price).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Full-width Invest Button */}
        <button
          type="button"
          onClick={() => onRent(product)}
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white text-sm font-black py-4 rounded-xl active:scale-[0.98] transition shadow-[0_0_20px_rgba(217,119,6,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 uppercase tracking-wider"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Processing…
            </>
          ) : (
            'Invest Now'
          )}
        </button>
      </div>
    </div>
  );
}
