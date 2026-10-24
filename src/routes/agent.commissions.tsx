import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { CommissionSummary } from "@/lib/domain/types";
import { download } from "@/components/tx";

export const Route = createFileRoute("/agent/commissions")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.commissions.view"),
  head: () => ({ meta: [{ title: "Commissions — Agent portal" }] }),
  component: AgentCommissions,
});

function AgentCommissions() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const summary = useQuery({
    queryKey: ["agent-comm-summary"],
    queryFn: () => api.agents.commissionSummary() as Promise<CommissionSummary>,
  });
  const list = useQuery({
    queryKey: ["agent-comm", statusFilter, typeFilter],
    queryFn: () => api.agents.commissions({ status: statusFilter, type: typeFilter }),
  });
  const s = summary.data;
  const items = list.data ?? [];

  const csv = () => {
    const rows = [["Ref", "Tx Ref", "Type", "Amount", "Rate", "Commission", "Status", "Date"]];
    for (const c of items)
      rows.push([
        c.reference,
        c.txReference,
        c.txType,
        String(c.txAmount),
        String(c.commissionRate),
        String(c.commissionAmount),
        c.status,
        c.createdAt,
      ]);
    return rows.map((r) => r.join(",")).join("\n");
  };

  return (
    <div>
      <PageHeader
        title="Commissions"
        desc="Commission earnings linked to eligible transactions."
        action={
          <Button variant="outline" onClick={() => download("commissions.csv", csv(), "text/csv")}>
            Export CSV
          </Button>
        }
      />

      {s && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Earned Today" value={formatMoney(s.earnedToday, s.currency)} />
          <MetricCard label="This Month" value={formatMoney(s.earnedThisMonth, s.currency)} />
          <MetricCard label="Pending" value={formatMoney(s.pending, s.currency)} />
          <MetricCard label="Settled" value={formatMoney(s.settled, s.currency)} />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Commission Ledger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="earned">Earned</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="cash_in">Cash In</SelectItem>
                <SelectItem value="cash_out">Cash Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No commission entries. Eligible completed operations generate commission according to
              policy.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Ref</th>
                    <th>Tx Ref</th>
                    <th>Type</th>
                    <th className="text-right">Tx Amount</th>
                    <th className="text-right">Commission</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-2 font-mono text-xs">{c.reference}</td>
                      <td className="font-mono text-xs">{c.txReference}</td>
                      <td className="capitalize">{c.txType.replace("_", " ")}</td>
                      <td className="text-right tabular-nums">
                        {formatMoney(c.txAmount, c.currency)}
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {formatMoney(c.commissionAmount, c.currency)}
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
