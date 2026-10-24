import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { api, newIdempotencyKey } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { copy } from "@/components/wallet-bits";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode, CurrencyInfo, Wallet } from "@/lib/domain/types";

export const Route = createFileRoute("/app/wallets/create")({ component: WalletCreate });

const STEPS = ["Choose currency", "Review", "Confirm", "Done"];

function WalletCreate() {
  const qc = useQueryClient();
  const currencies = useQuery({ queryKey: ["currencies"], queryFn: api.currencies.list });
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<CurrencyInfo | null>(null);
  const [eligibility, setEligibility] = useState<{ canCreate: boolean; reason?: string } | null>(null);
  const [created, setCreated] = useState<Wallet | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const idem = useRef(newIdempotencyKey());

  const availableCurrencies = currencies.data?.filter((c) => c.demoAvailable) ?? [];
  const userWallets = wallets.data ?? [];

  const checkEligibility = useMutation({
    mutationFn: (c: CurrencyCode) => api.wallets.eligibility(c),
    onSuccess: (e) => {
      setEligibility(e);
      if (e.canCreate) {
        setStep(1);
        setErr(null);
      } else {
        setErr(e.reason ?? "Not eligible");
      }
    },
    onError: (e) => setErr(e.message),
  });

  const createWallet = useMutation({
    mutationFn: () => api.wallets.create({ currency: selected!.code, idempotencyKey: idem.current }),
    onSuccess: (w) => {
      setCreated(w);
      setStep(3);
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success(`${w.currency} wallet created`);
    },
    onError: (e) => {
      setErr(e.message);
      setStep(2);
      idem.current = newIdempotencyKey();
    },
  });

  const pickCurrency = (c: CurrencyInfo) => {
    const existing = userWallets.find((w) => w.currency === c.code);
    if (existing) {
      setErr(`You already have a ${c.code} wallet.`);
      setEligibility({ canCreate: false, reason: `You already have a ${c.code} wallet.`, existingWalletId: existing.id });
      return;
    }
    setSelected(c);
    setErr(null);
    checkEligibility.mutate(c.code);
  };

  const restart = () => {
    setStep(0);
    setSelected(null);
    setEligibility(null);
    setCreated(null);
    setErr(null);
    idem.current = newIdempotencyKey();
  };

  return (
    <>
      <PageHeader
        title="Create a wallet"
        desc="Open a new currency wallet under your account."
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

      {err && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {err}
        </div>
      )}

      <div className="max-w-2xl">
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a currency for your new wallet. You can have one wallet per currency.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {availableCurrencies.map((c) => {
                const hasWallet = userWallets.find((w) => w.currency === c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => pickCurrency(c)}
                    disabled={checkEligibility.isPending}
                    className={`flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition hover:border-primary disabled:opacity-50 ${
                      selected?.code === c.code ? "border-primary ring-2 ring-primary/20" : ""
                    }`}
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-lg bg-secondary text-lg font-bold">
                      {c.symbol}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{c.code} — {c.name}</p>
                      {hasWallet ? (
                        <p className="text-xs text-muted-foreground">
                          You have this wallet · {formatMoney(hasWallet.available, hasWallet.currency)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Available</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {availableCurrencies.length === 0 && !currencies.isLoading && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading available currencies…
              </p>
            )}
          </div>
        )}

        {step === 1 && selected && (
          <Card>
            <CardHeader>
              <CardTitle>Review wallet details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Currency</dt>
                <dd className="font-semibold">{selected.code} — {selected.name}</dd>
                <dt className="text-muted-foreground">Symbol</dt>
                <dd>{selected.symbol}</dd>
                <dt className="text-muted-foreground">Initial balance</dt>
                <dd>{formatMoney(0, selected.code as CurrencyCode)}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd>Active</dd>
              </dl>
              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <p>Creating a wallet does not deposit money into it. You can add funds separately after creation.</p>
                <p className="mt-1">No fees apply to wallet creation in this demo.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                <Button onClick={() => setStep(2)}>Proceed to confirm</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && selected && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm creation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                You are about to create a <strong>{selected.code}</strong> wallet. A unique wallet
                number will be generated by the system.
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                Idempotency key: {idem.current}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button
                  disabled={createWallet.isPending}
                  onClick={() => createWallet.mutate()}
                >
                  {createWallet.isPending ? "Creating…" : "Create wallet"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && created && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-success" /> Wallet created
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Currency</dt>
                <dd className="font-semibold">{created.currency}</dd>
                <dt className="text-muted-foreground">Wallet number</dt>
                <dd>
                  <button
                    onClick={() => copy(created.number, "Wallet number copied")}
                    className="inline-flex items-center gap-1.5 font-mono text-sm hover:text-primary"
                  >
                    {created.number} <Copy className="h-3.5 w-3.5" />
                  </button>
                </dd>
                <dt className="text-muted-foreground">Balance</dt>
                <dd>{formatMoney(created.available, created.currency)}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{created.status}</dd>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date().toLocaleString()}</dd>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Link to="/app/wallets/$walletId" params={{ walletId: created.id }}>
                  <Button>View wallet</Button>
                </Link>
                <Link to="/app/deposit">
                  <Button variant="outline">Add money</Button>
                </Link>
                <Link to="/app">
                  <Button variant="ghost">Back to dashboard</Button>
                </Link>
                <Button variant="ghost" onClick={restart}>Create another</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
