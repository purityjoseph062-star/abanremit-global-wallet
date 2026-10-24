// Centralized typed API layer. Components call `api.*` only — never mock data directly.
// VITE_API_MODE=demo (default) uses DemoApiAdapter; VITE_API_MODE=laravel uses /api/v1.
import type {
  AgentProfile,
  AppNotification,
  CashOutRequest,
  CommissionEntry,
  CommissionSummary,
  CustomerSummary,
  CustomerSupportTicket,
  DepositRequest,
  MovementMethod,
  MovementQuote,
  Reconciliation,
  ReplenishmentRequest,
  Settlement,
  SimulatedOutcome,
  SupportTicket,
  WithdrawalRequest,
  Beneficiary,
  CashInRequest,
  CurrencyCode,
  CurrencyInfo,
  FloatAccount,
  FloatMovement,
  Quote,
  Transaction,
  TransferRequest,
  Wallet,
  WalletCreateRequest,
  WalletEligibility,
  ExchangeQuote,
  ExchangeRequest,
  PortfolioSummary,
  Statement,
  AccountLimits,
} from "../domain/types";
import { demoFee, demoRate, toMinor, toMajor } from "../money";
import { currentUser, getState, setState } from "../demo/store";

export interface AgentServices {
  profile(): Promise<AgentProfile>;
  dashboardMetrics(): Promise<Record<string, unknown>>;
  searchCustomers(query: string): Promise<CustomerSummary[]>;
  getCustomer(customerId: string): Promise<CustomerSummary>;
  customerWallets(customerId: string): Promise<Wallet[]>;
  cashIn(r: CashInRequest): Promise<Transaction>;
  cashOut(r: CashOutRequest): Promise<Transaction>;
  confirmPayout(txId: string): Promise<Transaction>;
  reportPayoutFailure(txId: string, reason: string): Promise<Transaction>;
  cancelCashOut(txId: string): Promise<Transaction>;
  agentTransactions(filters?: {
    type?: string;
    status?: string;
    currency?: string;
    query?: string;
  }): Promise<Transaction[]>;
  getTransaction(txId: string): Promise<Transaction>;
  floatAccounts(): Promise<FloatAccount[]>;
  floatLedger(): Promise<FloatMovement[]>;
  replenishmentRequests(): Promise<ReplenishmentRequest[]>;
  requestReplenishment(r: {
    accountId: string;
    amount: number;
    reason: string;
    idempotencyKey: string;
  }): Promise<ReplenishmentRequest>;
  cancelReplenishment(reqId: string): Promise<ReplenishmentRequest>;
  commissionSummary(): Promise<CommissionSummary>;
  commissions(filters?: {
    status?: string;
    type?: string;
    currency?: string;
  }): Promise<CommissionEntry[]>;
  settlements(): Promise<Settlement[]>;
  reconciliations(): Promise<Reconciliation[]>;
  createReconciliation(r: {
    businessDate: string;
    currency: string;
    reportedClosing: number;
    explanation?: string;
  }): Promise<Reconciliation>;
  reportSummary(from: string, to: string): Promise<Record<string, unknown>>;
  supportTickets(): Promise<SupportTicket[]>;
  createTicket(r: {
    category: string;
    subject: string;
    description: string;
    txRef?: string;
  }): Promise<SupportTicket>;
  replyTicket(ticketId: string, body: string): Promise<SupportTicket>;
}

export interface ApiAdapter {
  mode: "demo" | "laravel";
  wallets: {
    list(): Promise<Wallet[]>;
    get(walletId: string): Promise<Wallet>;
    create(r: WalletCreateRequest): Promise<Wallet>;
    eligibility(currency: CurrencyCode): Promise<WalletEligibility>;
    statement(walletId: string, from: string, to: string): Promise<Statement>;
    lookup(
      number: string,
    ): Promise<{ number: string; maskedName: string; currency: CurrencyCode } | null>;
  };
  currencies: {
    list(): Promise<CurrencyInfo[]>;
  };
  portfolio: {
    summary(displayCurrency?: CurrencyCode): Promise<PortfolioSummary>;
  };
  exchange: {
    quote(sourceWalletId: string, destWalletId: string, amount: number): Promise<ExchangeQuote>;
    create(r: ExchangeRequest): Promise<Transaction>;
  };
  beneficiaries: {
    list(): Promise<Beneficiary[]>;
    create(b: Omit<Beneficiary, "id" | "ownerId" | "verified">): Promise<Beneficiary>;
    update(id: string, b: Partial<Omit<Beneficiary, "id" | "ownerId">>): Promise<Beneficiary>;
    remove(id: string): Promise<void>;
  };
  transfers: {
    quote(walletId: string, beneficiaryId: string, amount: number): Promise<Quote>;
    create(r: TransferRequest): Promise<Transaction>;
  };
  transactions: {
    list(): Promise<Transaction[]>;
    forWallet(walletId: string): Promise<Transaction[]>;
  };
  limits: {
    get(): Promise<AccountLimits>;
  };
  support: {
    list(): Promise<CustomerSupportTicket[]>;
    create(r: { category: string; subject: string; description: string }): Promise<CustomerSupportTicket>;
    reply(id: string, body: string): Promise<CustomerSupportTicket>;
  };
  agents: AgentServices;
  deposits: MovementService<DepositRequest>;
  withdrawals: MovementService<WithdrawalRequest>;
  notifications: { list(): Promise<AppNotification[]>; markRead(id: string): Promise<void> };
}

