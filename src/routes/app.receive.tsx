import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Copy } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { copy, QrPreview } from "@/components/wallet-bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/receive")({ component: Receive });

function Receive() {
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  const [sel, setSel] = useState(0);
  const w = wallets.data?.[sel];
  if (!w) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  const instructions = `Send ${w.currency} to my AbanRemit wallet ${w.number} (demo instructions — not a real account).`;
  return (
    <>
      <PageHeader
        title="Receive money"
        desc="Share your wallet number or QR so others can pay you."
      />
      <div className="mb-4 flex gap-2">
        {wallets.data!.map((x, i) => (
          <Button key={x.id} variant={i === sel ? "default" : "outline"} onClick={() => setSel(i)}>
            {x.currency}
          </Button>
        ))}
      </div>
      <div className="grid gap-6 rounded-2xl border bg-card p-6 md:grid-cols-[auto_1fr]">
        <QrPreview value={`abanremit:receive:${w.number}`} />
        <div>
          <p className="text-sm text-muted-foreground">Wallet account number</p>
          <p className="font-display text-3xl font-semibold tracking-wider">{w.number}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => copy(w.number, "Wallet number copied")}>
              <Copy className="h-4 w-4" /> Copy number
            </Button>
            <Button variant="outline" onClick={() => copy(instructions, "Instructions copied")}>
              Copy share instructions
            </Button>
          </div>
          <p className="mt-4 rounded-lg bg-muted p-3 text-sm">{instructions}</p>
        </div>
      </div>
    </>
  );
}
