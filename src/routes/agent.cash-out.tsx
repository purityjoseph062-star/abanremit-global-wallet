import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { api, newIdempotencyKey } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stepper, SummaryList } from "@/components/flow";
import { TxDetail, download, receiptText, printReceipt } from "@/components/tx";
import { formatMoney, toMinor } from "@/lib/money";
import type { CustomerSummary, Transaction, Wallet } from "@/lib/domain/types";

export const Route = createFileRoute("/agent/cash-out")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.cash_out.create"),
  head: () => ({ meta: [{ title: "Cash Out — Agent portal" }] }),
  component: AgentCashOut,
});

const STEPS = ["Customer", "Wallet", "Amount", "Review", "Payout", "Result"];

function AgentCashOut() {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [customerWallets, setCustomerWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [tx, setTx] = useState<Transaction | null>(null);
  const idem = useRef(newIdempotencyKey());

  const agentWallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  const agentW = agentWallets.data?.find((w) => w.accountType === "agent");

  const search = useMutation({
    mutationFn: () => api.agents.searchCustomers(query),
    onSuccess: (r) => {
      if (r.length === 0) toast.error("No customers found");
    },
    onError: (e) => toast.error(e.message),
  });

  const lookupWallets = useMutation({
    mutationFn: (custId: string) => api.agents.customerWallets(custId),
  });

  const cashOut = useMutation({
    mutationFn: () => {
      if (!agentW || !selectedWalletId) throw new Error("Missing selection");
      const custWallet = customerWallets.find((w) => w.id === selectedWalletId);
      if (!custWallet) throw new Error("Customer wallet not found");
      return api.agents.cashOut({
        agentWalletId: agentW.id,
        customerWalletId: custWallet.id,
        amount: toMinor(Number(amount), custWallet.currency),
        idempotencyKey: idem.current,
      });
    },
    onSuccess: (t) => {
      setTx(t);
      setStep(4);
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const confirmPayout = useMutation({
    mutationFn: () => api.agents.confirmPayout(tx!.id),
    onSuccess: (t) => {
      setTx(t);
      setStep(5);
      qc.invalidateQueries();
      toast.success("Cash-out completed — payout confirmed");
    },
    onError: (e) => toast.error(e.message),
  });

  const reportFailure = useMutation({
    mutationFn: () => api.agents.reportPayoutFailure(tx!.id, "Customer did not collect cash"),
    onSuccess: (t) => {
      setTx(t);
      setStep(5);
      qc.invalidateQueries();
      toast.success("Payout failure reported — held funds released");
    },
    onError: (e) => toast.error(e.message),
  });

  const reset = () => {
    setStep(0);
    setQuery("");
    setSelectedCustomer(null);
    setCustomerWallets([]);
    setSelectedWalletId("");
    setAmount("");
    setConfirmed(false);
    setTx(null);
    idem.current = newIdempotencyKey();
  };

  const selectedWallet = customerWallets.find((w) => w.id === selectedWalletId);
  const currency = selectedWallet?.currency ?? "KES";
  const amountMinor = toMinor(Number(amount) || 0, currency);
  const fee = Math.round(amountMinor * 0.01);
  const totalDebit = amountMinor + fee;
  const commissionEst = Math.round(amountMinor * 0.005);

  return (
    <div>
      <PageHeader
        title="Cash Out"
        desc="Process a customer withdrawal with physical cash payout."
      />
      <Stepper steps={STEPS} current={step} />

      {tx && step === 5 ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <TxDetail t={tx} />
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => download(`${tx.reference}.txt`, receiptText(tx))}>
              Download receipt
            </Button>
            <Button variant="outline" onClick={() => printReceipt(tx)}>
              Print
            </Button>
            <Button variant="outline" onClick={reset}>
              New cash-out
            </Button>
          </div>
        </div>
      ) : tx && step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Physical cash payout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-warning/10 p-3 text-sm">
              <p className="font-semibold">Awaiting payout confirmation</p>
              <p className="text-muted-foreground">
                Transaction <span className="font-mono">{tx.reference}</span> is processing.
                Customer funds are held. Confirm that physical cash has been handed to the customer
                to finalize the debit.
              </p>
            </div>
            <SummaryList
              rows={[
                ["Customer", selectedCustomer?.name ?? ""],
                ["Withdrawal amount", formatMoney(tx.amount, tx.currency)],
                ["Fee (1%)", formatMoney(tx.fee, tx.currency)],
                ["Total customer debit", formatMoney(tx.amount + tx.fee, tx.currency), true],
                ["Physical cash to pay", formatMoney(tx.amount, tx.currency), true],
              ]}
            />
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I confirm that DEMO cash of <strong>{formatMoney(tx.amount, tx.currency)}</strong>{" "}
                has been paid to the customer. This is a simulated confirmation.
              </span>
            </label>
            <div className="flex gap-2">
              <Button
                disabled={!confirmed || confirmPayout.isPending}
                onClick={() => confirmPayout.mutate()}
              >
                {confirmPayout.isPending ? "Processing…" : "Confirm payout"}
              </Button>
              <Button
                variant="outline"
                disabled={reportFailure.isPending}
                onClick={() => reportFailure.mutate()}
              >
                Report payout failure
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : step === 0 ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="q">Search customer</Label>
              <div className="flex gap-2">
                <Input
                  id="q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name or phone"
                  onKeyDown={(e) => e.key === "Enter" && search.mutate()}
                />
                <Button
                  disabled={!query.trim() || search.isPending}
                  onClick={() => search.mutate()}
                >
                  <Search className="mr-1 h-4 w-4" /> Find
                </Button>
              </div>
            </div>
            {search.data && search.data.length > 0 && (
              <div className="divide-y rounded-xl border">
                {search.data.map((c) => (
                  <button
                    key={c.id}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/50"
                    onClick={() => {
                      setSelectedCustomer(c);
                      setSelectedWalletId("");
                      lookupWallets.mutate(c.id, {
                        onSuccess: (ws) => {
                          setCustomerWallets(ws);
                          setStep(1);
                        },
                        onError: (e) => toast.error(e.message),
                      });
                    }}
                  >
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.maskedPhone} · {c.kycStatus.replace(/_/g, " ")}
                      </p>
                    </div>
                    <StatusBadge status={c.accountStatus} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select customer wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {customerWallets.map((w) => {
                const disabled = w.status !== "active";
                return (
                  <button
                    key={w.id}
                    disabled={disabled}
                    onClick={() => {
                      setSelectedWalletId(w.id);
                      setStep(2);
                    }}
                    className={`rounded-xl border p-4 text-left transition disabled:opacity-50 hover:border-primary/50`}
                  >
                    <p className="font-semibold">{w.currency} wallet</p>
                    <p className="text-xs text-muted-foreground font-mono">{w.number}</p>
                    <StatusBadge status={w.status} />
                    <p className="mt-1 text-sm text-muted-foreground">
                      Available: {formatMoney(w.available, w.currency)}
                    </p>
                    {disabled && <p className="mt-1 text-xs text-destructive">Not eligible</p>}
                  </button>
                );
              })}
            </div>
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
          </CardContent>
        </Card>
      ) : step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Enter withdrawal amount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="amt">Amount ({currency})</Label>
              <Input
                id="amt"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {Number(amount) > 0 && (
              <SummaryList
                rows={[
                  ["Withdrawal amount", formatMoney(amountMinor, currency)],
                  ["Fee (1%, added on top)", formatMoney(fee, currency)],
                  ["Total customer debit", formatMoney(totalDebit, currency), true],
                  ["Physical cash to customer", formatMoney(amountMinor, currency), true],
                  ["Agent commission (est.)", formatMoney(commissionEst, currency)],
                ]}
              />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button disabled={!(Number(amount) > 0)} onClick={() => setStep(3)}>
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Review and initiate cash-out</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryList
              rows={[
                ["Customer", selectedCustomer?.name ?? ""],
                ["Wallet currency", currency],
                ["Withdrawal amount", formatMoney(amountMinor, currency)],
                ["Fee (1%)", formatMoney(fee, currency)],
                ["Total customer debit", formatMoney(totalDebit, currency), true],
                ["Physical cash to pay", formatMoney(amountMinor, currency), true],
              ]}
            />
            <p className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
              Initiating this cash-out will reserve the customer's funds. You must then confirm the
              physical payout before the debit is finalized.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button disabled={cashOut.isPending} onClick={() => cashOut.mutate()}>
                {cashOut.isPending ? "Processing…" : "Initiate cash-out"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
