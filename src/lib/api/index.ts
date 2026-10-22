// Centralized typed API layer. Components call `api.*` only — never mock data directly.
// VITE_API_MODE=demo (default) uses DemoApiAdapter; VITE_API_MODE=laravel uses /api/v1.
import type {
  ApiError, Beneficiary, CashInRequest, CurrencyCode, Quote, Transaction, TransferRequest, Wallet,
} from "../domain/types";
import { demoFee, demoRate, toMinor, toMajor } from "../money";
import { currentUser, getState, setState } from "../demo/store";

export interface ApiAdapter {
  mode: "demo" | "laravel";
  wallets: { list(): Promise<Wallet[]>; lookup(number: string): Promise<{ number: string; maskedName: string; currency: CurrencyCode } | null> };
  beneficiaries: {
    list(): Promise<Beneficiary[]>;
    create(b: Omit<Beneficiary, "id" | "ownerId" | "verified">): Promise<Beneficiary>;
    remove(id: string): Promise<void>;
  };
  transfers: { quote(walletId: string, beneficiaryId: string, amount: number): Promise<Quote>; create(r: TransferRequest): Promise<Transaction> };
  transactions: { list(): Promise<Transaction[]> };
  agents: { cashIn(r: CashInRequest): Promise<Transaction> };
}

export class ApiException extends Error {
  constructor(public error: ApiError) { super(error.message); }
}

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const fail = (code: string, message: string): never => { throw new ApiException({ code, message, correlationId: rid("corr") }); };
const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

/** Simulates the Laravel server. Server-side rules (fees, balances, idempotency) live here, not in screens. */
export class DemoApiAdapter implements ApiAdapter {
  mode = "demo" as const;
  private quotes = new Map<string, Quote>();
  constructor(private latency = 450) {}
  private me() { const u = currentUser(); if (!u) fail("UNAUTHENTICATED", "Sign in with a demo persona."); return u!; }

  wallets = {
    list: async () => { await delay(this.latency); const u = this.me(); return getState().wallets.filter((w) => w.ownerId === u.id); },
    lookup: async (number: string) => {
      await delay(this.latency);
      const w = getState().wallets.find((x) => x.number === number);
      if (!w) return null;
      const owner = getState().users.find((u) => u.id === w.ownerId)!;
      const masked = owner.name.split(" ").map((p, i) => (i === 0 ? p : p[0] + "***")).join(" ");
      return { number: w.number, maskedName: masked, currency: w.currency };
    },
  };

  beneficiaries = {
    list: async () => { await delay(this.latency); const u = this.me(); return getState().beneficiaries.filter((b) => b.ownerId === u.id); },
    create: async (b: Omit<Beneficiary, "id" | "ownerId" | "verified">) => {
      await delay(this.latency); const u = this.me();
      const nb: Beneficiary = { ...b, id: rid("b"), ownerId: u.id, verified: b.type === "wallet" };
      setState((s) => ({ ...s, beneficiaries: [...s.beneficiaries, nb] }));
      return nb;
    },
    remove: async (id: string) => {
      await delay(this.latency); const u = this.me();
      const b = getState().beneficiaries.find((x) => x.id === id);
      if (!b || b.ownerId !== u.id) fail("NOT_FOUND", "Beneficiary not found.");
      setState((s) => ({ ...s, beneficiaries: s.beneficiaries.filter((x) => x.id !== id) }));
    },
  };

