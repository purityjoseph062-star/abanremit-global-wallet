import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Transaction } from "@/lib/domain/types";
import { PageHeader } from "@/components/portal-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { download, receiptText, TxDetail, TxRow } from "@/components/tx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toMajor } from "@/lib/money";

export const Route = createFileRoute("/app/transactions")({ component: Txs });
const PAGE = 5;

function Txs() {
  const txs = useQuery({ queryKey: ["transactions"], queryFn: api.transactions.list });
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [type, setType] = useState(""); const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Transaction | null>(null);
  const rows = useMemo(() => (txs.data ?? []).filter((t) => (!status || t.status === status) && (!type || t.type === type) && (t.reference + t.counterparty).toLowerCase().includes(q.toLowerCase())), [txs.data, q, status, type]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const sel = "h-10 rounded-md border bg-background px-3 text-sm";
  const csv = () => download("abanremit-demo-statement.csv",
    ["reference,date,type,channel,status,currency,amount,fee,counterparty", ...rows.map((t) => [t.reference, t.createdAt, t.type, t.channel, t.status, t.currency, toMajor(t.amount, t.currency), toMajor(t.fee, t.currency), `"${t.counterparty}"`].join(","))].join("\n"), "text/csv");
  return (
    <>
      <PageHeader title="Transactions" desc="Search, filter and export your demo history." action={<Button variant="outline" onClick={csv}>Export CSV (demo)</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search reference or name" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label="Search transactions" />
        <select className={sel} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label="Status"><option value="">All statuses</option>{["pending", "processing", "completed", "failed", "reversed"].map((s) => <option key={s}>{s}</option>)}</select>
        <select className={sel} value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} aria-label="Type"><option value="">All types</option>{["transfer", "deposit", "withdrawal", "exchange", "cash_in"].map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="rounded-2xl border bg-card px-5 divide-y">
        {rows.slice(page * PAGE, page * PAGE + PAGE).map((t) => <TxRow key={t.id} t={t} onOpen={() => setOpen(t)} />)}
        {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No transactions match these filters.</p>}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm"><span>Page {page + 1} of {pages}</span>
        <span className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button></span></div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Transaction details</DialogTitle></DialogHeader>
          {open && <><TxDetail t={open} /><Button onClick={() => download(`${open.reference}.txt`, receiptText(open))}>Download demo receipt</Button></>}
        </DialogContent>
      </Dialog>
    </>
  );
}
