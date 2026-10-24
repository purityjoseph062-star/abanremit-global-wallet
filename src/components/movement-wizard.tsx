import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import type { MovementMethod, MovementQuote, Transaction } from "@/lib/domain/types";
import { DEPOSIT_METHODS, KENYA_MOBILE, WITHDRAW_METHODS } from "@/lib/methods";
import { formatMoney, toMajor, toMinor } from "@/lib/money";
import { MethodPicker, QuoteRows, Stepper, SummaryList, WalletPicker } from "./flow";
import { TxActions } from "./tx";
import { StatusBadge } from "./brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const newKey = () => `idem-${crypto.randomUUID()}`;

export function MovementWizard({ kind }: { kind: "deposit" | "withdrawal" }) {
  const dep = kind === "deposit";
  const svc = dep ? api.deposits : api.withdrawals;
  const methods = dep ? DEPOSIT_METHODS : WITHDRAW_METHODS;
  const qc = useQueryClient();
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  const bens = useQuery({
    queryKey: ["beneficiaries"],
    queryFn: api.beneficiaries.list,
    enabled: !dep,
  });
  const [step, setStep] = useState(0);
  const [walletId, setWalletId] = useState("");
  const [method, setMethod] = useState<MovementMethod>(methods[0]!.id);
  const [amountStr, setAmountStr] = useState("");
  const [phone, setPhone] = useState("+2547");
  const [benId, setBenId] = useState("");
  const [pin, setPin] = useState("");
  const [quote, setQuote] = useState<MovementQuote | null>(null);
  const [tx, setTx] = useState<Transaction | null>(null);
  const [key, setKey] = useState(newKey);

  const wallet = wallets.data?.find((w) => w.id === walletId);
  const dests = useMemo(
    () => (bens.data ?? []).filter((b) => b.type === method && b.currency === wallet?.currency),
    [bens.data, method, wallet],
  );

  const getQuote = useMutation({
    mutationFn: () => svc.quote(walletId, method, toMinor(Number(amountStr), wallet!.currency)),
    onSuccess: (q) => {
      setQuote(q);
      setStep(3);
    },
    onError: (e) => toast.error(e.message),
  });
  const submit = useMutation({
    mutationFn: () =>
      dep
        ? api.deposits.create({
            walletId,
            method,
            amount: quote!.amount,
            payerPhone: method === "mobile_money" ? phone : undefined,
            idempotencyKey: key,
          })
        : api.withdrawals.create({
            walletId,
            method,
            amount: quote!.amount,
            beneficiaryId: method === "agent" ? undefined : benId,
            pin,
            idempotencyKey: key,
          }),
    onSuccess: (t) => {
      setTx(t);
      setStep(4);
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const restart = () => {
    setStep(0);
    setAmountStr("");
    setPin("");
    setQuote(null);
    setTx(null);
    setKey(newKey());
  };
  const steps = dep
    ? ["Wallet", "Method", "Details", "Review", "Status"]
    : ["Wallet", "Method", "Details", "Confirm", "Status"];
  const amountOk = Number(amountStr) > 0;
  const detailsOk =
    amountOk &&
    (dep ? method !== "mobile_money" || KENYA_MOBILE.test(phone) : method === "agent" || !!benId);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-5 md:p-7">
      <Stepper steps={steps} current={step} />

      {step === 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            {dep ? "Which wallet should receive the money?" : "Withdraw from which wallet?"}
          </h2>
          {wallets.isLoading ? (
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
          ) : (
            <WalletPicker
              wallets={wallets.data ?? []}
              value={walletId}
              onChange={setWalletId}
              disabled={(w) =>
                w.status !== "active"
                  ? "Wallet not active"
                  : !dep && w.available <= 0
                    ? "No available balance"
                    : null
              }
            />
          )}
          <Button className="w-full" disabled={!walletId} onClick={() => setStep(1)}>
            Continue
          </Button>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            {dep ? "How would you like to add money?" : "Where should the money go?"}
          </h2>
          <MethodPicker
            items={methods}
            value={method}
            onChange={(m) => {
              setMethod(m);
              setBenId("");
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={() => setStep(2)}>Continue</Button>
          </div>
        </section>
      )}

      {step === 2 && wallet && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Enter the details</h2>
          <div>
            <Label htmlFor="amt">Amount ({wallet.currency})</Label>
            <Input
              id="amt"
              inputMode="decimal"
              className="mt-1 text-lg"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0"
            />
            {!dep && (
              <p className="mt-1 text-xs text-muted-foreground">
                Available: {formatMoney(wallet.available, wallet.currency)} · fee is added on top
              </p>
            )}
          </div>
          {dep && method === "mobile_money" && (
            <div>
              <Label htmlFor="ph">Paying phone number</Label>
              <Input
                id="ph"
                inputMode="tel"
                className="mt-1"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
              />
              {phone.length > 5 && !KENYA_MOBILE.test(phone) && (
                <p className="mt-1 text-xs text-destructive">Use the format +2547XXXXXXXX</p>
              )}
            </div>
          )}
          {!dep && method !== "agent" && (
            <div>
              <Label>Saved destination</Label>
              {dests.length === 0 ? (
                <p className="mt-1 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  No saved {method === "bank" ? "bank account" : "mobile-money number"} in{" "}
                  {wallet.currency}.{" "}
                  <Link to="/app/beneficiaries" className="font-semibold text-primary">
                    Add one
                  </Link>
                </p>
              ) : (
                <div className="mt-1 grid gap-2">
                  {dests.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBenId(b.id)}
                      className={`rounded-xl border p-3 text-left text-sm ${benId === b.id ? "border-primary bg-secondary ring-1 ring-primary" : "hover:border-primary/50"}`}
                    >
                      <span className="font-semibold">{b.name}</span>
                      <span className="block text-muted-foreground">
                        {b.provider} · •••• {b.destination.slice(-4)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button disabled={!detailsOk || getQuote.isPending} onClick={() => getQuote.mutate()}>
              {getQuote.isPending ? "Checking…" : "See charges"}
            </Button>
          </div>
        </section>
      )}

      {step === 3 && quote && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            {dep ? "Review your deposit" : "Confirm your withdrawal"}
          </h2>
          <SummaryList rows={QuoteRows(quote)} />
          <p className="text-xs text-muted-foreground">
            Limits for this method: {formatMoney(quote.min, quote.currency)} –{" "}
            {formatMoney(quote.max, quote.currency)}. Demo values only.
          </p>
          {!dep && (
            <div>
              <Label htmlFor="pin">Transaction PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="mt-1 tracking-[0.5em]"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
              />
              <p className="mt-1 text-xs text-muted-foreground">Demo PIN is 1234.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setStep(2)} disabled={submit.isPending}>
              Edit
            </Button>
            <Button
              disabled={submit.isPending || (!dep && pin.length !== 4)}
              onClick={() => submit.mutate()}
            >
              {submit.isPending
                ? "Submitting…"
                : dep
                  ? "Start deposit"
                  : `Withdraw ${formatMoney(quote.amount, quote.currency)}`}
            </Button>
          </div>
        </section>
      )}

      {step === 4 && tx && (
        <section className="space-y-4">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-2 text-lg font-semibold">
              {dep ? "Deposit started" : "Withdrawal submitted"}
            </h2>
            <p className="font-mono text-sm text-muted-foreground">{tx.reference}</p>
            <div className="mt-2">
              <StatusBadge status={tx.status} />
            </div>
          </div>
          {tx.nextAction && <p className="rounded-xl bg-secondary p-3 text-sm">{tx.nextAction}</p>}
          <SummaryList
            rows={[
              ["Amount", formatMoney(tx.amount, tx.currency)],
              ["Fee", formatMoney(tx.fee, tx.currency)],
              [
                dep ? "Will be credited" : "Total held",
                formatMoney(dep ? (tx.destAmount ?? 0) : tx.amount + tx.fee, tx.currency),
                true,
              ],
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {dep
              ? "Your balance only goes up once funding is confirmed."
              : "Money is held, not yet sent. If the payout fails it's returned to your balance."}
          </p>
          <TxActions t={tx} onChange={setTx} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild>
              <Link to="/app/transactions">View history</Link>
            </Button>
            <Button onClick={restart}>New {dep ? "deposit" : "withdrawal"}</Button>
          </div>
        </section>
      )}
      {wallet && step > 0 && step < 4 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {wallet.currency} wallet {wallet.number} · balance{" "}
          {formatMoney(wallet.available, wallet.currency)}
          {amountOk && step === 2
            ? ` · entering ${toMajor(toMinor(Number(amountStr), wallet.currency), wallet.currency)}`
            : ""}
        </p>
      )}
    </div>
  );
}
