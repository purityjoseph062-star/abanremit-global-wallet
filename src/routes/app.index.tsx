import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowLeftRight, Send, Users } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { WalletCard } from "@/components/wallet-bits";
import { TxRow } from "@/components/tx";
import { currentUser, useDemo } from "@/lib/demo/store";
import { demoRate } from "@/lib/money";
import { StatusBadge } from "@/components/brand";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const user = useDemo((s) => currentUser(s));
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  const txs = useQuery({ queryKey: ["transactions"], queryFn: api.transactions.list });
  const pending = txs.data?.filter((t) => t.status === "pending" || t.status === "processing") ?? [];
  return (
    <>
      <PageHeader title={`Hello, ${user?.name.split(" ")[0]}`} desc="Your demo wallets at a glance." action={<span className="flex items-center gap-2 text-sm">Verification <StatusBadge status={user?.kycStatus ?? "draft"} /></span>} />
      <div className="grid gap-4 md:grid-cols-2">
        {wallets.isLoading ? <div className="h-48 animate-pulse rounded-2xl bg-muted" /> : wallets.data?.map((w) => <WalletCard key={w.id} w={w} />)}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[{ to: "/app/send", l: "Send", i: Send }, { to: "/app/receive", l: "Receive", i: ArrowDownLeft }, { to: "/app/beneficiaries", l: "Recipients", i: Users }, { to: "/app/transactions", l: "History", i: ArrowLeftRight }].map((s) => (
          <Link key={s.to} to={s.to} className="flex items-center gap-3 rounded-xl border bg-card p-4 font-semibold transition hover:border-primary"><s.i className="h-5 w-5 text-primary" />{s.l}</Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <h2 className="font-semibold">Recent activity</h2>
          <div className="mt-3 divide-y">{txs.data?.slice(0, 5).map((t) => <TxRow key={t.id} t={t} />)}{txs.data?.length === 0 && <p className="py-6 text-sm text-muted-foreground">No transactions yet.</p>}</div>
        </section>
        <section className="space-y-6">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Pending ({pending.length})</h2>
            {pending.map((t) => <p key={t.id} className="mt-2 text-sm">{t.reference} · <StatusBadge status={t.status} /></p>)}
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Illustrative rates</h2>
            <p className="text-xs text-muted-foreground">Fictional demo values, not live market rates.</p>
            {(["USD", "GBP", "EUR"] as const).map((c) => <p key={c} className="mt-2 flex justify-between text-sm"><span>1 {c}</span><span className="font-mono">{demoRate(c, "KES").toFixed(2)} KES</span></p>)}
          </div>
        </section>
      </div>
    </>
  );
}
