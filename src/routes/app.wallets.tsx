import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { WalletCard } from "@/components/wallet-bits";
import { TxRow } from "@/components/tx";

export const Route = createFileRoute("/app/wallets")({ component: Wallets });

function Wallets() {
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  const txs = useQuery({ queryKey: ["transactions"], queryFn: api.transactions.list });
  return (
    <>
      <PageHeader title="My wallets" desc="Each currency wallet has its own permanent account number, separate from internal IDs." />
      {wallets.data?.length === 0 && <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No wallets yet.</p>}
      <div className="space-y-8">
        {wallets.data?.map((w) => (
          <section key={w.id} className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <WalletCard w={w} />
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">{w.currency} history</h2>
              <div className="divide-y">{txs.data?.filter((t) => t.walletId === w.id).map((t) => <TxRow key={t.id} t={t} />)}</div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
