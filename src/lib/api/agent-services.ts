// DEMO simulation of agent operations: cash-in, cash-out, float, commissions,
// settlements, reconciliation, customers, reports, support.
// All financial rules live here — screens never compute balances or fees.
import type {
  AgentProfile,
  CashOutRequest,
  CommissionEntry,
  CommissionSummary,
  CustomerSummary,
  FloatAccount,
  FloatMovement,
  Reconciliation,
  ReplenishmentRequest,
  Settlement,
  SupportTicket,
  Transaction,
  TxStatus,
  Wallet,
  AppNotification,
} from "../domain/types";
import { currentUser, getState, setState, type DemoState } from "../demo/store";
import { delay, fail, rid } from "./errors";
import { formatMoney } from "../money";

const me = () => currentUser() ?? fail("UNAUTHENTICATED", "Sign in with a demo persona.");
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().split("T")[0];
const isToday = (iso: string) => iso.split("T")[0] === today();

const agentProfile = (s: DemoState): AgentProfile => {
  const u = me();
  const p = s.agentProfiles.find((a) => a.userId === u.id);
  if (!p) fail("NO_AGENT_PROFILE", "No agent profile assigned to this account.");
  return p;
};

const patchTx = (s: DemoState, id: string, fn: (t: Transaction) => Transaction) =>
  s.transactions.map((t) => (t.id === id ? fn(t) : t));

const step = (
  t: Transaction,
  status: TxStatus,
  note: string,
  extra: Partial<Transaction> = {},
): Transaction => ({
  ...t,
  ...extra,
  status,
  timeline: [...t.timeline, { status, at: now(), note }],
});

function notify(
  s: DemoState,
  title: string,
  body: string,
  txId?: string,
  category = "transaction",
  severity: "info" | "warning" | "error" = "info",
): DemoState {
  const n: AppNotification = {
    id: rid("n"),
    title,
    body,
    at: now(),
    read: false,
    txId,
    category,
    severity,
  };
  return { ...s, notifications: [n, ...(s.notifications ?? [])] };
}

const AGENT_COMMISSION_RATE = 0.005; // 0.5% demo commission
const AGENT_CASH_IN_FEE = 0; // no fee for agent cash-in in demo
const AGENT_CASH_OUT_FEE_PCT = 0.01; // 1% fee on cash-out
const AGENT_SINGLE_TX_LIMIT = 10_000_000; // 100,000 KES in minor units

