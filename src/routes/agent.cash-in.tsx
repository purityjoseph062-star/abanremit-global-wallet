import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { HandCoins, Search } from "lucide-react";
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

export const Route = createFileRoute("/agent/cash-in")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.cash_in.create"),
  head: () => ({ meta: [{ title: "Cash In — Agent portal" }] }),
  component: AgentCashIn,
});

const STEPS = ["Customer", "Wallet", "Amount", "Confirm", "Result"];

function AgentCashIn() {
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

  const cashIn = useMutation({
    mutationFn: () => {
      const custWallet = customerWallets.find((w) => w.id === selectedWalletId);
      if (!custWallet || !agentW) throw new Error("Missing wallet selection");
      return api.agents.cashIn({
        agentWalletId: agentW.id,
        customerWalletNumber: custWallet.number,
        amount: toMinor(Number(amount), custWallet.currency),
        idempotencyKey: idem.current,
      });
    },
    onSuccess: (t) => {
      setTx(t);
      setStep(4);
      qc.invalidateQueries();
      toast.success("Cash-in completed — customer wallet credited");
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
  const amountMinor = selectedWallet ? toMinor(Number(amount) || 0, selectedWallet.currency) : 0;
  const commissionEst = Math.round(amountMinor * 0.005);

  return (
    <div>
      <PageHeader title="Cash In" desc="Deposit cash into a customer's wallet." />
      <Stepper steps={STEPS} current={step} />

      {tx ? (
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
              New cash-in
            </Button>
          </div>
        </div>
      ) : step === 0 ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="q">Search customer by name, phone, or email</Label>
              <div className="flex gap-2">
                <Input
                  id="q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Amina / +254700…"
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
            <CardTitle>Select destination wallet for {selectedCustomer?.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customerWallets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No wallets found for this customer.</p>
            ) : (
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
                      className={`rounded-xl border p-4 text-left transition disabled:opacity-50 ${selectedWalletId === w.id ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"}`}
                    >
                      <p className="font-semibold">{w.currency} wallet</p>
                      <p className="text-xs text-muted-foreground">{w.number}</p>
                      <StatusBadge status={w.status} />
                      {disabled && (
                        <p className="mt-1 text-xs text-destructive">Not eligible for cash-in</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
          </CardContent>
        </Card>
      ) : step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Enter amount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="amt">Amount ({selectedWallet?.currency})</Label>
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
                  ["Cash received", formatMoney(amountMinor, selectedWallet!.currency)],
                  ["Fee", formatMoney(0, selectedWallet!.currency)],
                  ["Customer credit", formatMoney(amountMinor, selectedWallet!.currency), true],
                  ["Agent commission (est.)", formatMoney(commissionEst, selectedWallet!.currency)],
                  ["Single-transaction limit", formatMoney(10_000_000, selectedWallet!.currency)],
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
            <CardTitle>Confirm cash-in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryList
              rows={[
                ["Customer", selectedCustomer?.name ?? ""],
                ["Destination wallet", `${selectedWallet?.currency} · ${selectedWallet?.number}`],
                [
                  "Cash received (simulated)",
                  formatMoney(amountMinor, selectedWallet!.currency),
                  true,
                ],
                ["Customer credit", formatMoney(amountMinor, selectedWallet!.currency)],
                ["Fee", formatMoney(0, selectedWallet!.currency)],
                ["Agent commission (est.)", formatMoney(commissionEst, selectedWallet!.currency)],
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
                I confirm that DEMO cash of{" "}
                <strong>{formatMoney(amountMinor, selectedWallet!.currency)}</strong> has been
                received from the customer. This is a simulated confirmation — no real cash is
                handled.
              </span>
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button disabled={!confirmed || cashIn.isPending} onClick={() => cashIn.mutate()}>
                {cashIn.isPending ? "Processing…" : "Confirm & credit customer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
