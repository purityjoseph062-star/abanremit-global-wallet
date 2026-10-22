import type { CurrencyCode } from "./domain/types";

export const CURRENCY_PRECISION: Record<CurrencyCode, number> = {
  KES: 2, UGX: 0, TZS: 0, USD: 2, GBP: 2, EUR: 2,
};

export function toMinor(major: number, c: CurrencyCode) {
  return Math.round(major * 10 ** CURRENCY_PRECISION[c]);
}
export function toMajor(minor: number, c: CurrencyCode) {
  return minor / 10 ** CURRENCY_PRECISION[c];
}
export function formatMoney(minor: number, c: CurrencyCode) {
  const p = CURRENCY_PRECISION[c];
  return new Intl.NumberFormat(undefined, {
    style: "currency", currency: c, minimumFractionDigits: p, maximumFractionDigits: p,
  }).format(toMajor(minor, c));
}

/** ILLUSTRATIVE demo rates (1 unit of key -> KES). Never live market data. */
export const DEMO_RATES_TO_KES: Record<CurrencyCode, number> = {
  KES: 1, UGX: 0.035, TZS: 0.05, USD: 129.5, GBP: 163.2, EUR: 140.1,
};
export const DEMO_SPREAD = 0.01;

export function demoRate(from: CurrencyCode, to: CurrencyCode) {
  if (from === to) return 1;
  const mid = DEMO_RATES_TO_KES[from] / DEMO_RATES_TO_KES[to];
  return +(mid * (1 - DEMO_SPREAD)).toFixed(6);
}

/** Demo fee schedule: percentage + flat (in minor units of source currency). */
export const DEMO_FEES = {
  wallet: { pct: 0, flatKes: 2000 },     // KES 20 flat
  bank: { pct: 0.01, flatKes: 5000 },
  mobile_money: { pct: 0.005, flatKes: 3000 },
} as const;

export function demoFee(route: keyof typeof DEMO_FEES, amount: number, c: CurrencyCode) {
  const f = DEMO_FEES[route];
  const flat = Math.round(toMinor(toMajor(f.flatKes, "KES") / DEMO_RATES_TO_KES[c], c));
  return Math.round(amount * f.pct) + flat;
}