import { ApiException, delay, fail, rid } from "./errors";
import { makeDemoMovements } from "./demo-movements";
import { makeAgentServices } from "./agent-services";
export { ApiException };

export interface MovementService<R> {
  quote(walletId: string, method: MovementMethod, amount: number): Promise<MovementQuote>;
  create(r: R): Promise<Transaction>;
  cancel(txId: string): Promise<Transaction>;
  /** DEMO ONLY — the Laravel adapter refuses this. */
  simulate(txId: string, outcome: SimulatedOutcome): Promise<Transaction>;
}

/** Simulates the Laravel server. Server-side rules (fees, balances, idempotency) live here, not in screens. */
export class DemoApiAdapter implements ApiAdapter {
  mode = "demo" as const;
  private quotes = new Map<string, Quote>();
  deposits;
  withdrawals;
  notifications;
  constructor(private latency = 450) {
    const m = makeDemoMovements(latency);
    this.deposits = m.deposits;
    this.withdrawals = m.withdrawals;
    this.notifications = m.notifications;
    this.agents = makeAgentServices(latency);
  }
  private me() {
    const u = currentUser();
    if (!u) fail("UNAUTHENTICATED", "Sign in with a demo persona.");
    return u!;
  }

  private exchangeQuotes = new Map<string, ExchangeQuote>();

