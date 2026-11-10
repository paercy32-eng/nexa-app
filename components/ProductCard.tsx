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
  return (
    <div className="relative flex flex-col bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden shadow-lg transition hover:border-amber-500/40 group h-full">
      
      {/* Image Section */}
      <div className="relative w-full h-28 bg-[#0a0a0f] overflow-hidden">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition duration-700" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-black text-amber-500/20">C</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-[#12121a]/10 to-transparent"></div>

        {/* Cycle Badge */}
        <div className="absolute top-2 left-2 bg-amber-600/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm">
          {product.cycle_days} Days
        </div>
      </div>

      {/* Details Section */}
      <div className="px-3 pb-3 -mt-3 relative z-10 flex flex-col flex-1">
        
        {/* Title */}
        <h3 className="font-bold text-white text-[11px] leading-tight mb-2 line-clamp-2 h-8">
          {product.name}
        </h3>
        
        {/* Stacked Stats */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-[8px] text-zinc-500 font-bold uppercase">Daily</span>
            <span className="text-[9px] font-black text-amber-400">
              {currency} {Number(product.daily_return).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[8px] text-zinc-500 font-bold uppercase">Total</span>
            <span className="text-[9px] font-bold text-zinc-300">
              {currency} {(Number(product.daily_return) * product.cycle_days).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Price & Button */}
        <div className="mt-auto">
          <div className="text-[11px] font-black text-white mb-1.5">
            {currency} {Number(product.price).toLocaleString()}
          </div>
          <button
            type="button"
            onClick={() => onRent(product)}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white text-[9px] font-black py-2 rounded-lg active:scale-95 transition shadow-md disabled:opacity-60 flex items-center justify-center gap-1 uppercase tracking-wider"
          >
            {loading ? (
              <span className="w-2.5 h-2.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              'Invest'
            )}
          </button>
        </div>
      </div>
    </div>
  );
            }
