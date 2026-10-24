import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { Wallet } from "@/lib/domain/types";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "./brand";

export function copy(text: string, label = "Copied") {
  navigator.clipboard?.writeText(text).then(
    () => toast.success(label),
    () => toast.error("Copy failed"),
  );
}

export function WalletCard({ w }: { w: Wallet }) {
  return (
    <div className="bg-wallet-card shadow-elegant rounded-2xl p-6 text-primary-foreground">
      <div className="flex items-center justify-between text-sm">
        <span className="capitalize text-primary-foreground/70">
          {w.accountType} · {w.currency}
        </span>
        <StatusBadge status={w.status} />
      </div>
      <p className="mt-6 text-xs uppercase tracking-widest text-primary-foreground/60">
        Available (demo)
      </p>
      <p className="font-display text-3xl font-semibold">{formatMoney(w.available, w.currency)}</p>
      <div className="mt-2 flex gap-4 text-xs text-primary-foreground/70">
        <span>Pending {formatMoney(w.pending, w.currency)}</span>
        <span>Held {formatMoney(w.held, w.currency)}</span>
      </div>
      <button
        onClick={() => copy(w.number, "Wallet number copied")}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-3 py-1.5 font-mono text-sm tracking-wider hover:bg-primary-foreground/20"
        aria-label={`Copy wallet number ${w.number}`}
      >
        {w.number} <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Deterministic visual preview only — not a scannable QR code. */
export function QrPreview({ value }: { value: string }) {
  const n = 21;
  let h = 0;
  for (const c of value) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push((h >> 16) % 2 === 0);
  }
  const finder = (x: number, y: number) =>
    (
      [
        [0, 0],
        [n - 7, 0],
        [0, n - 7],
      ] as [number, number][]
    ).some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
  return (
    <figure className="inline-block rounded-xl border bg-card p-3">
      <svg
        viewBox={`0 0 ${n} ${n}`}
        className="h-40 w-40 text-foreground"
        role="img"
        aria-label="QR receive preview (demo)"
      >
        {cells.map((on, i) => {
          const x = i % n,
            y = Math.floor(i / n);
          const f = finder(x, y);
          const fill = f
            ? x % (n - 7) === 0 ||
              y % (n - 7) === 0 ||
              x % (n - 7) === 6 ||
              y % (n - 7) === 6 ||
              (x % (n - 7) >= 2 && x % (n - 7) <= 4 && y % (n - 7) >= 2 && y % (n - 7) <= 4)
            : on;
          return fill ? (
            <rect key={i} x={x} y={y} width={1} height={1} fill="currentColor" />
          ) : null;
        })}
      </svg>
      <figcaption className="mt-1 text-center text-xs text-muted-foreground">
        QR preview · demo
      </figcaption>
    </figure>
  );
}
