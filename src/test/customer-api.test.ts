import { beforeEach, describe, expect, it } from "vitest";
import { DemoApiAdapter } from "@/lib/api";
import { getState, seedState, setState } from "@/lib/demo/store";

const api = new DemoApiAdapter(0);
beforeEach(() => setState(() => ({ ...seedState(), personaId: "u_amina" })));

const approvedKycState = () =>
  setState((s) => ({
    ...s,
    users: s.users.map((u) =>
      u.id === "u_amina" ? { ...u, kycStatus: "approved" as const } : u,
    ),
  }));

const getKesWallet = () =>
  getState().wallets.find((w) => w.ownerId === "u_amina" && w.currency === "KES")!;
const getUsdWallet = () =>
  getState().wallets.find((w) => w.ownerId === "u_amina" && w.currency === "USD")!;

describe("wallet creation", () => {
  beforeEach(approvedKycState);

  it("creates a GBP wallet with a 15-digit number starting with 100", async () => {
    const w = await api.wallets.create({ currency: "GBP", idempotencyKey: "wc-1" });
    expect(w.currency).toBe("GBP");
    expect(w.number).toMatch(/^100\d{12}$/);
    expect(w.status).toBe("active");
    expect(w.available).toBe(0);
  });

  it("prevents duplicate currency wallet creation", async () => {
    await expect(
      api.wallets.create({ currency: "USD", idempotencyKey: "wc-dup" }),
    ).rejects.toThrow(/already have a USD wallet/);
  });

  it("returns the same wallet on idempotency replay", async () => {
    const a = await api.wallets.create({ currency: "GBP", idempotencyKey: "wc-idem" });
    const b = await api.wallets.create({ currency: "GBP", idempotencyKey: "wc-idem" });
    expect(a.id).toBe(b.id);
  });

  it("rejects unsupported currencies in demo", async () => {
    await expect(
      api.wallets.create({ currency: "UGX", idempotencyKey: "wc-ugx" }),
    ).rejects.toThrow(/not available/);
  });

  it("blocks wallet creation when KYC is not approved", async () => {
    setState((s) => ({
      ...s,
      users: s.users.map((u) =>
        u.id === "u_amina" ? { ...u, kycStatus: "pending_review" as const } : u,
      ),
    }));
    await expect(
      api.wallets.create({ currency: "EUR", idempotencyKey: "wc-nokyc" }),
    ).rejects.toThrow(/Verification must be approved/);
  });

  it("eligibility reports existing wallet", async () => {
    const e = await api.wallets.eligibility("USD");
    expect(e.canCreate).toBe(false);
    expect(e.existingWalletId).toBeDefined();
  });

  it("eligibility allows new currency", async () => {
    const e = await api.wallets.eligibility("EUR");
    expect(e.canCreate).toBe(true);
  });
});

describe("currency exchange", () => {
  beforeEach(approvedKycState);

  it("exchanges KES to GBP and moves funds between wallets", async () => {
    const kesWallet = getKesWallet();
    const gbpWallet = await api.wallets.create({ currency: "GBP", idempotencyKey: "ex-1" });
    const amount = 100000;
    const q = await api.exchange.quote(kesWallet.id, gbpWallet.id, amount);
    expect(q.sourceCurrency).toBe("KES");
    expect(q.destCurrency).toBe("GBP");
    expect(q.destAmount).toBeGreaterThan(0);
    const tx = await api.exchange.create({
      sourceWalletId: kesWallet.id,
      destWalletId: gbpWallet.id,
      amount,
      quoteId: q.id,
      idempotencyKey: "ex-create-1",
    });
    expect(tx.type).toBe("exchange");
    expect(tx.status).toBe("completed");
    const updatedKes = getState().wallets.find((w) => w.id === kesWallet.id)!;
    const updatedGbp = getState().wallets.find((w) => w.id === gbpWallet.id)!;
    expect(updatedKes.available).toBe(kesWallet.available - amount);
    expect(updatedGbp.available).toBe(q.destAmount);
  });

  it("exchanges USD to KES using existing seed wallet", async () => {
    const usdWallet = getUsdWallet();
    const kesWallet = getKesWallet();
    const amount = 5000;
    const q = await api.exchange.quote(usdWallet.id, kesWallet.id, amount);
    expect(q.sourceCurrency).toBe("USD");
    expect(q.destCurrency).toBe("KES");
    const tx = await api.exchange.create({
      sourceWalletId: usdWallet.id,
      destWalletId: kesWallet.id,
      amount,
      quoteId: q.id,
      idempotencyKey: "ex-usd-kes",
    });
    expect(tx.status).toBe("completed");
    expect(tx.fxRate).toBeDefined();
  });

  it("does not exchange twice for the same idempotency key", async () => {
    const kesWallet = getKesWallet();
    const gbpWallet = await api.wallets.create({ currency: "GBP", idempotencyKey: "ex-2" });
    const q = await api.exchange.quote(kesWallet.id, gbpWallet.id, 50000);
    const r = {
      sourceWalletId: kesWallet.id,
      destWalletId: gbpWallet.id,
      amount: 50000,
      quoteId: q.id,
      idempotencyKey: "ex-dup",
    };
    const [a, b] = [await api.exchange.create(r), await api.exchange.create(r)];
    expect(a.id).toBe(b.id);
    const updatedKes = getState().wallets.find((w) => w.id === kesWallet.id)!;
    expect(updatedKes.available).toBe(kesWallet.available - 50000);
  });

  it("rejects same-currency exchange", async () => {
    const w = getKesWallet();
    await expect(api.exchange.quote(w.id, w.id, 1000)).rejects.toThrow(/different currencies/);
  });

  it("rejects exchange with insufficient funds", async () => {
    const kesWallet = getKesWallet();
    const gbpWallet = await api.wallets.create({ currency: "GBP", idempotencyKey: "ex-3" });
    const q = await api.exchange.quote(kesWallet.id, gbpWallet.id, 999_000_000);
    await expect(
      api.exchange.create({
        sourceWalletId: kesWallet.id,
        destWalletId: gbpWallet.id,
        amount: 999_000_000,
        quoteId: q.id,
        idempotencyKey: "ex-insuf",
      }),
    ).rejects.toThrow(/too low/);
  });
});