  transfers = {
    quote: async (walletId: string, beneficiaryId: string, amount: number) => {
      await delay(this.latency); const u = this.me(); const s = getState();
      const w = s.wallets.find((x) => x.id === walletId && x.ownerId === u.id) ?? fail("NOT_FOUND", "Wallet not found.");
      const b = s.beneficiaries.find((x) => x.id === beneficiaryId && x.ownerId === u.id) ?? fail("NOT_FOUND", "Recipient not found.");
      if (amount <= 0) fail("VALIDATION", "Amount must be greater than zero.");
      const fee = demoFee(b.type, amount, w.currency);
      const rate = demoRate(w.currency, b.currency);
      const destAmount = toMinor(toMajor(amount, w.currency) * rate, b.currency);
      const q: Quote = { id: rid("q"), sourceCurrency: w.currency, destCurrency: b.currency, amount, fee, rate, destAmount, totalDebit: amount + fee, expiresAt: new Date(Date.now() + 60_000).toISOString(), illustrative: true };
      this.quotes.set(q.id, q);
      return q;
    },
    create: async (r: TransferRequest) => {
      const s0 = getState();
      const existing = s0.idempotency[r.idempotencyKey];
      if (existing) return s0.transactions.find((t) => t.id === existing)!; // idempotent replay
      const u = this.me();
      // reserve the key synchronously to block concurrent duplicate submits
      setState((s) => ({ ...s, idempotency: { ...s.idempotency, [r.idempotencyKey]: "__inflight__" } }));
      await delay(this.latency);
      try {
        if (r.pin !== "1234") fail("AUTH_FAILED", "Incorrect demo PIN. Use 1234.");
        const q = this.quotes.get(r.quoteId) ?? fail("QUOTE_NOT_FOUND", "Quote not found. Request a new quote.");
        if (new Date(q.expiresAt).getTime() < Date.now()) fail("QUOTE_EXPIRED", "Quote expired. Refresh to get a new one.");
        const s = getState();
        const w = s.wallets.find((x) => x.id === r.walletId && x.ownerId === u.id) ?? fail("NOT_FOUND", "Wallet not found.");
        if (w.status !== "active") fail("WALLET_INACTIVE", "This wallet is not active.");
        if (u.kycStatus !== "approved") fail("KYC_REQUIRED", "Verification must be approved before sending.");
        if (w.available < q.totalDebit) fail("INSUFFICIENT_FUNDS", "Available balance is too low for amount plus fee.");
        const b = s.beneficiaries.find((x) => x.id === r.beneficiaryId)!;
        const outcome = r.simulate ?? "success";
        const at = new Date().toISOString();
        const status = outcome === "success" ? "completed" : outcome === "pending" ? "processing" : "failed";
        const ledger = status === "completed" ? [
          { account: `Sender wallet ${w.number}`, debit: q.totalDebit, credit: 0, currency: w.currency },
          { account: b.type === "wallet" ? `Recipient wallet ${b.destination}` : `Provider clearing (${b.provider})`, debit: 0, credit: q.amount, currency: w.currency },
          { account: "Fee revenue", debit: 0, credit: q.fee, currency: w.currency },
        ] : [];
        const tx: Transaction = {
          id: rid("t"), reference: rid("DEMO-TRF"), idempotencyKey: r.idempotencyKey, type: "transfer", channel: b.type, status,
          walletId: w.id, ownerId: u.id, currency: w.currency, amount: q.amount, fee: q.fee,
          fxRate: q.rate !== 1 ? q.rate : undefined, destAmount: q.destAmount, destCurrency: q.destCurrency,
          counterparty: b.name, createdAt: at,
          timeline: [
            { status: "pending", at, note: "Transfer created with idempotency key" },
            ...(status === "failed" ? [{ status: "failed" as const, at, note: "Simulated provider rejection — no funds moved" }] :
              status === "processing" ? [{ status: "processing" as const, at, note: "Funds reserved; awaiting simulated provider" }] :
              [{ status: "completed" as const, at, note: "Balanced journal posted to demo ledger" }]),
          ],
          ledger,
        };
        setState((st) => ({
          ...st,
          transactions: [tx, ...st.transactions],
          idempotency: { ...st.idempotency, [r.idempotencyKey]: tx.id },
          wallets: st.wallets.map((x) => x.id !== w.id ? x : status === "completed" ? { ...x, available: x.available - q.totalDebit }
            : status === "processing" ? { ...x, available: x.available - q.totalDebit, held: x.held + q.totalDebit } : x),
        }));
        return tx;
      } catch (e) {
        setState((s) => { const { [r.idempotencyKey]: _, ...rest } = s.idempotency; return { ...s, idempotency: rest }; });
        throw e;
      }
    },
  };

  transactions = {
    list: async () => { await delay(this.latency); const u = this.me(); return getState().transactions.filter((t) => t.ownerId === u.id); },
  };

