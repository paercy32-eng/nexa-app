// lib/currency.ts

export const EXCHANGE_RATES: Record<string, number> = {
  UGX: 1,          // Base currency
  KES: 0.031,      // 1 UGX = 0.031 KES
  RWF: 0.35,       // 1 UGX = 0.35 RWF
  ZMW: 0.0047407,  // 1 UGX = 0.0047407 ZMW (1 ZMW = 210.94 UGX)
  XAF: 0.14,       // 1 UGX = 0.14 XAF
};

export function convertFromUGX(amountInUGX: number, targetCurrency: string): number {
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  return Math.round(amountInUGX * rate);
}

export function convertToUGX(amountInLocal: number, localCurrency: string): number {
  const rate = EXCHANGE_RATES[localCurrency] || 1;
  return Math.round(amountInLocal / rate);
}
