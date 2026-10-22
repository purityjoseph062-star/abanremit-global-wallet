import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { requirePermission } from "@/lib/guard";
import { DemoBanner, Logo, StatusBadge } from "@/components/brand";
import { currentUser, setState, useDemo } from "@/lib/demo/store";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => requirePermission("portal.admin"),
  head: () => ({ meta: [{ title: "Administration — AbanRemit demo" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

function Admin() {
  const s = useDemo((x) => x);
  const me = currentUser(s)!;
  const navigate = Route.useNavigate();
  const [q, setQ] = useState("");
  const [audit, setAudit] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const kycQueue = s.users.filter((u) => u.kycStatus !== "approved");
  const wallets = s.wallets.filter((w) => w.number.includes(q));
  return (
    <div className="min-h-screen bg-muted">
      <DemoBanner />
      <header className="flex items-center justify-between border-b bg-card px-6 py-3"><Logo /><span className="text-sm text-muted-foreground">{ROLE_LABEL[me.role]}</span>
        <button className="text-sm" onClick={() => { setState((x) => ({ ...x, personaId: null })); navigate({ to: "/login", replace: true }); }}>Sign out</button></header>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">Operations overview <span className="text-sm font-normal text-muted-foreground">(fictional seed metrics)</span></h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[["Customers", s.users.filter((u) => u.role.includes("customer")).length], ["Wallets", s.wallets.length], ["Transactions", s.transactions.length], ["KYC queue", kycQueue.length]].map(([l, v]) => (
            <div key={l} className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{l}</p><p className="font-display text-3xl font-bold">{v}</p></div>))}
        </div>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Wallet operations</h2>
          {can(me.role, "admin.wallets.read") ? (<>
            <Input className="mt-3 max-w-xs" placeholder="Search wallet number" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Number</th><th>Type</th><th>Status</th><th className="text-right">Available</th><th className="text-right">Held</th></tr></thead>
              <tbody>{wallets.map((w) => <tr key={w.id} className="border-t"><td className="py-2 font-mono">{w.number}</td><td className="capitalize">{w.accountType}</td><td><StatusBadge status={w.status} /></td><td className="text-right">{formatMoney(w.available, w.currency)}</td><td className="text-right">{formatMoney(w.held, w.currency)}</td></tr>)}</tbody></table></div>
            <div className="mt-4 rounded-xl bg-muted p-4">
              <p className="text-sm font-medium">Request balance adjustment (controlled workflow — no direct edits)</p>
              <div className="mt-2 flex gap-2"><Input placeholder="Reason (min 10 chars)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <Button disabled={reason.trim().length < 10 || !can(me.role, "admin.adjust.request")} onClick={() => { setAudit((a) => [`${new Date().toLocaleTimeString()} · ${me.name} requested adjustment: "${reason}" — awaiting a different approver`, ...a]); setReason(""); toast.success("Adjustment request logged (demo)"); }}>Submit request</Button></div>
              {!can(me.role, "admin.adjust.request") && <p className="mt-1 text-xs text-destructive">Your role cannot request adjustments.</p>}
            </div>
          </>) : <p className="mt-2 text-sm text-muted-foreground">Your role ({ROLE_LABEL[me.role]}) does not have wallet access.</p>}
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">KYC review queue</h2>
          {kycQueue.map((u) => <div key={u.id} className="mt-3 flex items-center justify-between"><span>{u.name}</span><span className="flex items-center gap-2"><StatusBadge status={u.kycStatus} />
            {can(me.role, "compliance.kyc.review") && <Button size="sm" onClick={() => { setState((x) => ({ ...x, users: x.users.map((y) => y.id === u.id ? { ...y, kycStatus: "approved" } : y), wallets: x.wallets.map((w) => w.ownerId === u.id ? { ...w, status: "active" } : w) })); setAudit((a) => [`${me.name} approved KYC for ${u.name}`, ...a]); }}>Approve</Button>}</span></div>)}
          {kycQueue.length === 0 && <p className="text-sm text-muted-foreground">Queue is empty.</p>}
        </section>
        <section className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">Audit log (this session)</h2>{audit.length === 0 ? <p className="text-sm text-muted-foreground">No sensitive actions yet.</p> : <ul className="mt-2 space-y-1 text-sm">{audit.map((a, i) => <li key={i}>{a}</li>)}</ul>}</section>
      </main>
    </div>
  );
}