  wallets = {
    list: async () => {
      await delay(this.latency);
      const u = this.me();
      return getState().wallets.filter((w) => w.ownerId === u.id);
    },
    get: async (walletId: string) => {
      await delay(this.latency / 2);
      const u = this.me();
      const w = getState().wallets.find((x) => x.id === walletId && x.ownerId === u.id);
      if (!w) fail("NOT_FOUND", "Wallet not found.");
      return w!;
    },
    create: async (r: WalletCreateRequest) => {
      const u = this.me();
      const existing = getState().idempotency[r.idempotencyKey];
      if (existing) {
        const w = getState().wallets.find((x) => x.id === existing);
        if (w) return w;
      }
      setState((s) => ({
        ...s,
        idempotency: { ...s.idempotency, [r.idempotencyKey]: "__inflight__" },
      }));
      await delay(this.latency);
      const s1 = getState();
      const dup = s1.wallets.find(
        (x) => x.ownerId === u.id && x.currency === r.currency,
      );
      if (dup) {
        setState((s) => {
          const { [r.idempotencyKey]: _, ...rest } = s.idempotency;
          return { ...s, idempotency: rest };
        });
        fail("WALLET_ALREADY_EXISTS", `You already have a ${r.currency} wallet.`);
      }
      if (!DEMO_CURRENCIES.find((c) => c.code === r.currency)?.demoAvailable)
        fail("CURRENCY_NOT_SUPPORTED", `${r.currency} wallets are not available in this demo.`);
      if (u.kycStatus !== "approved")
        fail("VERIFICATION_REQUIRED", "Verification must be approved before creating wallets.");
      const w: Wallet = {
        id: rid("w"),
        number: generateWalletNumber(),
        ownerId: u.id,
        currency: r.currency,
        accountType: u.role === "business_customer" ? "business" : "personal",
        status: "active",
        available: 0,
        pending: 0,
        held: 0,
      };
      setState((s) => ({
        ...s,
        wallets: [...s.wallets, w],
        idempotency: { ...s.idempotency, [r.idempotencyKey]: w.id },
      }));
      return w;
    },
    eligibility: async (currency: CurrencyCode) => {
      await delay(this.latency / 2);
      const u = this.me();
      const existing = getState().wallets.find(
        (x) => x.ownerId === u.id && x.currency === currency,
      );
      if (existing)
        return { currency, canCreate: false, reason: "You already have a wallet in this currency.", existingWalletId: existing.id };
      if (!DEMO_CURRENCIES.find((c) => c.code === currency)?.demoAvailable)
        return { currency, canCreate: false, reason: "This currency is not available in the demo." };
      if (u.kycStatus !== "approved")
        return { currency, canCreate: false, reason: "Verification must be approved first." };
      return { currency, canCreate: true };
    },
    statement: async (walletId: string, from: string, to: string) => {
      await delay(this.latency);
      const u = this.me();
      const w = getState().wallets.find((x) => x.id === walletId && x.ownerId === u.id);
      if (!w) fail("NOT_FOUND", "Wallet not found.");
      const txs = getState().transactions
        .filter(
          (t) =>
            t.walletId === walletId &&
            t.createdAt >= from &&
            t.createdAt <= to + "T23:59:59.999Z",
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      let runningBalance = 0;
      const lines = txs.map((t) => {
        const isCredit = t.type === "deposit" || t.type === "cash_in" || (t.type === "exchange" && t.destCurrency === w.currency);
        const debit = isCredit ? 0 : t.amount + t.fee;
        const credit = isCredit ? t.amount : 0;
        runningBalance += credit - debit;
        return {
          date: t.createdAt,
          reference: t.reference,
          type: t.type,
          description: t.counterparty,
          debit,
          credit,
          balance: runningBalance,
          currency: w.currency,
        };
      });
      return {
        walletId,
        walletNumber: w.number,
        currency: w.currency,
        openingBalance: 0,
        closingBalance: runningBalance,
        from,
        to,
        lines,
      };
    },
    lookup: async (number: string) => {
      await delay(this.latency);
      const w = getState().wallets.find((x) => x.number === number);
      if (!w) return null;
      const owner = getState().users.find((u) => u.id === w.ownerId)!;
      const masked = owner.name
        .split(" ")
        .map((p, i) => (i === 0 ? p : p[0] + "***"))
        .join(" ");
      return { number: w.number, maskedName: masked, currency: w.currency };
    },
  };

  beneficiaries = {
    list: async () => {
      await delay(this.latency);
      const u = this.me();
      return getState().beneficiaries.filter((b) => b.ownerId === u.id);
    },
    create: async (b: Omit<Beneficiary, "id" | "ownerId" | "verified">) => {
      await delay(this.latency);
      const u = this.me();
      const nb: Beneficiary = { ...b, id: rid("b"), ownerId: u.id, verified: b.type === "wallet" };
      setState((s) => ({ ...s, beneficiaries: [...s.beneficiaries, nb] }));
      return nb;
    },
    update: async (id: string, patch: Partial<Omit<Beneficiary, "id" | "ownerId">>) => {
      await delay(this.latency);
      const u = this.me();
      const b = getState().beneficiaries.find((x) => x.id === id && x.ownerId === u.id);
      if (!b) fail("NOT_FOUND", "Beneficiary not found.");
      const updated = { ...b!, ...patch, id: b!.id, ownerId: b!.ownerId };
      setState((s) => ({
        ...s,
        beneficiaries: s.beneficiaries.map((x) => (x.id === id ? updated : x)),
      }));
      return updated;
    },
    remove: async (id: string) => {
      await delay(this.latency);
      const u = this.me();
      const b = getState().beneficiaries.find((x) => x.id === id);
      if (!b || b.ownerId !== u.id) fail("NOT_FOUND", "Beneficiary not found.");
      setState((s) => ({ ...s, beneficiaries: s.beneficiaries.filter((x) => x.id !== id) }));
    },
  };

  transfers = {
    quote: async (walletId: string, beneficiaryId: string, amount: number) => {
      await delay(this.latency);
      const u = this.me();
      const s = getState();
      const w =
        s.wallets.find((x) => x.id === walletId && x.ownerId === u.id) ??
        fail("NOT_FOUND", "Wallet not found.");
      const b =
        s.beneficiaries.find((x) => x.id === beneficiaryId && x.ownerId === u.id) ??
        fail("NOT_FOUND", "Recipient not found.");
      if (amount <= 0) fail("VALIDATION", "Amount must be greater than zero.");
      const fee = demoFee(b.type, amount, w.currency);
      const rate = demoRate(w.currency, b.currency);
      const destAmount = toMinor(toMajor(amount, w.currency) * rate, b.currency);
      const q: Quote = {
        id: rid("q"),
        sourceCurrency: w.currency,
        destCurrency: b.currency,
        amount,
        fee,
        rate,
        destAmount,
        totalDebit: amount + fee,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        illustrative: true,
      };
      this.quotes.set(q.id, q);
      return q;
    },
    create: async (r: TransferRequest) => {
      const s0 = getState();
      const existing = s0.idempotency[r.idempotencyKey];
      if (existing) return s0.transactions.find((t) => t.id === existing)!; // idempotent replay
      const u = this.me();
      // reserve the key synchronously to block concurrent duplicate submits
      setState((s) => ({
        ...s,
        idempotency: { ...s.idempotency, [r.idempotencyKey]: "__inflight__" },
      }));
      await delay(this.latency);
      try {
        if (r.pin !== "1234") fail("AUTH_FAILED", "Incorrect demo PIN. Use 1234.");
        const q =
          this.quotes.get(r.quoteId) ??
          fail("QUOTE_NOT_FOUND", "Quote not found. Request a new quote.");
        if (new Date(q.expiresAt).getTime() < Date.now())
          fail("QUOTE_EXPIRED", "Quote expired. Refresh to get a new one.");
        const s = getState();
        const w =
          s.wallets.find((x) => x.id === r.walletId && x.ownerId === u.id) ??
          fail("NOT_FOUND", "Wallet not found.");
        if (w.status !== "active") fail("WALLET_INACTIVE", "This wallet is not active.");
        if (u.kycStatus !== "approved")
          fail("KYC_REQUIRED", "Verification must be approved before sending.");
        if (w.available < q.totalDebit)
          fail("INSUFFICIENT_FUNDS", "Available balance is too low for amount plus fee.");
        const b = s.beneficiaries.find((x) => x.id === r.beneficiaryId)!;
        const outcome = r.simulate ?? "success";
        const at = new Date().toISOString();
        const status =
          outcome === "success" ? "completed" : outcome === "pending" ? "processing" : "failed";
        const ledger =
          status === "completed"
            ? [
                {
                  account: `Sender wallet ${w.number}`,
                  debit: q.totalDebit,
                  credit: 0,
                  currency: w.currency,
                },
                {
                  account:
                    b.type === "wallet"
                      ? `Recipient wallet ${b.destination}`
                      : `Provider clearing (${b.provider})`,
                  debit: 0,
                  credit: q.amount,
                  currency: w.currency,
                },
                { account: "Fee revenue", debit: 0, credit: q.fee, currency: w.currency },
              ]
            : [];
        const tx: Transaction = {
          id: rid("t"),
          reference: rid("DEMO-TRF"),
          idempotencyKey: r.idempotencyKey,
          type: "transfer",
          channel: b.type,
          status,
          walletId: w.id,
          ownerId: u.id,
          currency: w.currency,
          amount: q.amount,
          fee: q.fee,
          fxRate: q.rate !== 1 ? q.rate : undefined,
          destAmount: q.destAmount,
          destCurrency: q.destCurrency,
          counterparty: b.name,
          createdAt: at,
          timeline: [
            { status: "pending", at, note: "Transfer created with idempotency key" },
            ...(status === "failed"
              ? [
                  {
                    status: "failed" as const,
                    at,
                    note: "Simulated provider rejection — no funds moved",
                  },
                ]
              : status === "processing"
                ? [
                    {
                      status: "processing" as const,
                      at,
                      note: "Funds reserved; awaiting simulated provider",
                    },
                  ]
                : [
                    {
                      status: "completed" as const,
                      at,
                      note: "Balanced journal posted to demo ledger",
                    },
                  ]),
          ],
          ledger,
        };
        setState((st) => ({
          ...st,
          transactions: [tx, ...st.transactions],
          idempotency: { ...st.idempotency, [r.idempotencyKey]: tx.id },
          wallets: st.wallets.map((x) =>
            x.id !== w.id
              ? x
              : status === "completed"
                ? { ...x, available: x.available - q.totalDebit }
                : status === "processing"
                  ? { ...x, available: x.available - q.totalDebit, held: x.held + q.totalDebit }
                  : x,
          ),
        }));
        return tx;
      } catch (e) {
        setState((s) => {
          const { [r.idempotencyKey]: _, ...rest } = s.idempotency;
          return { ...s, idempotency: rest };
        });
        throw e;
      }
    },
  };

  transactions = {
    list: async () => {
      await delay(this.latency);
      const u = this.me();
      return getState().transactions.filter((t) => t.ownerId === u.id);
    },
    forWallet: async (walletId: string) => {
      await delay(this.latency);
      const u = this.me();
      return getState().transactions.filter((t) => t.walletId === walletId && t.ownerId === u.id);
    },
  };

  currencies = {
    list: async () => {
      await delay(this.latency / 2);
      return DEMO_CURRENCIES;
    },
  };

  portfolio = {
    summary: async (displayCurrency: CurrencyCode = "KES") => {
      await delay(this.latency / 2);
      const u = this.me();
      const wallets = getState().wallets.filter((w) => w.ownerId === u.id);
      const txs = getState().transactions.filter(
        (t) => t.ownerId === u.id && (t.status === "pending" || t.status === "processing"),
      );
      const ratesUsed: Record<string, number> = {};
      let totalValueMinor = 0;
      for (const w of wallets) {
        const rate = demoRate(w.currency, displayCurrency);
        ratesUsed[w.currency] = rate;
        totalValueMinor += Math.round(toMinor(toMajor(w.available, w.currency) * rate, displayCurrency));
      }
      return {
        displayCurrency,
        totalValueMinor,
        ratesUsed,
        rateUpdatedAt: new Date().toISOString(),
        walletCount: wallets.length,
        activeWalletCount: wallets.filter((w) => w.status === "active").length,
        pendingTxCount: txs.length,
      };
    },
  };

  exchange = {
    quote: async (sourceWalletId: string, destWalletId: string, amount: number) => {
      await delay(this.latency);
      const u = this.me();
      const s = getState();
      const sw = s.wallets.find((x) => x.id === sourceWalletId && x.ownerId === u.id) ?? fail("NOT_FOUND", "Source wallet not found.");
      const dw = s.wallets.find((x) => x.id === destWalletId && x.ownerId === u.id) ?? fail("NOT_FOUND", "Destination wallet not found.");
      if (sw.currency === dw.currency) fail("VALIDATION", "Source and destination wallets must be different currencies.");
      if (amount <= 0) fail("VALIDATION", "Amount must be greater than zero.");
      if (sw.status !== "active") fail("WALLET_INACTIVE", "Source wallet is not active.");
      const rate = demoRate(sw.currency, dw.currency);
      const fee = 0;
      const destAmount = toMinor(toMajor(amount, sw.currency) * rate, dw.currency);
      const q: ExchangeQuote = {
        id: rid("xq"),
        sourceWalletId,
        destWalletId,
        sourceCurrency: sw.currency,
        destCurrency: dw.currency,
        amount,
        rate,
        fee,
        destAmount,
        totalDebit: amount + fee,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        illustrative: true,
      };
      this.exchangeQuotes.set(q.id, q);
      return q;
    },
    create: async (r: ExchangeRequest) => {
      const existing = getState().idempotency[r.idempotencyKey];
      if (existing) return getState().transactions.find((t) => t.id === existing)!;
      const u = this.me();
      setState((s) => ({ ...s, idempotency: { ...s.idempotency, [r.idempotencyKey]: "__inflight__" } }));
      await delay(this.latency);
      try {
        const q = this.exchangeQuotes.get(r.quoteId) ?? fail("QUOTE_NOT_FOUND", "Quote not found.");
        if (new Date(q.expiresAt).getTime() < Date.now()) fail("QUOTE_EXPIRED", "Quote expired.");
        const s = getState();
        const sw = s.wallets.find((x) => x.id === r.sourceWalletId && x.ownerId === u.id) ?? fail("NOT_FOUND", "Source wallet not found.");
        const dw = s.wallets.find((x) => x.id === r.destWalletId && x.ownerId === u.id) ?? fail("NOT_FOUND", "Destination wallet not found.");
        if (sw.available < q.totalDebit) fail("INSUFFICIENT_FUNDS", "Available balance is too low.");
        const at = new Date().toISOString();
        const tx: Transaction = {
          id: rid("t"),
          reference: rid("DEMO-FX"),
          idempotencyKey: r.idempotencyKey,
          type: "exchange",
          channel: "fx",
          status: "completed",
          walletId: sw.id,
          ownerId: u.id,
          currency: sw.currency,
          amount: q.amount,
          fee: q.fee,
          fxRate: q.rate,
          destAmount: q.destAmount,
          destCurrency: q.destCurrency,
          counterparty: `Own ${dw.currency} wallet`,
          createdAt: at,
          timeline: [
            { status: "pending", at, note: "Exchange initiated" },
            { status: "completed", at, note: `Converted ${sw.currency} to ${dw.currency} at illustrative rate ${q.rate}` },
          ],
          ledger: [
            { account: `Source wallet ${sw.number}`, debit: q.totalDebit, credit: 0, currency: sw.currency },
            { account: `Target wallet ${dw.number}`, debit: 0, credit: q.destAmount, currency: dw.currency },
          ],
        };
        setState((st) => ({
          ...st,
          transactions: [tx, ...st.transactions],
          idempotency: { ...st.idempotency, [r.idempotencyKey]: tx.id },
          wallets: st.wallets.map((x) => {
            if (x.id === sw.id) return { ...x, available: x.available - q.totalDebit };
            if (x.id === dw.id) return { ...x, available: x.available + q.destAmount };
            return x;
          }),
        }));
        return tx;
      } catch (e) {
        setState((s) => {
          const { [r.idempotencyKey]: _, ...rest } = s.idempotency;
          return { ...s, idempotency: rest };
        });
        throw e;
      }
    },
  };

  limits = {
    get: async () => {
      await delay(this.latency / 2);
      return {
        dailyTransferLimit: 5000000,
        dailyWithdrawalLimit: 2000000,
        singleTransactionLimit: 1000000,
        monthlyVolumeLimit: 20000000,
        currency: "KES" as CurrencyCode,
      };
    },
  };

  support = {
    list: async () => {
      await delay(this.latency);
      const u = this.me();
      return getState().supportTickets
        .filter((t) => t.agentId === u.id)
        .map((t) => ({
          id: t.id,
          reference: t.reference,
          category: t.category,
          subject: t.subject,
          description: t.description,
          status: t.status,
          createdAt: t.createdAt,
          messages: t.messages,
        }));
    },
    create: async (r: { category: string; subject: string; description: string }) => {
      await delay(this.latency);
      const u = this.me();
      const ticket: CustomerSupportTicket = {
        id: rid("tk"),
        reference: rid("TKT"),
        category: r.category,
        subject: r.subject,
        description: r.description,
        status: "open",
        createdAt: new Date().toISOString(),
        messages: [{ id: rid("m"), author: u.name, body: r.description, at: new Date().toISOString() }],
      };
      setState((s) => ({
        ...s,
        supportTickets: [
          ...s.supportTickets,
          { ...ticket, agentId: u.id, txRef: undefined },
        ],
      }));
      return ticket;
    },
    reply: async (id: string, body: string) => {
      await delay(this.latency);
      const u = this.me();
      const t = getState().supportTickets.find((x) => x.id === id && x.agentId === u.id);
      if (!t) fail("NOT_FOUND", "Ticket not found.");
      const updated = {
        ...t!,
        messages: [...t!.messages, { id: rid("m"), author: u.name, body, at: new Date().toISOString() }],
      };
      setState((s) => ({
        ...s,
        supportTickets: s.supportTickets.map((x) => (x.id === id ? updated : x)),
      }));
      return { ...updated };
    },
  };
}

const DEMO_CURRENCIES: CurrencyInfo[] = [
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "KE", precision: 2, demoAvailable: true },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "US", precision: 2, demoAvailable: true },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "GB", precision: 2, demoAvailable: true },
  { code: "EUR", name: "Euro", symbol: "€", flag: "EU", precision: 2, demoAvailable: true },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", flag: "UG", precision: 0, demoAvailable: false },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", flag: "TZ", precision: 0, demoAvailable: false },
];

