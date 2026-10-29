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
  onRent,
}: {
  product: Product;
  onRent: (p: Product) => void;
}) {
  const totalReturn = Number(product.daily_return) * product.cycle_days;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex shadow-sm transition active:scale-[0.98]">
      
      {/* Image Section */}
      <div className="w-[45%] h-36 relative bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-black text-emerald-500/20">N</span>
          </div>
        )}
        
        {/* Cycle Badge */}
        <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm">
          {product.cycle_days} Days
        </div>
      </div>

      {/* Details Section */}
      <div className="w-[55%] p-3 flex flex-col justify-between bg-white">
        <div>
          <h3 className="font-bold text-slate-900 text-sm leading-tight mb-2 line-clamp-1">
            {product.name}
          </h3>
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500 font-medium">Daily</span>
              <span className="font-bold text-emerald-600">
                {Number(product.daily_return).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500 font-medium">Total</span>
              <span className="font-bold text-slate-900">
                {totalReturn.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <div className="text-xs font-extrabold text-slate-900 mb-2">
            {Number(product.price).toLocaleString()}
          </div>
          <button
            onClick={() => onRent(product)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-2 rounded-lg active:scale-95 transition"
          >
            Invest Now
          </button>
        </div>
      </div>
    </div>
  );
}