describe("portfolio summary", () => {
  beforeEach(approvedKycState);

  it("aggregates wallets to KES total", async () => {
    const summary = await api.portfolio.summary("KES");
    const kesWallet = getKesWallet();
    expect(summary.displayCurrency).toBe("KES");
    expect(summary.walletCount).toBeGreaterThanOrEqual(2);
    expect(summary.totalValueMinor).toBeGreaterThanOrEqual(kesWallet.available);
  });

  it("aggregates multi-currency wallets to KES with rates", async () => {
    await api.wallets.create({ currency: "GBP", idempotencyKey: "pf-1" });
    await api.wallets.create({ currency: "EUR", idempotencyKey: "pf-2" });
    const summary = await api.portfolio.summary("KES");
    expect(summary.walletCount).toBeGreaterThanOrEqual(4);
    expect(summary.ratesUsed["USD"]).toBeDefined();
    expect(summary.ratesUsed["GBP"]).toBeDefined();
    expect(summary.ratesUsed["EUR"]).toBeDefined();
  });
});

describe("beneficiary edit", () => {
  beforeEach(approvedKycState);

  it("updates a beneficiary name", async () => {
    const b = await api.beneficiaries.create({
      name: "Old Name",
      type: "wallet",
      destination: "100000000001",
      currency: "KES",
    });
    const updated = await api.beneficiaries.update(b.id, { name: "New Name" });
    expect(updated.name).toBe("New Name");
    expect(updated.id).toBe(b.id);
  });

  it("updates beneficiary currency", async () => {
    const b = await api.beneficiaries.create({
      name: "Test",
      type: "bank",
      destination: "ACC123",
      provider: "KCB",
      currency: "KES",
    });
    const updated = await api.beneficiaries.update(b.id, { currency: "USD" });
    expect(updated.currency).toBe("USD");
  });

  it("preserves owner on update", async () => {
    const b = await api.beneficiaries.create({
      name: "Test",
      type: "wallet",
      destination: "100000000002",
      currency: "KES",
    });
    const updated = await api.beneficiaries.update(b.id, { name: "Renamed" });
    expect(updated.ownerId).toBe("u_amina");
  });
});

describe("support tickets", () => {
  beforeEach(approvedKycState);

  it("creates and lists a support ticket", async () => {
    const t = await api.support.create({
      category: "Transaction issue",
      subject: "Missing deposit",
      description: "My deposit has not arrived",
    });
    expect(t.status).toBe("open");
    expect(t.messages).toHaveLength(1);
    const list = await api.support.list();
    expect(list.find((x) => x.id === t.id)).toBeDefined();
  });

  it("replies to a support ticket", async () => {
    const t = await api.support.create({
      category: "General",
      subject: "Question",
      description: "How do I exchange?",
    });
    const updated = await api.support.reply(t.id, "Thanks, got it");
    expect(updated.messages).toHaveLength(2);
    expect(updated.messages[1].body).toBe("Thanks, got it");
  });
});

describe("account limits", () => {
  it("returns all four limit types", async () => {
    const limits = await api.limits.get();
    expect(limits.dailyTransferLimit).toBeGreaterThan(0);
    expect(limits.dailyWithdrawalLimit).toBeGreaterThan(0);
    expect(limits.singleTransactionLimit).toBeGreaterThan(0);
    expect(limits.monthlyVolumeLimit).toBeGreaterThan(0);
    expect(limits.currency).toBe("KES");
  });
});
