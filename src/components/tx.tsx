import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SimulatedOutcome, Transaction } from "@/lib/domain/types";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "./brand";

export function TxRow({ t, onOpen }: { t: Transaction; onOpen?: () => void }) {
  const credit = t.type === "deposit" || t.type === "cash_in";
  const settled = t.status === "completed";
  return (
    <button
      onClick={onOpen}
      disabled={!onOpen}
      className="flex w-full items-center justify-between gap-3 py-3 text-left enabled:hover:bg-muted/50"
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{t.counterparty}</span>
        <span className="text-xs text-muted-foreground capitalize">
          {t.type.replace("_", " ")} · {t.channel.replace("_", " ")} ·{" "}
          {new Date(t.createdAt).toLocaleDateString()} ·{" "}
          <span className="font-mono">{t.reference}</span>
        </span>
      </span>
      <span className="text-right">
        <span
          className={`block font-semibold tabular-nums ${credit && settled ? "text-success" : ""} ${!settled ? "text-muted-foreground" : ""}`}
        >
          {credit ? "+" : "−"}
          {formatMoney(t.amount, t.currency)}
        </span>
        <StatusBadge status={t.status} />
      </span>
    </button>
  );
}

export function receiptText(t: Transaction) {
  return [
    "ABANREMIT DEMO RECEIPT — NOT A REAL TRANSACTION",
    "",
    `Reference: ${t.reference}`,
    `Idempotency key: ${t.idempotencyKey}`,
    `Status: ${t.status}`,
    `Type: ${t.type} / ${t.channel}`,
    `Counterparty: ${t.counterparty}`,
    `Amount: ${formatMoney(t.amount, t.currency)}`,
    `Fee: ${formatMoney(t.fee, t.currency)}`,
    t.fxRate ? `Illustrative rate: ${t.fxRate}` : "",
    t.destAmount && t.destCurrency
      ? `Recipient gets: ${formatMoney(t.destAmount, t.destCurrency)}`
      : "",
    t.destination ? `Destination: ${t.destination}` : "",
    `Date: ${new Date(t.createdAt).toLocaleString()}`,
    "",
    "Ledger (demo journal):",
    ...t.ledger.map(
      (l) =>
        `  ${l.account.padEnd(36)} Dr ${formatMoney(l.debit, l.currency).padStart(14)}  Cr ${formatMoney(l.credit, l.currency).padStart(14)}`,
    ),
  ]
    .filter((x) => x !== "")
    .join("\n");
}

export function printReceipt(t: Transaction) {
  const w = window.open("", "_blank", "width=640,height=800");
  if (!w) {
    toast.error("Allow pop-ups to print the receipt");
    return;
  }
  const esc = (x: string) =>
    x.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  w.document.write(
    `<html><head><title>${t.reference}</title><style>body{font-family:monospace;padding:32px;position:relative}.wm{position:fixed;top:40%;left:10%;font-size:72px;opacity:.08;transform:rotate(-25deg)}</style></head><body><div class="wm">DEMO</div><pre>${esc(receiptText(t))}</pre><script>window.print()</script></body></html>`,
  );
  w.document.close();
}

export function TxActions({
  t,
  onChange,
}: {
  t: Transaction;
  onChange?: (t: Transaction) => void;
}) {
  const qc = useQueryClient();
  const svc =
    t.type === "deposit" ? api.deposits : t.type === "withdrawal" ? api.withdrawals : null;
  const sim = useMutation({
    mutationFn: (o: SimulatedOutcome) => svc!.simulate(t.id, o),
    onSuccess: (x) => {
      qc.invalidateQueries();
      onChange?.(x);
      toast.success(`Now ${x.status}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const cancel = useMutation({
    mutationFn: () => svc!.cancel(t.id),
    onSuccess: (x) => {
      qc.invalidateQueries();
      onChange?.(x);
      toast.success("Cancelled");
    },
    onError: (e) => toast.error(e.message),
  });
  const busy = sim.isPending || cancel.isPending;
  const open = t.status === "pending" || t.status === "processing";
  return (
    <div className="space-y-3">
      {svc &&
        api.mode === "demo" &&
        (open || (t.type === "withdrawal" && t.status === "completed")) && (
          <div className="rounded-xl border border-dashed border-warning bg-warning/10 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide">
              Demo controls — simulate provider
            </p>
            <div className="flex flex-wrap gap-2">
              {open && (
                <>
                  <Button size="sm" disabled={busy} onClick={() => sim.mutate("success")}>
                    Confirm success
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => sim.mutate("failure")}
                  >
                    Fail
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => sim.mutate("expire")}
                  >
                    Time out
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => cancel.mutate()}>
                    Cancel request
                  </Button>
                </>
              )}
              {t.type === "withdrawal" && t.status === "completed" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => sim.mutate("reverse")}
                >
                  Simulate reversal
                </Button>
              )}
            </div>
          </div>
        )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => download(`${t.reference}.txt`, receiptText(t))}
        >
          Download receipt
        </Button>
        <Button size="sm" variant="outline" onClick={() => printReceipt(t)}>
          Print
        </Button>
      </div>
    </div>
  );
}

export function download(name: string, content: string, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function TxDetail({ t }: { t: Transaction }) {
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-2">
        <dt className="text-muted-foreground">Reference</dt>
        <dd className="font-mono">{t.reference}</dd>
        <dt className="text-muted-foreground">Amount</dt>
        <dd>{formatMoney(t.amount, t.currency)}</dd>
        <dt className="text-muted-foreground">Fee</dt>
        <dd>{formatMoney(t.fee, t.currency)}</dd>
        {t.fxRate && (
          <>
            <dt className="text-muted-foreground">Illustrative rate</dt>
            <dd>{t.fxRate}</dd>
          </>
        )}
        {t.destAmount && t.destCurrency && (
          <>
            <dt className="text-muted-foreground">
              {t.type === "deposit" ? "Amount credited" : "Recipient gets"}
            </dt>
            <dd>{formatMoney(t.destAmount, t.destCurrency)}</dd>
          </>
        )}
        {t.destination && (
          <>
            <dt className="text-muted-foreground">Destination</dt>
            <dd>{t.destination}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Status</dt>
        <dd>
          <StatusBadge status={t.status} />
        </dd>
      </dl>
      {t.nextAction && (
        <p className="rounded-lg bg-secondary p-3 text-secondary-foreground">
          <strong>Next step:</strong> {t.nextAction}
        </p>
      )}
      <div>
        <h3 className="font-semibold">Timeline</h3>
        <ol className="mt-2 space-y-2 border-l pl-4">
          {t.timeline.map((e, i) => (
            <li key={i}>
              <StatusBadge status={e.status} />{" "}
              <span className="text-muted-foreground">{new Date(e.at).toLocaleString()}</span>
              <p>{e.note}</p>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="font-semibold">Demo ledger journal</h3>
        {t.ledger.length === 0 ? (
          <p className="text-muted-foreground">No entries posted (not finalised).</p>
        ) : (
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th>Account</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {t.ledger.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1">{l.account}</td>
                  <td className="text-right">{l.debit ? formatMoney(l.debit, l.currency) : "—"}</td>
                  <td className="text-right">
                    {l.credit ? formatMoney(l.credit, l.currency) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
