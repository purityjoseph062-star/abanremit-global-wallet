import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { api, ApiException, newIdempotencyKey } from "@/lib/api";
import type { Quote, Transaction } from "@/lib/domain/types";
import { formatMoney, toMinor } from "@/lib/money";
import { PageHeader } from "@/components/portal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { download, receiptText, TxDetail } from "@/components/tx";

export const Route = createFileRoute("/app/send")({ component: Send });
const STEPS = ["Source & recipient", "Amount & quote", "Confirm & authorise", "Result"];

function Send() {
  const qc = useQueryClient();
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  const bens = useQuery({ queryKey: ["beneficiaries"], queryFn: api.beneficiaries.list });
  const [step, setStep] = useState(0);
  const [walletId, setWalletId] = useState("");
  const [benId, setBenId] = useState("");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pin, setPin] = useState("");
  const [simulate, setSimulate] = useState<"success" | "pending" | "failure">("success");
  const [result, setResult] = useState<Transaction | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const idem = useRef(newIdempotencyKey());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const wallet = wallets.data?.find((w) => w.id === walletId);
  const ben = bens.data?.find((b) => b.id === benId);
  const secsLeft = quote
    ? Math.max(0, Math.round((new Date(quote.expiresAt).getTime() - now) / 1000))
    : 0;

  const getQuote = useMutation({
    mutationFn: () =>
      api.transfers.quote(walletId, benId, toMinor(Number(amount), wallet!.currency)),
    onSuccess: (q) => {
      setQuote(q);
      setErr(null);
    },
    onError: (e) => setErr(e.message),
  });
  const submit = useMutation({
    mutationFn: () =>
      api.transfers.create({
        walletId,
        beneficiaryId: benId,
        amount: quote!.amount,
        quoteId: quote!.id,
        pin,
        idempotencyKey: idem.current,
        simulate,
      }),
    onSuccess: (tx) => {
      setResult(tx);
      setStep(3);
      qc.invalidateQueries();
      toast[tx.status === "failed" ? "error" : "success"](`Demo transfer ${tx.status}`);
    },
    onError: (e) => {
      setErr(e instanceof ApiException ? `${e.message} (ref ${e.error.correlationId})` : e.message);
    },
  });

  const restart = () => {
    setStep(0);
    setQuote(null);
    setPin("");
    setResult(null);
    setAmount("");
    setErr(null);
    idem.current = newIdempotencyKey();
  };
  const sel = "h-10 w-full rounded-md border bg-background px-3 text-sm";
  const amt = Number(amount);
  const amtErr =
    amount &&
    (!(amt > 0)
      ? "Enter an amount above zero"
      : wallet && toMinor(amt, wallet.currency) > wallet.available
        ? "More than your available balance"
        : null);

  return (
    <>
      <PageHeader
        title="Send money"
        desc="Every fee and rate is shown before you confirm. Demo PIN: 1234."
      />
      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {i < step ? <Check className="h-3 w-3" /> : `${i + 1}.`} {s}
          </li>
        ))}
      </ol>
      <div className="max-w-xl rounded-2xl border bg-card p-6">
        {err && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {err}
          </p>
        )}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="w">From wallet</Label>
              <select
                id="w"
                className={sel}
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
              >
                <option value="">Choose…</option>
                {wallets.data?.map((w) => (
                  <option key={w.id} value={w.id} disabled={w.status !== "active"}>
                    {w.currency} · {w.number} · {formatMoney(w.available, w.currency)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="b">Recipient</Label>
              <select
                id="b"
                className={sel}
                value={benId}
                onChange={(e) => setBenId(e.target.value)}
              >
                <option value="">Choose…</option>
                {bens.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {b.type.replace("_", " ")} · {b.currency}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Need someone new?{" "}
                <Link to="/app/beneficiaries" className="text-primary underline">
                  Add a recipient
                </Link>
                .
              </p>
            </div>
            <Button disabled={!walletId || !benId} onClick={() => setStep(1)}>
              Continue
            </Button>
          </div>
        )}
        {step === 1 && wallet && ben && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="a">Amount ({wallet.currency})</Label>
              <Input
                id="a"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setQuote(null);
                }}
              />
              {amtErr && <p className="text-xs text-destructive">{amtErr}</p>}
            </div>
            <Button
              variant="outline"
              disabled={!amount || !!amtErr || getQuote.isPending}
              onClick={() => getQuote.mutate()}
            >
              {getQuote.isPending ? "Calculating…" : "Get quote"}
            </Button>
            {quote && <QuoteBox q={quote} secs={secsLeft} />}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button disabled={!quote || secsLeft === 0} onClick={() => setStep(2)}>
                Review
              </Button>
            </div>
          </div>
        )}
        {step === 2 && quote && ben && wallet && (
          <div className="space-y-4">
            <p className="text-sm">
              Sending to <strong>{ben.name}</strong> ({ben.destination}) from wallet{" "}
              <span className="font-mono">{wallet.number}</span>.
            </p>
            <QuoteBox q={quote} secs={secsLeft} />
            {secsLeft === 0 && (
              <p className="text-sm text-destructive">
                Quote expired.{" "}
                <button
                  className="underline"
                  onClick={() => {
                    setStep(1);
                    setQuote(null);
                  }}
                >
                  Get a new quote
                </button>
                .
              </p>
            )}
            <div>
              <Label htmlFor="pin">Demo PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Simulate outcome (demo)</legend>
              <div className="mt-1 flex gap-3 text-sm">
                {(["success", "pending", "failure"] as const).map((o) => (
                  <label key={o} className="flex items-center gap-1 capitalize">
                    <input
                      type="radio"
                      name="sim"
                      checked={simulate === o}
                      onChange={() => setSimulate(o)}
                    />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="font-mono text-xs text-muted-foreground">
              Idempotency key: {idem.current}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="ghost" onClick={restart}>
                Cancel
              </Button>
              <Button
                disabled={pin.length !== 4 || secsLeft === 0 || submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending
                  ? "Processing…"
                  : `Confirm & send ${formatMoney(quote.totalDebit, quote.sourceCurrency)}`}
              </Button>
            </div>
          </div>
        )}
        {step === 3 && result && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Demo transfer {result.status}</h2>
            <TxDetail t={result} />
            <div className="flex gap-2">
              <Button onClick={() => download(`${result.reference}.txt`, receiptText(result))}>
                Download demo receipt
              </Button>
              <Button variant="outline" onClick={restart}>
                New transfer
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function QuoteBox({ q, secs }: { q: Quote; secs: number }) {
  return (
    <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-4 text-sm">
      <dt>Amount</dt>
      <dd className="text-right">{formatMoney(q.amount, q.sourceCurrency)}</dd>
      <dt>Fee</dt>
      <dd className="text-right">{formatMoney(q.fee, q.sourceCurrency)}</dd>
      <dt>Illustrative rate</dt>
      <dd className="text-right">
        1 {q.sourceCurrency} = {q.rate} {q.destCurrency}
      </dd>
      <dt className="font-semibold">You pay</dt>
      <dd className="text-right font-semibold">{formatMoney(q.totalDebit, q.sourceCurrency)}</dd>
      <dt className="font-semibold">Recipient gets</dt>
      <dd className="text-right font-semibold">{formatMoney(q.destAmount, q.destCurrency)}</dd>
      <dt className="text-muted-foreground">Quote expires</dt>
      <dd className={`text-right ${secs < 15 ? "text-destructive" : "text-muted-foreground"}`}>
        {secs}s
      </dd>
    </dl>
  );
}
