import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { StatusBadge } from "@/components/brand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/agent/settlements")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.settlements.view"),
  head: () => ({ meta: [{ title: "Settlements — Agent portal" }] }),
  component: AgentSettlements,
});

function AgentSettlements() {
  const list = useQuery({
    queryKey: ["agent-settlements"],
    queryFn: () => api.agents.settlements(),
  });
  const items = list.data ?? [];
  return (
    <div>
      <PageHeader
        title="Settlements"
        desc="Commission payouts and float top-ups settled to your accounts."
      />
      <Card>
        <CardHeader>
          <CardTitle>Settlement History</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No settlements yet. Completed commission payouts and float top-ups will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Reference</th>
                    <th>Type</th>
                    <th className="text-right">Amount</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Initiated</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-2 font-mono text-xs">{s.reference}</td>
                      <td className="capitalize">{s.type.replace(/_/g, " ")}</td>
                      <td className="text-right font-semibold tabular-nums">
                        {formatMoney(s.amount, s.currency)}
                      </td>
                      <td>{s.period}</td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(s.initiatedAt).toLocaleDateString()}
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : "—"}
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
