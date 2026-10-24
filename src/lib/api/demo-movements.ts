// DEMO simulation of deposit/withdrawal lifecycles. Mirrors the Laravel rules in
// docs/ABANREMIT_PAYMENT_LIFECYCLE.md. Never contacts a real provider.
import type {
  DepositRequest,
  MovementMethod,
  MovementQuote,
  SimulatedOutcome,
  Transaction,
  TxStatus,
  WithdrawalRequest,
} from "../domain/types";
import { currentUser, getState, setState, type DemoState } from "../demo/store";
import { maskDestination, methodConfig, quoteMovement } from "../methods";
import { delay, fail, rid } from "./errors";

const me = () => currentUser() ?? fail("UNAUTHENTICATED", "Sign in with a demo persona.");
const ownWallet = (id: string) => {
  const u = me();
  return (
    getState().wallets.find((w) => w.id === id && w.ownerId === u.id) ??
    fail("NOT_FOUND", "Wallet not found.")
  );
};
const now = () => new Date().toISOString();
const ownTx = (id: string) => {
  const u = me();
  return (
    getState().transactions.find((t) => t.id === id && t.ownerId === u.id) ??
    fail("NOT_FOUND", "Transaction not found.")
  );
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

function notify(s: DemoState, title: string, body: string, txId: string): DemoState {
  return {
    ...s,
    notifications: [
      { id: rid("n"), title, body, at: now(), read: false, txId },
      ...(s.notifications ?? []),
    ],
  };
}

export function makeDemoMovements(latency: number) {
  const quote = async (
    kind: "deposit" | "withdrawal",
    walletId: string,
    method: MovementMethod,
    amount: number,
  ): Promise<MovementQuote> => {
    await delay(latency);
    const w = ownWallet(walletId);
    if (!Number.isInteger(amount) || amount <= 0)
      fail("VALIDATION", "Enter an amount greater than zero.");
    const q = quoteMovement(kind, walletId, method, amount, w.currency);
    if (amount < q.min || amount > q.max) fail("LIMIT", "Amount is outside this method's limits.");
    return q;
  };

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

  const deposits = {
    quote: (walletId: string, method: MovementMethod, amount: number) =>
      quote("deposit", walletId, method, amount),
    create: async (r: DepositRequest): Promise<Transaction> => {
      const prior = replay(r.idempotencyKey);
      if (prior) return prior;
      lock(r.idempotencyKey);
      try {
        const q = await quote("deposit", r.walletId, r.method, r.amount);
        const w = ownWallet(r.walletId);
        if (w.status !== "active")
          fail("WALLET_INACTIVE", "This wallet cannot receive deposits yet.");
        const cfg = methodConfig("deposit", r.method);
        const ref = rid("DEMO-DEP");
        const at = now();
        const nextAction =
          r.method === "bank"
            ? `Pay the demo account with reference ${ref}, then simulate funding.`
            : r.method === "agent"
              ? `Show reference ${ref} to an authorised agent (demo).`
              : r.method === "card"
                ? "Approve the simulated card authorisation."
                : `Approve the simulated prompt on ${r.payerPhone}.`;
        const tx: Transaction = {
          id: rid("t"),
          reference: ref,
          idempotencyKey: r.idempotencyKey,
          type: "deposit",
          channel: r.method === "agent" ? "agent" : r.method,
          status: "pending",
          walletId: w.id,
          ownerId: w.ownerId,
          currency: w.currency,
          amount: q.amount,
          fee: q.fee,
          destAmount: q.net,
          destCurrency: w.currency,
          counterparty: cfg.label + " (demo)",
          createdAt: at,
          method: r.method,
          destination: r.payerPhone ? maskDestination(r.payerPhone) : undefined,
          nextAction,
          timeline: [
            { status: "pending", at, note: "Created — awaiting funding. Nothing credited yet." },
          ],
          ledger: [],
        };
        setState((s) => ({
          ...s,
          transactions: [tx, ...s.transactions],
          idempotency: { ...s.idempotency, [r.idempotencyKey]: tx.id },
          wallets: s.wallets.map((x) => (x.id === w.id ? { ...x, pending: x.pending + q.net } : x)),
        }));
        return tx;
      } catch (e) {
        unlock(r.idempotencyKey);
        throw e;
      }
    },
    simulate: async (txId: string, outcome: SimulatedOutcome): Promise<Transaction> => {
      await delay(latency);
      const t = ownTx(txId);
      if (t.type !== "deposit") fail("INVALID", "Not a deposit.");
      if (t.status !== "pending" && t.status !== "processing")
        fail("INVALID_STATE", `Deposit is already ${t.status}.`);
      const net = t.destAmount ?? t.amount - t.fee;
      setState((s) => {
        const w = s.wallets.find((x) => x.id === t.walletId)!;
        let next: Transaction;
        let avail = 0;
        if (outcome === "success") {
          next = step(t, "completed", "Simulated provider confirmed funding — credited.", {
            nextAction: undefined,
            ledger: [
              {
                account: `Provider clearing (${t.method})`,
                debit: t.amount,
                credit: 0,
                currency: t.currency,
              },
              {
                account: `Customer wallet ${w.number}`,
                debit: 0,
                credit: net,
                currency: t.currency,
              },
              ...(t.fee
                ? [{ account: "Fee revenue", debit: 0, credit: t.fee, currency: t.currency }]
                : []),
            ],
          });
          avail = net;
        } else if (outcome === "expire")
          next = step(t, "expired", "Funding window expired. Nothing credited.", {
            nextAction: undefined,
          });
        else
          next = step(t, "failed", "Simulated provider declined. Nothing credited.", {
            nextAction: undefined,
          });
        const s2 = {
          ...s,
          transactions: patchTx(s, t.id, () => next),
          wallets: s.wallets.map((x) =>
            x.id === w.id
              ? { ...x, pending: Math.max(0, x.pending - net), available: x.available + avail }
              : x,
          ),
        };
        return notify(s2, `Deposit ${next.status}`, `${t.reference}`, t.id);
      });
      return ownTx(txId);
    },
    cancel: async (txId: string) => {
      await delay(latency);
      const t = ownTx(txId);
      if (t.type !== "deposit" || t.status !== "pending")
        fail("INVALID_STATE", "Only deposits awaiting funding can be cancelled.");
      const net = t.destAmount ?? 0;
      setState((s) => ({
        ...s,
        transactions: patchTx(s, t.id, (x) =>
          step(x, "cancelled", "Cancelled by customer.", { nextAction: undefined }),
        ),
        wallets: s.wallets.map((x) =>
          x.id === t.walletId ? { ...x, pending: Math.max(0, x.pending - net) } : x,
        ),
      }));
      return ownTx(txId);
    },
  };

  const withdrawals = {
    quote: (walletId: string, method: MovementMethod, amount: number) =>
      quote("withdrawal", walletId, method, amount),
    create: async (r: WithdrawalRequest): Promise<Transaction> => {
      const prior = replay(r.idempotencyKey);
      if (prior) return prior;
      lock(r.idempotencyKey);
      try {
        const q = await quote("withdrawal", r.walletId, r.method, r.amount);
        if (r.pin !== "1234") fail("AUTH_FAILED", "Incorrect demo PIN. Use 1234.");
        const u = me();
        if (u.kycStatus !== "approved")
          fail("KYC_REQUIRED", "Verification must be approved before withdrawing.");
        const w = ownWallet(r.walletId);
        if (w.status !== "active") fail("WALLET_INACTIVE", "This wallet is not active.");
        if (w.available < q.net)
          fail("INSUFFICIENT_FUNDS", "Available balance does not cover amount plus fee.");
        let dest = "Agent cash-out code";
        let counterparty = "Agent cash-out (demo)";
        if (r.method !== "agent") {
          const b =
            getState().beneficiaries.find((x) => x.id === r.beneficiaryId && x.ownerId === u.id) ??
            fail("VALIDATION", "Choose a destination.");
          if (b.type !== r.method) fail("VALIDATION", "Destination does not match method.");
          dest = `${b.provider ?? ""} ${maskDestination(b.destination)}`.trim();
          counterparty = b.name;
        }
        const ref = rid("DEMO-WDR");
        const at = now();
        const code =
          r.method === "agent" ? String(Math.floor(100000 + Math.random() * 900000)) : undefined;
        const tx: Transaction = {
          id: rid("t"),
          reference: ref,
          idempotencyKey: r.idempotencyKey,
          type: "withdrawal",
          channel: r.method === "agent" ? "agent" : r.method,
          status: "processing",
          walletId: w.id,
          ownerId: u.id,
          currency: w.currency,
          amount: q.amount,
          fee: q.fee,
          destAmount: q.amount,
          destCurrency: w.currency,
          counterparty,
          createdAt: at,
          method: r.method,
          destination: dest,
          nextAction: code
            ? `Demo cash-out code ${code}. Simulate agent payout to complete.`
            : "Awaiting simulated provider settlement.",
          timeline: [
            { status: "pending", at, note: "Created" },
            { status: "processing", at, note: `Funds held (${q.net} minor units). Not yet sent.` },
          ],
          ledger: [],
        };
        setState((s) => ({
          ...s,
          transactions: [tx, ...s.transactions],
          idempotency: { ...s.idempotency, [r.idempotencyKey]: tx.id },
          wallets: s.wallets.map((x) =>
            x.id === w.id ? { ...x, available: x.available - q.net, held: x.held + q.net } : x,
          ),
        }));
        return tx;
      } catch (e) {
        unlock(r.idempotencyKey);
        throw e;
      }
    },
    simulate: async (txId: string, outcome: SimulatedOutcome): Promise<Transaction> => {
      await delay(latency);
      const t = ownTx(txId);
      if (t.type !== "withdrawal") fail("INVALID", "Not a withdrawal.");
      const total = t.amount + t.fee;
      if (outcome === "reverse") {
        if (t.status !== "completed")
          fail("INVALID_STATE", "Only completed withdrawals can be reversed.");
      } else if (t.status !== "processing")
        fail("INVALID_STATE", `Withdrawal is already ${t.status}.`);
      setState((s) => {
        const w = s.wallets.find((x) => x.id === t.walletId)!;
        let next: Transaction;
        let dAvail = 0;
        let dHeld = 0;
        if (outcome === "success") {
          next = step(
            t,
            "completed",
            "Simulated provider confirmed payout. Hold finalised as debit.",
            {
              nextAction: undefined,
              ledger: [
                {
                  account: `Customer wallet ${w.number}`,
                  debit: total,
                  credit: 0,
                  currency: t.currency,
                },
                {
                  account: `Provider clearing (${t.method})`,
                  debit: 0,
                  credit: t.amount,
                  currency: t.currency,
                },
                ...(t.fee
                  ? [{ account: "Fee revenue", debit: 0, credit: t.fee, currency: t.currency }]
                  : []),
              ],
            },
          );
          dHeld = -total;
        } else if (outcome === "reverse") {
          // compensating entries — original posted lines stay untouched
          next = step(t, "reversed", "Provider returned funds. Compensating entries posted.", {
            ledger: [
              ...t.ledger,
              {
                account: `Provider clearing (${t.method}) — reversal`,
                debit: t.amount,
                credit: 0,
                currency: t.currency,
              },
              ...(t.fee
                ? [
                    {
                      account: "Fee revenue — refund",
                      debit: t.fee,
                      credit: 0,
                      currency: t.currency,
                    },
                  ]
                : []),
              {
                account: `Customer wallet ${w.number} — reversal`,
                debit: 0,
                credit: total,
                currency: t.currency,
              },
            ],
          });
          dAvail = total;
        } else {
          next = step(
            t,
            outcome === "expire" ? "expired" : "failed",
            outcome === "expire"
              ? "Timed out. Hold released."
              : "Simulated provider failure. Hold released.",
            { nextAction: undefined },
          );
          dAvail = total;
          dHeld = -total;
        }
        const s2 = {
          ...s,
          transactions: patchTx(s, t.id, () => next),
          wallets: s.wallets.map((x) =>
            x.id === w.id
              ? { ...x, available: x.available + dAvail, held: Math.max(0, x.held + dHeld) }
              : x,
          ),
        };
        return notify(s2, `Withdrawal ${next.status}`, t.reference, t.id);
      });
      return ownTx(txId);
    },
    cancel: async (txId: string) => {
      await delay(latency);
      const t = ownTx(txId);
      if (t.type !== "withdrawal" || t.status !== "processing")
        fail("INVALID_STATE", "This withdrawal can no longer be cancelled.");
      const total = t.amount + t.fee;
      setState((s) => ({
        ...s,
        transactions: patchTx(s, t.id, (x) =>
          step(x, "cancelled", "Cancelled by customer. Hold released.", { nextAction: undefined }),
        ),
        wallets: s.wallets.map((x) =>
          x.id === t.walletId
            ? { ...x, available: x.available + total, held: Math.max(0, x.held - total) }
            : x,
        ),
      }));
      return ownTx(txId);
    },
  };

  const notifications = {
    list: async () => {
      await delay(latency / 3);
      me();
      return getState().notifications ?? [];
    },
    markRead: async (id: string) => {
      setState((s) => ({
        ...s,
        notifications: (s.notifications ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)),
      }));
    },
  };

  return { deposits, withdrawals, notifications };
}