function generateWalletNumber(): string {
  const prefix = "100";
  const random = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
  return prefix + random;
}

/** Talks to Laravel at /api/v1. Never falls back to demo data. */
export class LaravelApiAdapter implements ApiAdapter {
  mode = "laravel" as const;
  constructor(private base = (import.meta.env["VITE_API_BASE_URL"] ?? "") + "/api/v1") {}
  private async req<T>(method: string, path: string, body?: unknown, idem?: string): Promise<T> {
    const res = await fetch(this.base + path, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(idem ? { "Idempotency-Key": idem } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }).catch(() => fail("NETWORK", "The AbanRemit API is unavailable."));
    const json = await (res as Response).json().catch(() => ({}));
    if (!(res as Response).ok)
      throw new ApiException(
        json.error ?? {
          code: "HTTP_" + (res as Response).status,
          message: "Request failed",
          correlationId: "",
        },
      );
    return json.data as T;
  }
  wallets = {
    list: () => this.req<Wallet[]>("GET", "/wallets"),
    get: (id: string) => this.req<Wallet>("GET", `/wallets/${id}`),
    create: ({ idempotencyKey, ...r }: WalletCreateRequest) =>
      this.req<Wallet>("POST", "/wallets", r, idempotencyKey),
    eligibility: (c: CurrencyCode) =>
      this.req<WalletEligibility>("GET", `/currencies/${c}/wallet-eligibility`),
    statement: (id: string, from: string, to: string) =>
      this.req<Statement>("GET", `/wallets/${id}/statement?from=${from}&to=${to}`),
    lookup: (n: string) =>
      this.req<{ number: string; maskedName: string; currency: CurrencyCode } | null>(
        "GET",
        `/wallets/lookup/${n}`,
      ),
  };
  currencies = {
    list: () => this.req<CurrencyInfo[]>("GET", "/currencies"),
  };
  portfolio = {
    summary: (displayCurrency?: CurrencyCode) =>
      this.req<PortfolioSummary>("GET", "/me/dashboard", undefined, undefined),
  };
  exchange = {
    quote: (sourceWalletId: string, destWalletId: string, amount: number) =>
      this.req<ExchangeQuote>("POST", "/exchanges/quotes", { sourceWalletId, destWalletId, amount }),
    create: ({ idempotencyKey, ...r }: ExchangeRequest) =>
      this.req<Transaction>("POST", "/exchanges", r, idempotencyKey),
  };
  beneficiaries = {
    list: () => this.req<Beneficiary[]>("GET", "/beneficiaries"),
    create: (b: Omit<Beneficiary, "id" | "ownerId" | "verified">) =>
      this.req<Beneficiary>("POST", "/beneficiaries", b),
    update: (id: string, patch: Partial<Omit<Beneficiary, "id" | "ownerId">>) =>
      this.req<Beneficiary>("PATCH", `/beneficiaries/${id}`, patch),
    remove: (id: string) => this.req<void>("DELETE", `/beneficiaries/${id}`),
  };
  transfers = {
    quote: (walletId: string, beneficiaryId: string, amount: number) =>
      this.req<Quote>("POST", "/transfers/quotes", { walletId, beneficiaryId, amount }),
    create: ({ idempotencyKey, simulate: _s, ...r }: TransferRequest) =>
      this.req<Transaction>("POST", "/transfers", r, idempotencyKey),
  };
  transactions = {
    list: () => this.req<Transaction[]>("GET", "/transactions"),
    forWallet: (walletId: string) => this.req<Transaction[]>("GET", `/wallets/${walletId}/transactions`),
  };
  limits = {
    get: () => this.req<AccountLimits>("GET", "/me/limits"),
  };
  support = {
    list: () => this.req<CustomerSupportTicket[]>("GET", "/support/tickets"),
    create: (r: { category: string; subject: string; description: string }) =>
      this.req<CustomerSupportTicket>("POST", "/support/tickets", r),
    reply: (id: string, body: string) =>
      this.req<CustomerSupportTicket>("POST", `/support/tickets/${id}/messages`, { body }),
  };
  agents: AgentServices = {
    profile: () => this.req<AgentProfile>("GET", "/agent/me"),
    dashboardMetrics: () => this.req<Record<string, unknown>>("GET", "/agent/dashboard"),
    searchCustomers: (q: string) =>
      this.req<CustomerSummary[]>("GET", `/agent/customers?q=${encodeURIComponent(q)}`),
    getCustomer: (id: string) => this.req<CustomerSummary>("GET", `/agent/customers/${id}`),
    customerWallets: (id: string) => this.req<Wallet[]>("GET", `/agent/customers/${id}/wallets`),
    cashIn: ({ idempotencyKey, ...r }: CashInRequest) =>
      this.req<Transaction>("POST", "/agent/cash-in", r, idempotencyKey),
    cashOut: ({ idempotencyKey, ...r }: CashOutRequest) =>
      this.req<Transaction>("POST", "/agent/cash-out", r, idempotencyKey),
    confirmPayout: (txId: string) =>
      this.req<Transaction>("POST", `/agent/cash-out/${txId}/confirm-payout`),
    reportPayoutFailure: (txId: string, reason: string) =>
      this.req<Transaction>("POST", `/agent/cash-out/${txId}/report-payout-failure`, { reason }),
    cancelCashOut: (txId: string) =>
      this.req<Transaction>("POST", `/agent/cash-out/${txId}/cancel`),
    agentTransactions: (f?: {
      type?: string;
      status?: string;
      currency?: string;
      query?: string;
    }) => {
      const p = new URLSearchParams();
      if (f?.type && f.type !== "all") p.set("type", f.type);
      if (f?.status && f.status !== "all") p.set("status", f.status);
      if (f?.currency && f.currency !== "all") p.set("currency", f.currency);
      if (f?.query) p.set("q", f.query);
      return this.req<Transaction[]>("GET", `/agent/transactions?${p}`);
    },
    getTransaction: (txId: string) => this.req<Transaction>("GET", `/agent/transactions/${txId}`),
    floatAccounts: () => this.req<FloatAccount[]>("GET", "/agent/float/accounts"),
    floatLedger: () => this.req<FloatMovement[]>("GET", "/agent/float/ledger"),
    replenishmentRequests: () =>
      this.req<ReplenishmentRequest[]>("GET", "/agent/float/replenishment-requests"),
    requestReplenishment: ({
      idempotencyKey,
      ...r
    }: {
      accountId: string;
      amount: number;
      reason: string;
      idempotencyKey: string;
    }) =>
      this.req<ReplenishmentRequest>(
        "POST",
        "/agent/float/replenishment-requests",
        r,
        idempotencyKey,
      ),
    cancelReplenishment: (reqId: string) =>
      this.req<ReplenishmentRequest>("POST", `/agent/float/replenishment-requests/${reqId}/cancel`),
    commissionSummary: () => this.req<CommissionSummary>("GET", "/agent/commissions/summary"),
    commissions: (f?: { status?: string; type?: string; currency?: string }) => {
      const p = new URLSearchParams();
      if (f?.status && f.status !== "all") p.set("status", f.status);
      if (f?.type && f.type !== "all") p.set("type", f.type);
      if (f?.currency && f.currency !== "all") p.set("currency", f.currency);
      return this.req<CommissionEntry[]>("GET", `/agent/commissions?${p}`);
    },
    settlements: () => this.req<Settlement[]>("GET", "/agent/settlements"),
    reconciliations: () => this.req<Reconciliation[]>("GET", "/agent/reconciliations"),
    createReconciliation: (r: {
      businessDate: string;
      currency: string;
      reportedClosing: number;
      explanation?: string;
    }) => this.req<Reconciliation>("POST", "/agent/reconciliations", r),
    reportSummary: (from: string, to: string) =>
      this.req<Record<string, unknown>>("GET", `/agent/reports/summary?from=${from}&to=${to}`),
    supportTickets: () => this.req<SupportTicket[]>("GET", "/agent/support/tickets"),
    createTicket: (r: { category: string; subject: string; description: string; txRef?: string }) =>
      this.req<SupportTicket>("POST", "/agent/support/tickets", r),
    replyTicket: (ticketId: string, body: string) =>
      this.req<SupportTicket>("POST", `/agent/support/tickets/${ticketId}/messages`, { body }),
  };
  private noSim = (): Promise<Transaction> =>
    Promise.reject(
      new ApiException({
        code: "DEMO_ONLY",
        message: "Simulation is not available in production.",
        correlationId: "",
      }),
    );
  deposits = {
    quote: (walletId: string, method: MovementMethod, amount: number) =>
      this.req<MovementQuote>("POST", "/deposits/quotes", { walletId, method, amount }),
    create: ({ idempotencyKey, ...r }: DepositRequest) =>
      this.req<Transaction>("POST", "/deposits", r, idempotencyKey),
    cancel: (id: string) => this.req<Transaction>("POST", `/deposits/${id}/cancel`),
    simulate: () => this.noSim(),
  };
  withdrawals = {
    quote: (walletId: string, method: MovementMethod, amount: number) =>
      this.req<MovementQuote>("POST", "/withdrawals/quotes", { walletId, method, amount }),
    create: ({ idempotencyKey, ...r }: WithdrawalRequest) =>
      this.req<Transaction>("POST", "/withdrawals", r, idempotencyKey),
    cancel: (id: string) => this.req<Transaction>("POST", `/withdrawals/${id}/cancel`),
    simulate: () => this.noSim(),
  };
  notifications = {
    list: () => this.req<AppNotification[]>("GET", "/notifications"),
    markRead: (id: string) => this.req<void>("PATCH", `/notifications/${id}/read`),
  };
}

export const api: ApiAdapter =
  import.meta.env["VITE_API_MODE"] === "laravel" ? new LaravelApiAdapter() : new DemoApiAdapter();
export const newIdempotencyKey = () => crypto.randomUUID();
