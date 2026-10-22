import type { Transaction } from "@/lib/domain/types";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "./brand";

export function TxRow({ t, onOpen }: { t: Transaction; onOpen?: () => void }) {
  const credit = t.type === "deposit" || t.type === "cash_in";
  return (
    <button onClick={onOpen} disabled={!onOpen} className="flex w-full items-center justify-between gap-3 py-3 text-left enabled:hover:bg-muted/50">
      <span className="min-w-0">
        <span className="block truncate font-medium">{t.counterparty}</span>
        <span className="text-xs text-muted-foreground capitalize">{t.type.replace("_", " ")} · {t.channel.replace("_", " ")} · {new Date(t.createdAt).toLocaleDateString()} · <span className="font-mono">{t.reference}</span></span>
      </span>
      <span className="text-right">
        <span className={`block font-semibold ${credit ? "text-success" : ""}`}>{credit ? "+" : "−"}{formatMoney(t.amount, t.currency)}</span>
        <StatusBadge status={t.status} />
      </span>
    </button>
  );
}

export function receiptText(t: Transaction) {
  return [
    "ABANREMIT DEMO RECEIPT — NOT A REAL TRANSACTION", "",
    `Reference: ${t.reference}`, `Idempotency key: ${t.idempotencyKey}`, `Status: ${t.status}`,
    `Type: ${t.type} / ${t.channel}`, `Counterparty: ${t.counterparty}`,
    `Amount: ${formatMoney(t.amount, t.currency)}`, `Fee: ${formatMoney(t.fee, t.currency)}`,
    t.fxRate ? `Illustrative rate: ${t.fxRate}` : "", t.destAmount && t.destCurrency ? `Recipient gets: ${formatMoney(t.destAmount, t.destCurrency)}` : "",
    `Date: ${new Date(t.createdAt).toLocaleString()}`, "", "Ledger (demo journal):",
    ...t.ledger.map((l) => `  ${l.account.padEnd(36)} Dr ${formatMoney(l.debit, l.currency).padStart(14)}  Cr ${formatMoney(l.credit, l.currency).padStart(14)}`),
  ].filter((x) => x !== "").join("\n");
}

export function download(name: string, content: string, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

export function TxDetail({ t }: { t: Transaction }) {
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-2">
        <dt className="text-muted-foreground">Reference</dt><dd className="font-mono">{t.reference}</dd>
        <dt className="text-muted-foreground">Amount</dt><dd>{formatMoney(t.amount, t.currency)}</dd>
        <dt className="text-muted-foreground">Fee</dt><dd>{formatMoney(t.fee, t.currency)}</dd>
        {t.fxRate && <><dt className="text-muted-foreground">Illustrative rate</dt><dd>{t.fxRate}</dd></>}
        {t.destAmount && t.destCurrency && <><dt className="text-muted-foreground">Recipient gets</dt><dd>{formatMoney(t.destAmount, t.destCurrency)}</dd></>}
        <dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={t.status} /></dd>
      </dl>
      <div>
        <h3 className="font-semibold">Timeline</h3>
        <ol className="mt-2 space-y-2 border-l pl-4">{t.timeline.map((e, i) => <li key={i}><StatusBadge status={e.status} /> <span className="text-muted-foreground">{new Date(e.at).toLocaleString()}</span><p>{e.note}</p></li>)}</ol>
      </div>
      <div>
        <h3 className="font-semibold">Demo ledger journal</h3>
        {t.ledger.length === 0 ? <p className="text-muted-foreground">No entries posted (not finalised).</p> : (
          <table className="mt-2 w-full text-xs"><thead><tr className="text-left text-muted-foreground"><th>Account</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
            <tbody>{t.ledger.map((l, i) => <tr key={i} className="border-t"><td className="py-1">{l.account}</td><td className="text-right">{l.debit ? formatMoney(l.debit, l.currency) : "—"}</td><td className="text-right">{l.credit ? formatMoney(l.credit, l.currency) : "—"}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
}
