import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { api, ApiException, newIdempotencyKey } from "@/lib/api";
import type { ExchangeQuote, Transaction } from "@/lib/domain/types";
import { formatMoney, toMinor } from "@/lib/money";
import { PageHeader } from "@/components/portal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { download, receiptText, TxDetail } from "@/components/tx";

export const Route = createFileRoute("/app/exchange")({ component: Exchange });
const STEPS = ["Select wallets", "Amount & quote", "Confirm", "Result"];

function Exchange() {
  const qc = useQueryClient();
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  const [step, setStep] = useState(0);
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<ExchangeQuote | null>(null);
  const [result, setResult] = useState<Transaction | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const idem = useRef(newIdempotencyKey());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sourceWallet = wallets.data?.find((w) => w.id === sourceId);
  const destWallet = wallets.data?.find((w) => w.id === destId);
  const secsLeft = quote
    ? Math.max(0, Math.round((new Date(quote.expiresAt).getTime() - now) / 1000))
    : 0;

  const getQuote = useMutation({
    mutationFn: () =>
      api.exchange.quote(sourceId, destId, toMinor(Number(amount), sourceWallet!.currency)),
    onSuccess: (q) => {
      setQuote(q);
      setErr(null);
    },
    onError: (e) => setErr(e.message),
  });

  const submit = useMutation({
    mutationFn: () =>
      api.exchange.create({
        sourceWalletId: sourceId,
        destWalletId: destId,
        amount: quote!.amount,
        quoteId: quote!.id,
        idempotencyKey: idem.current,
      }),
    onSuccess: (tx) => {
      setResult(tx);
      setStep(3);
      qc.invalidateQueries();
      toast.success(`Exchange completed`);
    },
    onError: (e) => {
      setErr(e instanceof ApiException ? `${e.message} (ref ${e.error.correlationId})` : e.message);
    },
  });

  const restart = () => {
    setStep(0);
    setQuote(null);
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
      : sourceWallet && toMinor(amt, sourceWallet.currency) > sourceWallet.available
        ? "More than your available balance"
        : null);

  return (
    <>
      <PageHeader
        title="Exchange currencies"
        desc="Convert between your own wallets at illustrative demo rates."
      />
      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
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
              <Label htmlFor="src">From wallet</Label>
              <select
                id="src"
                className={sel}
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
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
              <Label htmlFor="dst">To wallet (different currency)</Label>
              <select
                id="dst"
                className={sel}
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
              >
                <option value="">Choose…</option>
                {wallets.data
                  ?.filter((w) => w.id !== sourceId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.currency} · {w.number} · {formatMoney(w.available, w.currency)}
                    </option>
                  ))}
              </select>
            </div>
            <Button
              disabled={!sourceId || !destId || sourceId === destId}
              onClick={() => setStep(1)}
            >
              Continue
            </Button>
          </div>
        )}
        {step === 1 && sourceWallet && destWallet && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="amt">Amount ({sourceWallet.currency})</Label>
              <Input
                id="amt"
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
            {quote && (
              <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-4 text-sm">
                <dt>Amount</dt>
                <dd className="text-right">{formatMoney(quote.amount, quote.sourceCurrency)}</dd>
                <dt>Illustrative rate</dt>
                <dd className="text-right">
                  1 {quote.sourceCurrency} = {quote.rate} {quote.destCurrency}
                </dd>
                <dt>Fee</dt>
                <dd className="text-right">{formatMoney(quote.fee, quote.sourceCurrency)}</dd>
                <dt className="font-semibold">You receive</dt>
                <dd className="text-right font-semibold">
                  {formatMoney(quote.destAmount, quote.destCurrency)}
                </dd>
                <dt className="text-muted-foreground">Quote expires</dt>
                <dd className={`text-right ${secsLeft < 15 ? "text-destructive" : "text-muted-foreground"}`}>
                  {secsLeft}s
                </dd>
              </dl>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button disabled={!quote || secsLeft === 0} onClick={() => setStep(2)}>
                Review
              </Button>
            </div>
          </div>
        )}
        {step === 2 && quote && (
          <div className="space-y-4">
            <p className="text-sm">
              Exchanging <strong>{formatMoney(quote.amount, quote.sourceCurrency)}</strong> from{" "}
              <span className="font-mono">{sourceWallet?.number}</span> to{" "}
              <strong>{formatMoney(quote.destAmount, quote.destCurrency)}</strong> in{" "}
              <span className="font-mono">{destWallet?.number}</span>.
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Idempotency key: {idem.current}
            </p>
            {secsLeft === 0 && (
              <p className="text-sm text-destructive">
                Quote expired.{" "}
                <button
                  className="underline"
                  onClick={() => { setStep(1); setQuote(null); }}
                >
                  Get a new quote
                </button>
                .
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button variant="ghost" onClick={restart}>Cancel</Button>
              <Button
                disabled={secsLeft === 0 || submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? "Processing…" : "Confirm exchange"}
              </Button>
            </div>
          </div>
        )}
        {step === 3 && result && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Exchange completed</h2>
            <TxDetail t={result} />
            <div className="flex gap-2">
              <Button onClick={() => download(`${result.reference}.txt`, receiptText(result))}>
                Download receipt
              </Button>
              <Button variant="outline" onClick={restart}>New exchange</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
