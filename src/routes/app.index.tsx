import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  ArrowDownLeft,
  Download,
  MinusCircle,
  PlusCircle,
  Send,
  Wallet as WalletIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { WalletCard } from "@/components/wallet-bits";
import { TxRow } from "@/components/tx";
import { currentUser, useDemo } from "@/lib/demo/store";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/brand";
import type { CurrencyCode } from "@/lib/domain/types";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const user = useDemo((s) => currentUser(s));
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  const txs = useQuery({ queryKey: ["transactions"], queryFn: api.transactions.list });
  const portfolio = useQuery({ queryKey: ["portfolio"], queryFn: () => api.portfolio.summary("KES") });

  const pending =
    txs.data?.filter((t) => t.status === "pending" || t.status === "processing") ?? [];
  const recent = txs.data?.slice(0, 6) ?? [];
  const walletList = wallets.data ?? [];

  const primaryActions = [
    { to: "/app/wallets/create", l: "Create wallet", i: WalletIcon },
    { to: "/app/deposit", l: "Add money", i: PlusCircle },
    { to: "/app/send", l: "Send", i: Send },
    { to: "/app/withdraw", l: "Withdraw", i: MinusCircle },
    { to: "/app/receive", l: "Receive", i: ArrowDownLeft },
    { to: "/app/exchange", l: "Exchange", i: ArrowLeftRight },
  ];

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.name.split(" ")[0]}`}
        desc="Your demo wallets and financial activity at a glance."
        action={
          <span className="flex items-center gap-2 text-sm">
            Verification <StatusBadge status={user?.kycStatus ?? "draft"} />
          </span>
        }
      />

      {/* Portfolio total */}
      <div className="mb-6 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Estimated portfolio value
            </p>
            {portfolio.isLoading ? (
              <div className="mt-2 h-9 w-48 animate-pulse rounded-lg bg-muted" />
            ) : portfolio.data ? (
              <p className="mt-1 font-display text-3xl font-bold tabular-nums">
                {formatMoney(portfolio.data.totalValueMinor, portfolio.data.displayCurrency)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Unable to estimate</p>
            )}
          </div>
          {portfolio.data && (
            <div className="text-right text-xs text-muted-foreground">
              <p>
                {portfolio.data.walletCount} wallet{portfolio.data.walletCount !== 1 ? "s" : ""} ·{" "}
                {portfolio.data.activeWalletCount} active
              </p>
              <p>{portfolio.data.pendingTxCount} pending transactions</p>
              <p className="mt-1">Converted to {portfolio.data.displayCurrency} (illustrative)</p>
            </div>
          )}
        </div>
        {portfolio.data && Object.keys(portfolio.data.ratesUsed).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground">
            {Object.entries(portfolio.data.ratesUsed).map(([cur, rate]) => (
              <span key={cur}>
                1 {cur} = {rate} {portfolio.data!.displayCurrency}
              </span>
            ))}
            <span className="ml-auto">
              Rates updated {new Date(portfolio.data.rateUpdatedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Primary actions */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {primaryActions.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition hover:border-primary hover:shadow-sm"
          >
            <s.i className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold">{s.l}</span>
          </Link>
        ))}
      </div>

      {/* Wallet overview */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Your wallets</h2>
          <Link to="/app/wallets" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {wallets.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          </div>
        ) : walletList.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No wallets yet.{" "}
              <Link to="/app/wallets/create" className="text-primary underline">
                Create your first wallet
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {walletList.slice(0, 4).map((w) => (
              <WalletCard key={w.id} w={w} />
            ))}
          </div>
        )}
      </div>

      {/* Recent activity & pending */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
            <Link to="/app/transactions" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {recent.map((t) => (
              <TxRow key={t.id} t={t} />
            ))}
            {recent.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">No transactions yet.</p>
            )}
          </div>
        </section>
        <section className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Pending ({pending.length})</h2>
            {pending.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No pending transactions.</p>
            ) : (
              pending.map((t) => (
                <p key={t.id} className="mt-2 text-sm">
                  {t.reference} · <StatusBadge status={t.status} />
                </p>
              ))
            )}
          </div>
          {user?.kycStatus !== "approved" && (
            <div className="rounded-2xl border border-warning bg-warning/10 p-5">
              <h2 className="font-semibold text-warning">Action needed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your verification is {user?.kycStatus?.replace(/_/g, " ")}. Some features require
                approved verification.
              </p>
              <Link
                to="/app/verification"
                className="mt-2 inline-block text-sm font-medium text-warning underline"
              >
                Complete verification
              </Link>
            </div>
          )}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Download className="h-4 w-4" />
              Statements
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Download a transaction statement for any wallet.
            </p>
            <Link
              to="/app/wallets"
              className="mt-2 inline-block text-sm font-medium text-primary underline"
            >
              Go to wallets
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