  agents = {
    cashIn: async (r: CashInRequest) => {
      const s0 = getState();
      if (s0.idempotency[r.idempotencyKey]) fail("DUPLICATE", "This cash-in was already submitted.");
      const u = this.me();
      if (u.role !== "agent") fail("FORBIDDEN", "Only agents can perform cash-in.");
      setState((s) => ({ ...s, idempotency: { ...s.idempotency, [r.idempotencyKey]: "__inflight__" } }));
      await delay(this.latency);
      const s = getState();
      const agentW = s.wallets.find((w) => w.id === r.agentWalletId && w.ownerId === u.id);
      const cust = s.wallets.find((w) => w.number === r.customerWalletNumber);
      const err = !agentW ? "Agent wallet not found." : !cust ? "Customer wallet not found." : cust.status !== "active" ? "Customer wallet is not active."
        : agentW.available < r.amount ? "Insufficient agent float." : r.amount > 10_000_000 ? "Exceeds agent single-transaction limit; requires supervisor approval." : null;
      if (err) { setState((st) => { const { [r.idempotencyKey]: _, ...rest } = st.idempotency; return { ...st, idempotency: rest }; }); fail("REJECTED", err); }
      const at = new Date().toISOString();
      const tx: Transaction = {
        id: rid("t"), reference: rid("DEMO-CIN"), idempotencyKey: r.idempotencyKey, type: "cash_in", channel: "agent", status: "completed",
        walletId: cust!.id, ownerId: cust!.ownerId, currency: cust!.currency, amount: r.amount, fee: 0, counterparty: u.name, createdAt: at,
        timeline: [{ status: "completed", at, note: "Agent confirmed DEMO cash receipt" }],
        ledger: [
          { account: `Agent float ${agentW!.number}`, debit: r.amount, credit: 0, currency: cust!.currency },
          { account: `Customer wallet ${cust!.number}`, debit: 0, credit: r.amount, currency: cust!.currency },
        ],
      };
      setState((st) => ({
        ...st, transactions: [tx, ...st.transactions], idempotency: { ...st.idempotency, [r.idempotencyKey]: tx.id },
        wallets: st.wallets.map((w) => w.id === agentW!.id ? { ...w, available: w.available - r.amount } : w.id === cust!.id ? { ...w, available: w.available + r.amount } : w),
      }));
      return tx;
    },
  };
}

/** Talks to Laravel at /api/v1. Never falls back to demo data. */
export class LaravelApiAdapter implements ApiAdapter {
  mode = "laravel" as const;
  constructor(private base = (import.meta.env.VITE_API_BASE_URL ?? "") + "/api/v1") {}
  private async req<T>(method: string, path: string, body?: unknown, idem?: string): Promise<T> {
    const res = await fetch(this.base + path, {
      method, credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(idem ? { "Idempotency-Key": idem } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => fail("NETWORK", "The AbanRemit API is unavailable."));
    const json = await (res as Response).json().catch(() => ({}));
    if (!(res as Response).ok) throw new ApiException(json.error ?? { code: "HTTP_" + (res as Response).status, message: "Request failed", correlationId: "" });
    return json.data as T;
  }
  wallets = {
    list: () => this.req<Wallet[]>("GET", "/wallets"),
    lookup: (n: string) => this.req<{ number: string; maskedName: string; currency: CurrencyCode } | null>("GET", `/wallets/lookup/${n}`),
  };
  beneficiaries = {
    list: () => this.req<Beneficiary[]>("GET", "/beneficiaries"),
    create: (b: Omit<Beneficiary, "id" | "ownerId" | "verified">) => this.req<Beneficiary>("POST", "/beneficiaries", b),
    remove: (id: string) => this.req<void>("DELETE", `/beneficiaries/${id}`),
  };
  transfers = {
    quote: (walletId: string, beneficiaryId: string, amount: number) => this.req<Quote>("POST", "/transfers/quotes", { walletId, beneficiaryId, amount }),
    create: ({ idempotencyKey, simulate: _s, ...r }: TransferRequest) => this.req<Transaction>("POST", "/transfers", r, idempotencyKey),
  };
  transactions = { list: () => this.req<Transaction[]>("GET", "/transactions") };
  agents = { cashIn: ({ idempotencyKey, ...r }: CashInRequest) => this.req<Transaction>("POST", "/agent/cash-in", r, idempotencyKey) };
}

export const api: ApiAdapter = import.meta.env.VITE_API_MODE === "laravel" ? new LaravelApiAdapter() : new DemoApiAdapter();
export const newIdempotencyKey = () => crypto.randomUUID();
