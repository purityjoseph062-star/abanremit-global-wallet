import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  HandCoins,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { AgentProfile, FloatAccount, Transaction } from "@/lib/domain/types";

export const Route = createFileRoute("/agent/dashboard")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.dashboard.view"),
  head: () => ({ meta: [{ title: "Agent Dashboard — AbanRemit demo" }] }),
  component: AgentDashboard,
});

function AgentDashboard() {
  const metrics = useQuery({
    queryKey: ["agent-dashboard"],
    queryFn: () =>
      api.agents.dashboardMetrics() as Promise<{
        agentProfile: AgentProfile;
        floatAccounts: FloatAccount[];
        cashInVolumeToday: number;
        cashOutVolumeToday: number;
        completedTxCount: number;
        pendingTxCount: number;
        commissionEarnedToday: number;
        reconciliationStatus: string;
        recentTransactions: Transaction[];
        pendingTransactions: Transaction[];
        totalTxCount: number;
        failedTxCount: number;
      }>,
  });

  const data = metrics.data;
  if (metrics.isLoading)
    return <div className="p-8 text-muted-foreground">Loading agent dashboard…</div>;
  if (metrics.isError || !data)
    return <div className="p-8 text-destructive">Unable to load dashboard. Please try again.</div>;

  const ap = data.agentProfile;
  const isActive = ap.operatingStatus === "active";
  const lowFloat = data.floatAccounts.filter((f) => f.available < f.minimumRecommended);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${ap.outletName}`}
        desc={`Agent code ${ap.agentCode} · ${ap.outletLocation} · ${new Date().toLocaleDateString()}`}
        action={<StatusBadge status={ap.operatingStatus} />}
      />

      {!isActive && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-warning bg-warning/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <p className="text-sm text-accent-foreground">
            Your agent account is <strong>{ap.operatingStatus.replace(/_/g, " ")}</strong>. Cash-in,
            cash-out, and other financial operations are suspended until your status returns to
            active.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Available Float (KES)"
          value={formatMoney(
            data.floatAccounts.find((f) => f.currency === "KES")?.available ?? 0,
            "KES",
          )}
          to="/agent/float"
        />
        <MetricCard
          label="Cash-In Today"
          value={formatMoney(data.cashInVolumeToday, "KES")}
          to="/agent/transactions"
        />
        <MetricCard
          label="Cash-Out Today"
          value={formatMoney(data.cashOutVolumeToday, "KES")}
          to="/agent/transactions"
        />
        <MetricCard
          label="Commission Today"
          value={formatMoney(data.commissionEarnedToday, "KES")}
          to="/agent/commissions"
        />
        <MetricCard
          label="Completed Today"
          value={String(data.completedTxCount)}
          to="/agent/transactions"
        />
        <MetricCard label="Pending" value={String(data.pendingTxCount)} to="/agent/transactions" />
        <MetricCard
          label="Total Transactions"
          value={String(data.totalTxCount)}
          to="/agent/transactions"
        />
        <MetricCard
          label="Reconciliation"
          value={data.reconciliationStatus.replace(/_/g, " ")}
          to="/agent/reconciliation"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <EmptyState
                text="No transactions yet. Start a cash-in or cash-out to see activity here."
                action={
                  <Link to="/agent/cash-in">
                    <Button size="sm">Start cash-in</Button>
                  </Link>
                }
              />
            ) : (
              <div className="divide-y">
                {data.recentTransactions.slice(0, 8).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.reference}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {t.type.replace("_", " ")} · {new Date(t.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatMoney(t.amount, t.currency)}
                      </p>
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
                <Link
                  to="/agent/transactions"
                  className="flex items-center justify-center gap-1 pt-3 text-sm text-primary hover:underline"
                >
                  View all transactions <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Primary Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link to="/agent/cash-in">
                <Button variant="outline" className="w-full">
                  <HandCoins className="mr-1 h-4 w-4" /> Cash In
                </Button>
              </Link>
              <Link to="/agent/cash-out">
                <Button variant="outline" className="w-full">
                  <Wallet className="mr-1 h-4 w-4" /> Cash Out
                </Button>
              </Link>
              <Link to="/agent/customers">
                <Button variant="outline" className="w-full">
                  <Users className="mr-1 h-4 w-4" /> Find Customer
                </Button>
              </Link>
              <Link to="/agent/transactions">
                <Button variant="outline" className="w-full">
                  <Receipt className="mr-1 h-4 w-4" /> Check Tx
                </Button>
              </Link>
            </CardContent>
          </Card>

          {(lowFloat.length > 0 ||
            data.pendingTransactions.length > 0 ||
            data.failedTxCount > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" /> Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowFloat.map((f) => (
                  <Link
                    key={f.id}
                    to="/agent/float"
                    className="block rounded-lg bg-warning/10 p-2.5 text-sm hover:bg-warning/20"
                  >
                    <strong>Low float:</strong> {f.currency} available{" "}
                    {formatMoney(f.available, f.currency)} is below recommended{" "}
                    {formatMoney(f.minimumRecommended, f.currency)}.
                  </Link>
                ))}
                {data.pendingTransactions.length > 0 && (
                  <Link
                    to="/agent/transactions"
                    className="block rounded-lg bg-secondary p-2.5 text-sm hover:bg-secondary/80"
                  >
                    <strong>
                      {data.pendingTransactions.length} pending transaction
                      {data.pendingTransactions.length > 1 ? "s" : ""}
                    </strong>{" "}
                    awaiting action.
                  </Link>
                )}
                {data.failedTxCount > 0 && (
                  <Link
                    to="/agent/transactions"
                    className="block rounded-lg bg-destructive/10 p-2.5 text-sm hover:bg-destructive/20"
                  >
                    <strong>
                      {data.failedTxCount} failed transaction{data.failedTxCount > 1 ? "s" : ""}
                    </strong>{" "}
                    may need attention.
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, to }: { label: string; value: string; to: string }) {
  return (
    <Link to={to} className="group">
      <Card className="transition-shadow group-hover:shadow-elegant">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="py-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
