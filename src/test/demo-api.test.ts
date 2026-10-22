import { beforeEach, describe, expect, it } from "vitest";
import { DemoApiAdapter } from "@/lib/api";
import { getState, seedState, setState } from "@/lib/demo/store";

const api = new DemoApiAdapter(0);
beforeEach(() => setState(() => ({ ...seedState(), personaId: "u_amina" })));

describe("demo transfers", () => {
  it("charges KES 20 fee on a KES 1,000 wallet transfer and posts a balanced journal", async () => {
    const q = await api.transfers.quote("w1", "b1", 100000);
    expect(q.fee).toBe(2000);
    expect(q.totalDebit).toBe(102000);
    const tx = await api.transfers.create({ walletId: "w1", beneficiaryId: "b1", amount: q.amount, quoteId: q.id, pin: "1234", idempotencyKey: "k1" });
    const dr = tx.ledger.reduce((a, l) => a + l.debit, 0), cr = tx.ledger.reduce((a, l) => a + l.credit, 0);
    expect(dr).toBe(102000); expect(cr).toBe(102000);
    expect(getState().wallets.find((w) => w.id === "w1")!.available).toBe(8450000 - 102000);
  });

  it("does not debit twice for the same idempotency key", async () => {
    const q = await api.transfers.quote("w1", "b1", 100000);
    const r = { walletId: "w1", beneficiaryId: "b1", amount: q.amount, quoteId: q.id, pin: "1234", idempotencyKey: "dup" };
    const [a, b] = [await api.transfers.create(r), await api.transfers.create(r)];
    expect(a.id).toBe(b.id);
    expect(getState().wallets.find((w) => w.id === "w1")!.available).toBe(8450000 - 102000);
  });

  it("rejects a wrong PIN without moving funds", async () => {
    const q = await api.transfers.quote("w1", "b1", 100000);
    await expect(api.transfers.create({ walletId: "w1", beneficiaryId: "b1", amount: q.amount, quoteId: q.id, pin: "0000", idempotencyKey: "k2" })).rejects.toThrow(/PIN/);
    expect(getState().wallets.find((w) => w.id === "w1")!.available).toBe(8450000);
  });

  it("blocks customers from agent cash-in", async () => {
    await expect(api.agents.cashIn({ agentWalletId: "w4", customerWalletNumber: "100000284751", amount: 1000, idempotencyKey: "c1" })).rejects.toThrow(/Only agents/);
  });
});
