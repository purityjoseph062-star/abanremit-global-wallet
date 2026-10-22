import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { HandCoins } from "lucide-react";
import { api, newIdempotencyKey } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { DemoBanner, Logo } from "@/components/brand";
import { WalletCard } from "@/components/wallet-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { download, receiptText, TxDetail } from "@/components/tx";
import { formatMoney, toMinor } from "@/lib/money";
import type { Transaction } from "@/lib/domain/types";
import { setState } from "@/lib/demo/store";

export const Route = createFileRoute("/agent")({
  ssr: false,
  beforeLoad: () => requirePermission("portal.agent"),
  head: () => ({ meta: [{ title: "Agent portal — AbanRemit demo" }, { name: "robots", content: "noindex" }] }),
  component: Agent,
});

function Agent() {
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  const agentW = wallets.data?.[0];
  const [num, setNum] = useState("");
  const [found, setFound] = useState<{ number: string; maskedName: string; currency: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [tx, setTx] = useState<Transaction | null>(null);
  const idem = useRef(newIdempotencyKey());
  const lookup = useMutation({ mutationFn: () => api.wallets.lookup(num), onSuccess: (r) => { setFound(r); if (!r) toast.error("No wallet with that number"); } });
  const cashIn = useMutation({
    mutationFn: () => api.agents.cashIn({ agentWalletId: agentW!.id, customerWalletNumber: found!.number, amount: toMinor(Number(amount), "KES"), idempotencyKey: idem.current }),
    onSuccess: (t) => { setTx(t); qc.invalidateQueries(); toast.success("Demo cash-in posted"); },
    onError: (e) => toast.error(e.message),
  });
  const reset = () => { setNum(""); setFound(null); setAmount(""); setConfirmed(false); setTx(null); idem.current = newIdempotencyKey(); };
  return (
    <div className="min-h-screen bg-muted">
      <DemoBanner />
      <header className="flex items-center justify-between border-b bg-card px-6 py-3"><Logo /><span className="text-sm text-muted-foreground">Agent portal</span>
        <button className="text-sm" onClick={() => { setState((s) => ({ ...s, personaId: null })); navigate({ to: "/login", replace: true }); }}>Sign out</button></header>
      <main className="mx-auto grid max-w-5xl gap-6 p-6 lg:grid-cols-[360px_1fr]">
        <div>{agentW && <WalletCard w={agentW} />}<p className="mt-2 text-xs text-muted-foreground">Available float (demo). Single-transaction limit KES 100,000.</p></div>
        <section className="rounded-2xl border bg-card p-6">
          <h1 className="flex items-center gap-2 text-xl font-bold"><HandCoins className="h-5 w-5 text-primary" /> Cash-in <span className="rounded bg-accent px-2 text-xs text-accent-foreground">DEMO</span></h1>
          {tx ? (<div className="mt-4 space-y-4"><TxDetail t={tx} /><div className="flex gap-2"><Button onClick={() => download(`${tx.reference}.txt`, receiptText(tx))}>Receipt</Button><Button variant="outline" onClick={reset}>New cash-in</Button></div></div>) : (
            <div className="mt-4 space-y-4">
              <div><Label htmlFor="cn">Customer wallet number</Label><div className="flex gap-2"><Input id="cn" value={num} onChange={(e) => { setNum(e.target.value.trim()); setFound(null); }} placeholder="100000284751" /><Button variant="outline" disabled={!/^\d{12}$/.test(num) || lookup.isPending} onClick={() => lookup.mutate()}>Find</Button></div></div>
              {found && <>
                <p className="rounded-lg bg-secondary p-3 text-sm">Customer: <strong>{found.maskedName}</strong> · {found.currency} wallet (privacy-masked)</p>
                <div><Label htmlFor="amt">Amount (KES)</Label><Input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />I confirm DEMO cash of {Number(amount) > 0 ? formatMoney(toMinor(Number(amount), "KES"), "KES") : "—"} was received (simulated, no real cash).</label>
                <Button disabled={!confirmed || !(Number(amount) > 0) || cashIn.isPending} onClick={() => cashIn.mutate()}>{cashIn.isPending ? "Posting…" : "Credit customer"}</Button>
              </>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
