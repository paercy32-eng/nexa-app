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
    <div className="relative flex flex-col bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden shadow-xl transition hover:border-amber-500/40 group">
      
      {/* 🍫 Reduced Height Image Section */}
      <div className="relative w-full h-32 bg-[#0a0a0f] overflow-hidden">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition duration-700" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-black text-amber-500/20">C</span>
          </div>
        )}
        
        {/* Gradient Fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-[#12121a]/20 to-transparent"></div>

        {/* Smaller Glowing Cycle Badge */}
        <div className="absolute top-2 left-2 bg-amber-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-[0_0_10px_rgba(217,119,6,0.6)] border border-amber-400/30">
          {product.cycle_days} Days
        </div>
      </div>

      {/* 🍫 Compact Details Section */}
      <div className="px-4 pb-4 -mt-4 relative z-10">
        
        {/* Title */}
        <h3 className="font-black text-white text-base leading-tight mb-3 drop-shadow-md">
          {product.name}
        </h3>
        
        {/* Tighter 3-Column Stats Grid */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="bg-black/40 border border-white/5 rounded-lg py-1.5 px-1 text-center">
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Daily</div>
            <div className="text-[10px] font-black text-amber-400">
              {Number(product.daily_return).toLocaleString()}
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-lg py-1.5 px-1 text-center">
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Total</div>
            <div className="text-[10px] font-bold text-zinc-300">
              {totalReturn.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-lg py-1.5 px-1 text-center">
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Price</div>
            <div className="text-[10px] font-black text-white">
              {Number(product.price).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Compact Invest Button */}
        <button
          type="button"
          onClick={() => onRent(product)}
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white text-xs font-black py-2.5 rounded-lg active:scale-[0.98] transition shadow-[0_0_15px_rgba(217,119,6,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-1.5 uppercase tracking-wider"
        >
          {loading ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
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
