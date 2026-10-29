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
}: {
  product: Product;
  currency: string;
  onRent: (p: Product) => void;
}) {
  const totalReturn = Number(product.daily_return) * product.cycle_days;

  return (
    <div className="bg-[#12121a] border border-white/5 rounded-3xl overflow-hidden flex shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition hover:border-violet-500/30 group">
      
      {/* Image Section */}
      <div className="w-[45%] h-36 relative bg-[#0a0a0f] flex items-center justify-center overflow-hidden flex-shrink-0">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-black text-violet-500/20">N</span>
          </div>
        )}
        
        {/* Glowing Cycle Badge */}
        <div className="absolute top-2 left-2 bg-violet-600/80 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-[0_0_10px_rgba(139,92,246,0.5)]">
          {product.cycle_days} Days
        </div>
      </div>

      {/* Details Section */}
      <div className="w-[55%] p-4 flex flex-col justify-between bg-gradient-to-br from-[#12121a] to-[#0a0a0f]">
        <div>
          <h3 className="font-bold text-zinc-100 text-sm leading-tight mb-2 line-clamp-1 tracking-wide">
            {product.name}
          </h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-500 font-medium uppercase tracking-wider">Daily</span>
              <span className="font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                {currency} {Number(product.daily_return).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-500 font-medium uppercase tracking-wider">Total</span>
              <span className="font-bold text-zinc-300">
                {currency} {totalReturn.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-sm font-extrabold text-white mb-2">
            {currency} {Number(product.price).toLocaleString()}
          </div>
          <button
            onClick={() => onRent(product)}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[10px] font-bold py-2.5 rounded-xl active:scale-95 transition shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          >
            Invest Now
          </button>
        </div>
      </div>
    </div>
  );
}
