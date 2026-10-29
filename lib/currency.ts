// lib/currency.ts

// 🚨 IMPORTANT: Update these rates to match your actual business rates.
// The numbers below represent how much 1 UGX is worth in that currency.
export const EXCHANGE_RATES: Record<string, number> = {
  UGX: 1,          // Base currency
  KES: 0.035,      // 1 UGX ≈ 0.035 KES
  RWF: 0.34,       // 1 UGX ≈ 0.34 RWF
  ZMW: 0.00067,    // 1 UGX ≈ 0.00067 ZMW
  XAF: 0.00016,    // 1 UGX ≈ 0.00016 XAF
};

/**
 * Converts an amount from UGX to the target currency.
 */
export function convertFromUGX(amountInUGX: number, targetCurrency: string): number {
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  return Math.round(amountInUGX * rate);
}

/**
 * Converts an amount from the user's currency back to UGX (useful for reporting).
 */
export function convertToUGX(amountInLocal: number, localCurrency: string): number {
  const rate = EXCHANGE_RATES[localCurrency] || 1;
  return Math.round(amountInLocal / rate);
}
