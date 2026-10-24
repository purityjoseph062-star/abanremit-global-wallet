import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusCircle, Wallet as WalletIcon } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { WalletCard } from "@/components/wallet-bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/wallets")({ component: Wallets });

function Wallets() {
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  return (
    <>
      <PageHeader
        title="My wallets"
        desc="Each currency wallet has its own permanent account number, separate from internal IDs."
        action={
          <Link to="/app/wallets/create">
            <Button>
              <PlusCircle className="mr-1 h-4 w-4" /> Create wallet
            </Button>
          </Link>
        }
      />
      {wallets.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : wallets.data?.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <WalletIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No wallets yet.</p>
          <Link to="/app/wallets/create">
            <Button className="mt-4">Create your first wallet</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {wallets.data?.map((w) => (
            <div key={w.id} className="space-y-3">
              <WalletCard w={w} />
              <Link
                to="/app/wallets/$walletId"
                params={{ walletId: w.id }}
                className="inline-block text-sm font-medium text-primary hover:underline"
              >
                View wallet details →
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
