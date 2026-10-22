import { Check } from "lucide-react";
import type { MovementQuote, Wallet } from "@/lib/domain/types";
import { formatMoney } from "@/lib/money";
import { setState, useDemo } from "@/lib/demo/store";
import { Eye, EyeOff } from "lucide-react";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-1.5" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className="min-w-0">
          <div className={`h-1.5 rounded-full ${i <= current ? "bg-primary" : "bg-muted"}`} />
          <p className={`mt-1.5 hidden truncate text-xs sm:block ${i === current ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{i < current && <Check className="mr-1 inline h-3 w-3" />}{s}</p>
        </li>
      ))}
      <li className="col-span-full text-xs font-semibold sm:hidden">Step {current + 1} of {steps.length}: {steps[current]}</li>
    </ol>
  );
}

export function SummaryList({ rows }: { rows: [string, React.ReactNode, boolean?][] }) {
  return (
    <dl className="divide-y rounded-xl border bg-muted/40 text-sm">
      {rows.map(([k, v, strong]) => (
        <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-2.5">
          <dt className={strong ? "font-semibold" : "text-muted-foreground"}>{k}</dt>
          <dd className={`text-right tabular-nums ${strong ? "font-semibold" : ""}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function QuoteRows(q: MovementQuote): [string, React.ReactNode, boolean?][] {
  const f = (n: number) => formatMoney(n, q.currency);
  return q.kind === "deposit"
    ? [["You pay", f(q.amount)], ["Fee (deducted)", f(q.fee)], ["Amount credited", f(q.net), true], ["Processing", q.eta]]
    : [["Withdrawal amount", f(q.amount)], ["Fee (added on top)", f(q.fee)], ["Total deducted from wallet", f(q.net), true], ["Recipient receives", f(q.amount)], ["Processing", q.eta]];
}

export function WalletPicker({ wallets, value, onChange, disabled }: { wallets: Wallet[]; value: string; onChange: (id: string) => void; disabled?: (w: Wallet) => string | null }) {
  const hide = useDemo((s) => !!s.hideBalances);
  return (
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
      {wallets.map((w) => {
        const why = disabled?.(w) ?? null;
        return (
          <button type="button" role="radio" aria-checked={value === w.id} key={w.id} disabled={!!why} onClick={() => onChange(w.id)}
            className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${value === w.id ? "border-primary bg-secondary ring-1 ring-primary" : "bg-card hover:border-primary/50"}`}>
            <span className="flex items-center justify-between"><span className="font-semibold">{w.currency} wallet</span><span className="font-mono text-xs text-muted-foreground">{w.number}</span></span>
            <span className="mt-1 block text-lg font-semibold tabular-nums">{hide ? "••••••" : formatMoney(w.available, w.currency)}</span>
            <span className="text-xs text-muted-foreground">{why ?? (w.held ? `Held ${hide ? "•••" : formatMoney(w.held, w.currency)} · not available` : "Available")}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MethodPicker<T extends { id: string; label: string; desc: string; eta: string }>({ items, value, onChange }: { items: T[]; value: string; onChange: (id: T["id"]) => void }) {
  return (
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
      {items.map((m) => (
        <button type="button" role="radio" aria-checked={value === m.id} key={m.id} onClick={() => onChange(m.id)}
          className={`rounded-xl border p-4 text-left transition ${value === m.id ? "border-primary bg-secondary ring-1 ring-primary" : "bg-card hover:border-primary/50"}`}>
          <span className="flex items-center justify-between font-semibold">{m.label}<span className="rounded bg-accent/40 px-1.5 text-[10px] font-bold uppercase">Simulated</span></span>
          <span className="mt-1 block text-sm text-muted-foreground">{m.desc}</span>
          <span className="mt-2 block text-xs font-medium">{m.eta}</span>
        </button>
      ))}
    </div>
  );
}

export function useHidden() { return useDemo((s) => !!s.hideBalances); }
export function HideToggle({ className = "" }: { className?: string }) {
  const hide = useHidden();
  return (
    <button onClick={() => setState((s) => ({ ...s, hideBalances: !s.hideBalances }))} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`} aria-pressed={hide} aria-label={hide ? "Show balances" : "Hide balances"}>
      {hide ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{hide ? "Show" : "Hide"}
    </button>
  );
}
