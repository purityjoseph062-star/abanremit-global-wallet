// Centralized DEMO deposit/withdrawal method config and quote math.
// Laravel recalculates all of this server-side; these values are illustrative.
import type { CurrencyCode, MovementMethod, MovementQuote } from "./domain/types";
import { CURRENCY_PRECISION, DEMO_RATES_TO_KES } from "./money";

export interface MethodConfig {
  id: MovementMethod;
  label: string;
  desc: string;
  eta: string;
  feePct: number;
  flatKes: number;
  minKes: number;
  maxKes: number;
}

export const DEPOSIT_METHODS: MethodConfig[] = [
  {
    id: "mobile_money",
    label: "Mobile money",
    desc: "Simulated STK-style prompt to a Kenyan number.",
    eta: "Usually instant",
    feePct: 0,
    flatKes: 0,
    minKes: 10,
    maxKes: 150_000,
  },
  {
    id: "bank",
    label: "Bank transfer",
    desc: "Pay a fictional demo account using your unique reference.",
    eta: "1–2 business days",
    feePct: 0,
    flatKes: 0,
    minKes: 500,
    maxKes: 1_000_000,
  },
  {
    id: "card",
    label: "Payment card",
    desc: "Test-only simulation. No card details are collected.",
    eta: "Instant once approved",
    feePct: 0.025,
    flatKes: 0,
    minKes: 100,
    maxKes: 250_000,
  },
  {
    id: "agent",
    label: "Agent deposit",
    desc: "Show your reference at an authorised agent (demo).",
    eta: "When the agent confirms",
    feePct: 0,
    flatKes: 0,
    minKes: 50,
    maxKes: 100_000,
  },
];

export const WITHDRAW_METHODS: MethodConfig[] = [
  {
    id: "mobile_money",
    label: "Mobile money",
    desc: "To a saved mobile-money number.",
    eta: "Within minutes",
    feePct: 0.005,
    flatKes: 30,
    minKes: 50,
    maxKes: 150_000,
  },
  {
    id: "bank",
    label: "Bank account",
    desc: "To a saved bank account.",
    eta: "Same or next business day",
    feePct: 0.01,
    flatKes: 50,
    minKes: 500,
    maxKes: 1_000_000,
  },
  {
    id: "agent",
    label: "Agent cash-out",
    desc: "Collect cash with a one-time code (demo).",
    eta: "Code valid 24 hours",
    feePct: 0.01,
    flatKes: 0,
    minKes: 100,
    maxKes: 70_000,
  },
];

const fromKes = (kes: number, c: CurrencyCode) =>
  Math.round((kes / DEMO_RATES_TO_KES[c]) * 10 ** CURRENCY_PRECISION[c]);

export function methodConfig(kind: "deposit" | "withdrawal", m: MovementMethod) {
  const cfg = (kind === "deposit" ? DEPOSIT_METHODS : WITHDRAW_METHODS).find((x) => x.id === m);
  if (!cfg) throw new Error("Method not available");
  return cfg;
}

/** Pure quote: deposit fee is deducted from the credit; withdrawal fee is added to the debit. */
export function quoteMovement(
  kind: "deposit" | "withdrawal",
  walletId: string,
  m: MovementMethod,
  amount: number,
  c: CurrencyCode,
): MovementQuote {
  const cfg = methodConfig(kind, m);
  const fee = Math.round(amount * cfg.feePct) + fromKes(cfg.flatKes, c);
  return {
    kind,
    walletId,
    method: m,
    currency: c,
    amount,
    fee,
    net: kind === "deposit" ? amount - fee : amount + fee,
    min: fromKes(cfg.minKes, c),
    max: fromKes(cfg.maxKes, c),
    eta: cfg.eta,
  };
}

export const maskDestination = (d: string) => (d.length <= 4 ? d : "•••• " + d.slice(-4));
export const KENYA_MOBILE = /^\+254(7|1)\d{8}$/;
