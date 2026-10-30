// lib/currency.ts

export const EXCHANGE_RATES: Record<string, number> = {
  UGX: 1,          // Base currency
  KES: 0.030,      // 1 UGX ≈ 0.030 KES (So 2000 UGX = 60 KES)
  RWF: 0.34,       // 1 UGX ≈ 0.34 RWF  (So 2000 UGX = 680 RWF)
  ZMW: 0.0048,     // 1 UGX ≈ 0.0048 ZMW (So 2000 UGX = 10 ZMW)
  XAF: 0.0016,     // 1 UGX ≈ 0.0016 XAF (So 2000 UGX = 3 XAF)
};

export function convertFromUGX(amountInUGX: number, targetCurrency: string): number {
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  return Math.round(amountInUGX * rate);
}

export function convertToUGX(amountInLocal: number, localCurrency: string): number {
  const rate = EXCHANGE_RATES[localCurrency] || 1;
  return Math.round(amountInLocal / rate);
}

export function convertToUGX(amountInLocal: number, localCurrency: string): number {
  const rate = EXCHANGE_RATES[localCurrency] || 1;
  return Math.round(amountInLocal / rate);
}
