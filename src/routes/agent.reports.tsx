import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { download } from "@/components/tx";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/agent/reports")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.reports.view"),
  head: () => ({ meta: [{ title: "Reports — Agent portal" }] }),
  component: AgentReports,
});

function AgentReports() {
  const today = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const report = useQuery({
    queryKey: ["agent-report", from, to],
    queryFn: () => api.agents.reportSummary(from, to),
  });
  const data = report.data as
    | {
        period: { from: string; to: string };
        byCurrency: Record<
          string,
          {
            cashIn: number;
            cashOut: number;
            completed: number;
            failed: number;
            pending: number;
            commission: number;
          }
        >;
        totalTxs: number;
      }
    | undefined;

  const csv = () => {
    if (!data) return "";
    const rows = [
      ["Currency", "Cash-In", "Cash-Out", "Completed", "Failed", "Pending", "Commission"],
    ];
    for (const [cur, v] of Object.entries(data.byCurrency)) {
      rows.push([
        cur,
        String(v.cashIn),
        String(v.cashOut),
        String(v.completed),
        String(v.failed),
        String(v.pending),
        String(v.commission),
      ]);
    }
    return rows.map((r) => r.join(",")).join("\n");
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        desc="Operational summaries with CSV export."
        action={
          <Button
            variant="outline"
            onClick={() => download("report.csv", csv(), "text/csv")}
            disabled={!data}
          >
            Export CSV
          </Button>
        }
      />
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="block rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="block rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </CardContent>
      </Card>
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>
              Summary: {data.period.from} to {data.period.to}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Total transactions: {data.totalTxs}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Currency</th>
                    <th className="text-right">Cash-In</th>
                    <th className="text-right">Cash-Out</th>
                    <th className="text-right">Completed</th>
                    <th className="text-right">Failed</th>
                    <th className="text-right">Pending</th>
                    <th className="text-right">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.byCurrency).map(([cur, v]) => (
                    <tr key={cur} className="border-b">
                      <td className="py-2 font-semibold">{cur}</td>
                      <td className="text-right tabular-nums">
                        {formatMoney(v.cashIn, cur as "KES")}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatMoney(v.cashOut, cur as "KES")}
                      </td>
                      <td className="text-right tabular-nums">{v.completed}</td>
                      <td className="text-right tabular-nums">{v.failed}</td>
                      <td className="text-right tabular-nums">{v.pending}</td>
                      <td className="text-right tabular-nums">
                        {formatMoney(v.commission, cur as "KES")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      {report.isLoading && (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading report…</p>
      )}
    </div>
  );
}