export function makeAgentServices(latency: number) {
  const replay = (key: string) => {
    const id = getState().idempotency[key];
    return id && id !== "__inflight__"
      ? getState().transactions.find((t) => t.id === id)
      : id === "__inflight__"
        ? fail("IN_FLIGHT", "This request is already being processed.")
        : undefined;
  };
  const lock = (key: string) =>
    setState((s) => ({ ...s, idempotency: { ...s.idempotency, [key]: "__inflight__" } }));
  const unlock = (key: string) =>
    setState((s) => {
      const { [key]: _, ...rest } = s.idempotency;
      return { ...s, idempotency: rest };
    });

  // ─── Agent profile & dashboard ──────────────────────────────────
  const profile = async (): Promise<AgentProfile> => {
    await delay(latency / 2);
    return agentProfile(getState());
  };

  const dashboardMetrics = async () => {
    await delay(latency / 2);
    const s = getState();
    const ap = agentProfile(s);
    const agentTxs = s.transactions.filter(
      (t) =>
        (t.type === "cash_in" || t.type === "cash_out") && t.counterparty.includes(ap.agentCode),
    );
    const todaysTxs = agentTxs.filter((t) => isToday(t.createdAt));
    const todaysCashIn = todaysTxs.filter((t) => t.type === "cash_in" && t.status === "completed");
    const todaysCashOut = todaysTxs.filter(
      (t) => t.type === "cash_out" && t.status === "completed",
    );
    const floatAccts = s.floatAccounts.filter((f) => f.agentId === ap.id);
    const todaysCommissions = s.commissions.filter(
      (c) => c.agentId === ap.id && isToday(c.createdAt),
    );
    const pendingTxs = agentTxs.filter((t) => t.status === "pending" || t.status === "processing");
    const lastRec = s.reconciliations
      .filter((r) => r.agentId === ap.id)
      .sort((a, b) => b.businessDate.localeCompare(a.businessDate))[0];

    return {
      agentProfile: ap,
      floatAccounts: floatAccts,
      cashInVolumeToday: todaysCashIn.reduce((a, t) => a + t.amount, 0),
      cashOutVolumeToday: todaysCashOut.reduce((a, t) => a + t.amount, 0),
      completedTxCount: todaysTxs.filter((t) => t.status === "completed").length,
      pendingTxCount: pendingTxs.length,
      commissionEarnedToday: todaysCommissions
        .filter((c) => c.status !== "reversed" && c.status !== "rejected")
        .reduce((a, c) => a + c.commissionAmount, 0),
      reconciliationStatus: lastRec?.status ?? "not_started",
      recentTransactions: agentTxs.slice(0, 10),
      pendingTransactions: pendingTxs,
      totalTxCount: agentTxs.length,
      failedTxCount: agentTxs.filter((t) => t.status === "failed").length,
    };
  };

  // ─── Customers ──────────────────────────────────────────────────
  const searchCustomers = async (query: string): Promise<CustomerSummary[]> => {
    await delay(latency);
    if (!query.trim()) fail("VALIDATION", "Enter a search term.");
    const s = getState();
    const q = query.toLowerCase();
    const customers = s.users.filter(
      (u) => u.role === "customer" || u.role === "business_customer",
    );
    const matched = customers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        u.email.toLowerCase().includes(q),
    );
    return matched.map((u) => {
      const wallets = s.wallets.filter((w) => w.ownerId === u.id);
      const recentTx = s.transactions.filter((t) => t.ownerId === u.id).length;
      const maskedPhone = u.phone.slice(0, 6) + "•••" + u.phone.slice(-3);
      return {
        id: u.id,
        name: u.name,
        maskedPhone,
        kycStatus: u.kycStatus,
        accountStatus: wallets[0]?.status ?? "pending_activation",
        wallets: wallets.map((w) => ({
          currency: w.currency,
          status: w.status,
          available: w.available,
        })),
        recentTxCount: recentTx,
        joinedAt: u.id,
      };
    });
  };

  const getCustomer = async (customerId: string): Promise<CustomerSummary> => {
    await delay(latency);
    const s = getState();
    const u = s.users.find((x) => x.id === customerId);
    if (!u) fail("NOT_FOUND", "Customer not found.");
    if (u.role !== "customer" && u.role !== "business_customer")
      fail("FORBIDDEN", "Not a customer account.");
    const wallets = s.wallets.filter((w) => w.ownerId === u.id);
    const recentTx = s.transactions.filter((t) => t.ownerId === u.id).length;
    return {
      id: u.id,
      name: u.name,
      maskedPhone: u.phone.slice(0, 6) + "•••" + u.phone.slice(-3),
      kycStatus: u.kycStatus,
      accountStatus: wallets[0]?.status ?? "pending_activation",
      wallets: wallets.map((w) => ({
        currency: w.currency,
        status: w.status,
        available: w.available,
      })),
      recentTxCount: recentTx,
      joinedAt: u.id,
    };
  };

  const customerWallets = async (customerId: string): Promise<Wallet[]> => {
    await delay(latency);
    const s = getState();
    const u = s.users.find((x) => x.id === customerId);
    if (!u) fail("NOT_FOUND", "Customer not found.");
    if (u.role !== "customer" && u.role !== "business_customer")
      fail("FORBIDDEN", "Not a customer account.");
    return s.wallets.filter((w) => w.ownerId === customerId);
  };

  // ─── Cash-in ────────────────────────────────────────────────────
  const cashIn = async (r: {
    agentWalletId: string;
    customerWalletNumber: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<Transaction> => {
    const prior = replay(r.idempotencyKey);
    if (prior) return prior;
    const u = me();
    if (u.role !== "agent" && u.role !== "outlet_manager")
      fail("FORBIDDEN", "Only agents can perform cash-in.");
    lock(r.idempotencyKey);
    try {
      const s = getState();
      const ap = agentProfile(s);
      if (ap.operatingStatus !== "active")
        fail("AGENT_INACTIVE", "Agent is not active. Financial operations are suspended.");
      const agentW = s.wallets.find((w) => w.id === r.agentWalletId && w.ownerId === u.id);
      if (!agentW) fail("NOT_FOUND", "Agent wallet not found.");
      const cust = s.wallets.find((w) => w.number === r.customerWalletNumber);
      if (!cust) fail("NOT_FOUND", "Customer wallet not found.");
      if (cust.status !== "active") fail("WALLET_INACTIVE", "Customer wallet is not active.");
      if (r.amount <= 0) fail("VALIDATION", "Amount must be greater than zero.");
      if (r.amount > AGENT_SINGLE_TX_LIMIT)
        fail(
          "LIMIT_EXCEEDED",
          "Exceeds agent single-transaction limit. Supervisor approval required.",
        );
      const fa = s.floatAccounts.find((f) => f.agentId === ap.id && f.currency === cust.currency);
      if (fa && fa.available < r.amount)
        fail(
          "INSUFFICIENT_FLOAT",
          `Available float is ${formatMoney(fa.available, fa.currency)}. Request replenishment to continue.`,
        );
      await delay(latency);
      const at = now();
      const fee = AGENT_CASH_IN_FEE;
      const commissionAmount = Math.round(r.amount * AGENT_COMMISSION_RATE);
      const tx: Transaction = {
        id: rid("t"),
        reference: rid("DEMO-CIN"),
        idempotencyKey: r.idempotencyKey,
        type: "cash_in",
        channel: "agent",
        status: "completed",
        walletId: cust.id,
        ownerId: cust.ownerId,
        currency: cust.currency,
        amount: r.amount,
        fee,
        counterparty: u.name,
        createdAt: at,
        timeline: [
          { status: "pending", at, note: "Cash-in initiated by agent" },
          {
            status: "completed",
            at,
            note: `Agent ${ap.agentCode} confirmed DEMO cash receipt. Customer wallet credited.`,
          },
        ],
        ledger: [
          {
            account: `Agent float ${agentW.number}`,
            debit: r.amount,
            credit: 0,
            currency: cust.currency,
          },
          {
            account: `Customer wallet ${cust.number}`,
            debit: 0,
            credit: r.amount,
            currency: cust.currency,
          },
        ],
      };
      const commRef = rid("COMM");
      const commission: CommissionEntry = {
        id: rid("cm"),
        reference: commRef,
        txId: tx.id,
        txReference: tx.reference,
        txType: "cash_in",
        agentId: ap.id,
        currency: cust.currency,
        txAmount: r.amount,
        commissionRate: AGENT_COMMISSION_RATE,
        commissionAmount,
        status: "earned",
        createdAt: at,
      };
      const fmRef = rid("FM");
      const prevBal = fa ? fa.available : agentW.available;
      const fm: FloatMovement = {
        id: rid("fm"),
        reference: fmRef,
        accountId: fa?.id ?? "fa1",
        currency: cust.currency,
        movementType: "cash_in_movement",
        amount: r.amount,
        previousBalance: prevBal,
        resultingBalance: prevBal - r.amount,
        initiator: ap.agentCode,
        status: "completed",
        txId: tx.id,
        createdAt: at,
      };
      setState((st) => ({
        ...st,
        transactions: [tx, ...st.transactions],
        idempotency: { ...st.idempotency, [r.idempotencyKey]: tx.id },
        commissions: [commission, ...st.commissions],
        floatMovements: [fm, ...st.floatMovements],
        wallets: st.wallets.map((w) =>
          w.id === agentW.id
            ? { ...w, available: w.available - r.amount }
            : w.id === cust.id
              ? { ...w, available: w.available + r.amount }
              : w,
        ),
        floatAccounts: fa
          ? st.floatAccounts.map((f) =>
              f.id === fa.id ? { ...f, available: f.available - r.amount, lastUpdated: at } : f,
            )
          : st.floatAccounts,
      }));
      setState((st) =>
        notify(
          st,
          "Cash-in completed",
          `${tx.reference} — ${formatMoney(r.amount, cust.currency)}`,
          tx.id,
          "transaction",
          "info",
        ),
      );
      return tx;
    } catch (e) {
      unlock(r.idempotencyKey);
      throw e;
    }
  };

  // ─── Cash-out ───────────────────────────────────────────────────
  const cashOut = async (r: CashOutRequest): Promise<Transaction> => {
    const prior = replay(r.idempotencyKey);
    if (prior) return prior;
    const u = me();
    if (u.role !== "agent" && u.role !== "outlet_manager")
      fail("FORBIDDEN", "Only agents can perform cash-out.");
    lock(r.idempotencyKey);
    try {
      const s = getState();
      const ap = agentProfile(s);
      if (ap.operatingStatus !== "active")
        fail("AGENT_INACTIVE", "Agent is not active. Financial operations are suspended.");
      const agentW = s.wallets.find((w) => w.id === r.agentWalletId && w.ownerId === u.id);
      if (!agentW) fail("NOT_FOUND", "Agent wallet not found.");
      const cust = s.wallets.find((w) => w.id === r.customerWalletId);
      if (!cust) fail("NOT_FOUND", "Customer wallet not found.");
      if (cust.status !== "active") fail("WALLET_INACTIVE", "Customer wallet is not active.");
      if (r.amount <= 0) fail("VALIDATION", "Amount must be greater than zero.");
      if (r.amount > AGENT_SINGLE_TX_LIMIT)
        fail("LIMIT_EXCEEDED", "Exceeds agent single-transaction limit.");
      const fee = Math.round(r.amount * AGENT_CASH_OUT_FEE_PCT);
      const totalDebit = r.amount + fee;
      if (cust.available < totalDebit)
        fail(
          "INSUFFICIENT_FUNDS",
          `Available balance is ${formatMoney(cust.available, cust.currency)}. Cannot withdraw ${formatMoney(totalDebit, cust.currency)} including fee.`,
        );
      await delay(latency);
      const at = now();
      // Cash-out starts as "processing" — funds are HELD, not yet paid out
      const tx: Transaction = {
        id: rid("t"),
        reference: rid("DEMO-COT"),
        idempotencyKey: r.idempotencyKey,
        type: "cash_out",
        channel: "agent",
        status: "processing",
        walletId: cust.id,
        ownerId: cust.ownerId,
        currency: cust.currency,
        amount: r.amount,
        fee,
        counterparty: u.name,
        createdAt: at,
        destination: `Agent ${ap.agentCode} — awaiting payout`,
        nextAction: "Confirm physical cash payout to customer to finalize.",
        timeline: [
          { status: "pending", at, note: "Cash-out request created" },
          {
            status: "processing",
            at,
            note: `Funds reserved (${formatMoney(totalDebit, cust.currency)}). Awaiting agent payout confirmation.`,
          },
        ],
        ledger: [],
      };
      setState((st) => ({
        ...st,
        transactions: [tx, ...st.transactions],
        idempotency: { ...st.idempotency, [r.idempotencyKey]: tx.id },
        wallets: st.wallets.map((w) =>
          w.id === cust.id
            ? { ...w, available: w.available - totalDebit, held: w.held + totalDebit }
            : w,
        ),
      }));
      setState((st) =>
        notify(
          st,
          "Cash-out awaiting payout",
          `${tx.reference} — confirm physical cash handout`,
          tx.id,
          "transaction",
          "warning",
        ),
      );
      return tx;
    } catch (e) {
      unlock(r.idempotencyKey);
      throw e;
    }
  };

  const confirmPayout = async (txId: string): Promise<Transaction> => {
    await delay(latency);
    const s = getState();
    const u = me();
    const ap = agentProfile(s);
    const t = s.transactions.find((x) => x.id === txId);
    if (!t) fail("NOT_FOUND", "Transaction not found.");
    if (t.type !== "cash_out") fail("INVALID", "Not a cash-out transaction.");
    if (t.status !== "processing") fail("INVALID_STATE", `Cash-out is already ${t.status}.`);
    const total = t.amount + t.fee;
    const commissionAmount = Math.round(t.amount * AGENT_COMMISSION_RATE);
    const at = now();
    const cust = s.wallets.find((w) => w.id === t.walletId)!;
    const agentW = s.wallets.find((w) => w.ownerId === u.id && w.currency === t.currency);
    const fa = s.floatAccounts.find((f) => f.agentId === ap.id && f.currency === t.currency);
    const updated = step(t, "completed", "Agent confirmed physical cash payout. Debit finalized.", {
      nextAction: undefined,
      destination: `Agent ${ap.agentCode} — payout confirmed`,
      ledger: [
        {
          account: `Customer wallet ${cust.number}`,
          debit: total,
          credit: 0,
          currency: t.currency,
        },
        {
          account: `Agent float ${agentW?.number ?? "N/A"}`,
          debit: 0,
          credit: t.amount,
          currency: t.currency,
        },
        ...(t.fee
          ? [{ account: "Fee revenue", debit: 0, credit: t.fee, currency: t.currency }]
          : []),
      ],
    });
    const commRef = rid("COMM");
    const commission: CommissionEntry = {
      id: rid("cm"),
      reference: commRef,
      txId: t.id,
      txReference: t.reference,
      txType: "cash_out",
      agentId: ap.id,
      currency: t.currency,
      txAmount: t.amount,
      commissionRate: AGENT_COMMISSION_RATE,
      commissionAmount,
      status: "earned",
      createdAt: at,
    };
    const fmRef = rid("FM");
    const prevBal = fa ? fa.available : (agentW?.available ?? 0);
    const fm: FloatMovement = {
      id: rid("fm"),
      reference: fmRef,
      accountId: fa?.id ?? "fa1",
      currency: t.currency,
      movementType: "cash_out_movement",
      amount: t.amount,
      previousBalance: prevBal,
      resultingBalance: prevBal + t.amount,
      initiator: ap.agentCode,
      status: "completed",
      txId: t.id,
      createdAt: at,
    };
    setState((st) => ({
      ...st,
      transactions: patchTx(st, t.id, () => updated),
      commissions: [commission, ...st.commissions],
      floatMovements: [fm, ...st.floatMovements],
      wallets: st.wallets.map((w) =>
        w.id === cust.id
          ? { ...w, held: Math.max(0, w.held - total) }
          : w.id === agentW?.id
            ? { ...w, available: w.available + t.amount }
            : w,
      ),
      floatAccounts: fa
        ? st.floatAccounts.map((f) =>
            f.id === fa.id ? { ...f, available: f.available + t.amount, lastUpdated: at } : f,
          )
        : st.floatAccounts,
    }));
    setState((st) =>
      notify(
        st,
        "Cash-out completed",
        `${t.reference} — payout confirmed`,
        t.id,
        "transaction",
        "info",
      ),
    );
    return getState().transactions.find((x) => x.id === txId)!;
  };

  const reportPayoutFailure = async (txId: string, reason: string): Promise<Transaction> => {
    await delay(latency);
    const s = getState();
    const t = s.transactions.find((x) => x.id === txId);
    if (!t) fail("NOT_FOUND", "Transaction not found.");
    if (t.type !== "cash_out") fail("INVALID", "Not a cash-out transaction.");
    if (t.status !== "processing") fail("INVALID_STATE", `Cash-out is already ${t.status}.`);
    const total = t.amount + t.fee;
    const updated = step(
      t,
      "failed",
      `Payout failed: ${reason}. Held funds released to customer.`,
      {
        nextAction: undefined,
      },
    );
    setState((st) => ({
      ...st,
      transactions: patchTx(st, t.id, () => updated),
      wallets: st.wallets.map((w) =>
        w.id === t.walletId
          ? { ...w, available: w.available + total, held: Math.max(0, w.held - total) }
          : w,
      ),
    }));
    setState((st) =>
      notify(st, "Cash-out failed", `${t.reference} — ${reason}`, t.id, "transaction", "error"),
    );
    return getState().transactions.find((x) => x.id === txId)!;
  };

  const cancelCashOut = async (txId: string): Promise<Transaction> => {
    await delay(latency);
    const s = getState();
    const t = s.transactions.find((x) => x.id === txId);
    if (!t) fail("NOT_FOUND", "Transaction not found.");
    if (t.type !== "cash_out" || t.status !== "processing")
      fail("INVALID_STATE", "Only processing cash-out can be cancelled.");
    const total = t.amount + t.fee;
    const updated = step(t, "cancelled", "Cancelled by agent. Held funds released.", {
      nextAction: undefined,
    });
    setState((st) => ({
      ...st,
      transactions: patchTx(st, t.id, () => updated),
      wallets: st.wallets.map((w) =>
        w.id === t.walletId
          ? { ...w, available: w.available + total, held: Math.max(0, w.held - total) }
          : w,
      ),
    }));
    return getState().transactions.find((x) => x.id === txId)!;
  };

  // ─── Transactions ───────────────────────────────────────────────
  const agentTransactions = async (filters?: {
    type?: string;
    status?: string;
    currency?: string;
    query?: string;
  }): Promise<Transaction[]> => {
    await delay(latency / 2);
    const s = getState();
    const ap = agentProfile(s);
    let txs = s.transactions.filter(
      (t) =>
        (t.type === "cash_in" || t.type === "cash_out") && t.counterparty.includes(ap.agentCode),
    );
    if (filters?.type && filters.type !== "all") txs = txs.filter((t) => t.type === filters.type);
    if (filters?.status && filters.status !== "all")
      txs = txs.filter((t) => t.status === filters.status);
    if (filters?.currency && filters.currency !== "all")
      txs = txs.filter((t) => t.currency === filters.currency);
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      txs = txs.filter(
        (t) => t.reference.toLowerCase().includes(q) || t.counterparty.toLowerCase().includes(q),
      );
    }
    return txs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };

  const getTransaction = async (txId: string): Promise<Transaction> => {
    await delay(latency / 2);
    const s = getState();
    const t = s.transactions.find((x) => x.id === txId);
    if (!t) fail("NOT_FOUND", "Transaction not found.");
    return t;
  };

  // ─── Float ──────────────────────────────────────────────────────
  const floatAccounts = async (): Promise<FloatAccount[]> => {
    await delay(latency / 2);
    const ap = agentProfile(getState());
    return getState().floatAccounts.filter((f) => f.agentId === ap.id);
  };

  const floatLedger = async (): Promise<FloatMovement[]> => {
    await delay(latency / 2);
    const ap = agentProfile(getState());
    const accts = getState()
      .floatAccounts.filter((f) => f.agentId === ap.id)
      .map((f) => f.id);
    return getState()
      .floatMovements.filter((m) => accts.includes(m.accountId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };

  const replenishmentRequests = async (): Promise<ReplenishmentRequest[]> => {
    await delay(latency / 2);
    const ap = agentProfile(getState());
    return getState()
      .replenishmentRequests.filter((r) => r.agentId === ap.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };

  const requestReplenishment = async (r: {
    accountId: string;
    amount: number;
    reason: string;
    idempotencyKey: string;
  }): Promise<ReplenishmentRequest> => {
    await delay(latency);
    const s = getState();
    const ap = agentProfile(s);
    const fa = s.floatAccounts.find((f) => f.id === r.accountId && f.agentId === ap.id);
    if (!fa) fail("NOT_FOUND", "Float account not found.");
    if (r.amount <= 0) fail("VALIDATION", "Amount must be greater than zero.");
    if (r.amount > 50_000_000) fail("LIMIT", "Replenishment request exceeds maximum.");
    if (!r.reason.trim()) fail("VALIDATION", "Reason is required.");
    const req: ReplenishmentRequest = {
      id: rid("rr"),
      reference: rid("REQ"),
      agentId: ap.id,
      accountId: r.accountId,
      currency: fa.currency,
      amount: r.amount,
      reason: r.reason,
      status: "pending_approval",
      createdAt: now(),
    };
    // NOTE: does NOT change float balance — only an approved allocation can do that
    setState((st) => ({
      ...st,
      replenishmentRequests: [req, ...st.replenishmentRequests],
    }));
    setState((st) =>
      notify(
        st,
        "Replenishment requested",
        `${req.reference} — ${formatMoney(r.amount, fa.currency)} pending approval`,
        undefined,
        "float",
        "info",
      ),
    );
    return req;
  };

  const cancelReplenishment = async (reqId: string): Promise<ReplenishmentRequest> => {
    await delay(latency);
    const s = getState();
    const req = s.replenishmentRequests.find((r) => r.id === reqId);
    if (!req) fail("NOT_FOUND", "Request not found.");
    if (req.status !== "pending_approval" && req.status !== "submitted")
      fail("INVALID_STATE", "Only pending requests can be cancelled.");
    const updated = { ...req, status: "cancelled" as const };
    setState((st) => ({
      ...st,
      replenishmentRequests: st.replenishmentRequests.map((r) => (r.id === reqId ? updated : r)),
    }));
    return updated;
  };

  // ─── Commissions ────────────────────────────────────────────────
  const commissionSummary = async (): Promise<CommissionSummary> => {
    await delay(latency / 2);
    const s = getState();
    const ap = agentProfile(s);
    const mine = s.commissions.filter((c) => c.agentId === ap.id);
    return {
      earnedToday: mine
        .filter(
          (c) =>
            isToday(c.createdAt) &&
            (c.status === "earned" || c.status === "approved" || c.status === "settled"),
        )
        .reduce((a, c) => a + c.commissionAmount, 0),
      earnedThisMonth: mine
        .filter(
          (c) =>
            c.createdAt.slice(0, 7) === now().slice(0, 7) &&
            (c.status === "earned" || c.status === "approved" || c.status === "settled"),
        )
        .reduce((a, c) => a + c.commissionAmount, 0),
      pending: mine
        .filter((c) => c.status === "earned")
        .reduce((a, c) => a + c.commissionAmount, 0),
      approved: mine
        .filter((c) => c.status === "approved")
        .reduce((a, c) => a + c.commissionAmount, 0),
      settled: mine
        .filter((c) => c.status === "settled")
        .reduce((a, c) => a + c.commissionAmount, 0),
      reversed: mine
        .filter((c) => c.status === "reversed")
        .reduce((a, c) => a + c.commissionAmount, 0),
      currency: "KES",
    };
  };

  const commissions = async (filters?: {
    status?: string;
    type?: string;
    currency?: string;
  }): Promise<CommissionEntry[]> => {
    await delay(latency / 2);
    const s = getState();
    const ap = agentProfile(s);
    let list = s.commissions.filter((c) => c.agentId === ap.id);
    if (filters?.status && filters.status !== "all")
      list = list.filter((c) => c.status === filters.status);
    if (filters?.type && filters.type !== "all")
      list = list.filter((c) => c.txType === filters.type);
    if (filters?.currency && filters.currency !== "all")
      list = list.filter((c) => c.currency === filters.currency);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };

  // ─── Settlements ────────────────────────────────────────────────
  const settlements = async (): Promise<Settlement[]> => {
    await delay(latency / 2);
    const ap = agentProfile(getState());
    return getState()
      .settlements.filter((st) => st.agentId === ap.id)
      .sort((a, b) => b.initiatedAt.localeCompare(a.initiatedAt));
  };

  // ─── Reconciliation ─────────────────────────────────────────────
  const reconciliations = async (): Promise<Reconciliation[]> => {
    await delay(latency / 2);
    const ap = agentProfile(getState());
    return getState()
      .reconciliations.filter((r) => r.agentId === ap.id)
      .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
  };

  const createReconciliation = async (r: {
    businessDate: string;
    currency: string;
    reportedClosing: number;
    explanation?: string;
  }): Promise<Reconciliation> => {
    await delay(latency);
    const s = getState();
    const ap = agentProfile(s);
    const date = r.businessDate;
    const existing = s.reconciliations.find(
      (rc) => rc.agentId === ap.id && rc.businessDate === date && rc.currency === r.currency,
    );
    if (existing) fail("DUPLICATE", "A reconciliation already exists for this date and currency.");

    const dayTxs = s.transactions.filter(
      (t) =>
        (t.type === "cash_in" || t.type === "cash_out") &&
        t.counterparty.includes(ap.agentCode) &&
        t.createdAt.split("T")[0] === date &&
        t.currency === r.currency,
    );
    const cashInTotal = dayTxs
      .filter((t) => t.type === "cash_in" && t.status === "completed")
      .reduce((a, t) => a + t.amount, 0);
    const cashOutTotal = dayTxs
      .filter((t) => t.type === "cash_out" && t.status === "completed")
      .reduce((a, t) => a + t.amount, 0);
    const commissionTotal = s.commissions
      .filter(
        (c) =>
          c.agentId === ap.id &&
          c.createdAt.split("T")[0] === date &&
          c.currency === r.currency &&
          (c.status === "earned" || c.status === "approved" || c.status === "settled"),
      )
      .reduce((a, c) => a + c.commissionAmount, 0);
    const fa = s.floatAccounts.find((f) => f.agentId === ap.id && f.currency === r.currency);
    const openingFloat = fa ? fa.available + cashInTotal - cashOutTotal : 0;
    const floatAdditions = 0;
    const floatReductions = 0;
    const reversals = dayTxs
      .filter((t) => t.status === "reversed")
      .reduce((a, t) => a + t.amount, 0);
    const expectedClosing =
      openingFloat +
      floatAdditions -
      floatReductions -
      cashInTotal +
      cashOutTotal +
      commissionTotal -
      reversals;
    const variance = r.reportedClosing - expectedClosing;
    const status = variance === 0 ? "balanced" : "variance_detected";

    const rec: Reconciliation = {
      id: rid("rc"),
      reference: rid("REC"),
      agentId: ap.id,
      outletId: ap.outletId,
      businessDate: date,
      currency: r.currency as Reconciliation["currency"],
      openingFloat,
      floatAdditions,
      floatReductions,
      cashInTotal,
      cashOutTotal,
      commissionTotal,
      reversals,
      expectedClosing,
      reportedClosing: r.reportedClosing,
      variance,
      status,
      explanation: r.explanation,
      createdAt: now(),
      submittedAt: now(),
    };
    setState((st) => ({ ...st, reconciliations: [rec, ...st.reconciliations] }));
    if (variance !== 0) {
      setState((st) =>
        notify(
          st,
          "Reconciliation variance detected",
          `${rec.reference} — variance of ${formatMoney(Math.abs(variance), rec.currency)}`,
          undefined,
          "reconciliation",
          "warning",
        ),
      );
    }
    return rec;
  };

  // ─── Reports ────────────────────────────────────────────────────
  const reportSummary = async (from: string, to: string): Promise<Record<string, unknown>> => {
    await delay(latency / 2);
    const s = getState();
    const ap = agentProfile(s);
    const txs = s.transactions.filter(
      (t) =>
        (t.type === "cash_in" || t.type === "cash_out") &&
        t.counterparty.includes(ap.agentCode) &&
        t.createdAt >= from &&
        t.createdAt <= to + "T23:59:59",
    );
    const byCurrency: Record<
      string,
      {
        cashIn: number;
        cashOut: number;
        completed: number;
        failed: number;
        pending: number;
        commission: number;
      }
    > = {};
    for (const t of txs) {
      const key = t.currency;
      if (!byCurrency[key])
        byCurrency[key] = {
          cashIn: 0,
          cashOut: 0,
          completed: 0,
          failed: 0,
          pending: 0,
          commission: 0,
        };
      if (t.type === "cash_in" && t.status === "completed") byCurrency[key].cashIn += t.amount;
      if (t.type === "cash_out" && t.status === "completed") byCurrency[key].cashOut += t.amount;
      if (t.status === "completed") byCurrency[key].completed++;
      if (t.status === "failed") byCurrency[key].failed++;
      if (t.status === "pending" || t.status === "processing") byCurrency[key].pending++;
    }
    const comms = s.commissions.filter(
      (c) => c.agentId === ap.id && c.createdAt >= from && c.createdAt <= to + "T23:59:59",
    );
    for (const c of comms) {
      if (!byCurrency[c.currency])
        byCurrency[c.currency] = {
          cashIn: 0,
          cashOut: 0,
          completed: 0,
          failed: 0,
          pending: 0,
          commission: 0,
        };
      byCurrency[c.currency].commission += c.commissionAmount;
    }
    return { period: { from, to }, byCurrency, totalTxs: txs.length };
  };

  // ─── Support ────────────────────────────────────────────────────
  const supportTickets = async (): Promise<SupportTicket[]> => {
    await delay(latency / 2);
    const ap = agentProfile(getState());
    return getState()
      .supportTickets.filter((t) => t.agentId === ap.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };

  const createTicket = async (r: {
    category: string;
    subject: string;
    description: string;
    txRef?: string;
  }): Promise<SupportTicket> => {
    await delay(latency);
    const s = getState();
    const ap = agentProfile(s);
    if (!r.subject.trim() || !r.description.trim())
      fail("VALIDATION", "Subject and description are required.");
    const ticket: SupportTicket = {
      id: rid("tk"),
      reference: rid("TKT"),
      agentId: ap.id,
      category: r.category,
      subject: r.subject,
      description: r.description,
      txRef: r.txRef,
      status: "open",
      createdAt: now(),
      messages: [{ id: rid("m"), author: ap.agentCode, body: r.description, at: now() }],
    };
    setState((st) => ({ ...st, supportTickets: [ticket, ...st.supportTickets] }));
    return ticket;
  };

  const replyTicket = async (ticketId: string, body: string): Promise<SupportTicket> => {
    await delay(latency);
    const s = getState();
    const ap = agentProfile(s);
    const t = s.supportTickets.find((x) => x.id === ticketId);
    if (!t) fail("NOT_FOUND", "Ticket not found.");
    if (!body.trim()) fail("VALIDATION", "Message cannot be empty.");
    const msg = { id: rid("m"), author: ap.agentCode, body, at: now() };
    const updated = { ...t, messages: [...t.messages, msg], status: "waiting_ops" as const };
    setState((st) => ({
      ...st,
      supportTickets: st.supportTickets.map((x) => (x.id === ticketId ? updated : x)),
    }));
    return updated;
  };

  return {
    profile,
    dashboardMetrics,
    searchCustomers,
    getCustomer,
    customerWallets,
    cashIn,
    cashOut,
    confirmPayout,
    reportPayoutFailure,
    cancelCashOut,
    agentTransactions,
    getTransaction,
    floatAccounts,
    floatLedger,
    replenishmentRequests,
    requestReplenishment,
    cancelReplenishment,
    commissionSummary,
    commissions,
    settlements,
    reconciliations,
    createReconciliation,
    reportSummary,
    supportTickets,
    createTicket,
    replyTicket,
  };
}
