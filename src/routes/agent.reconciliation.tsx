import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import type { Reconciliation } from "@/lib/domain/types";

export const Route = createFileRoute("/agent/reconciliation")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.reconciliation.view"),
  head: () => ({ meta: [{ title: "Reconciliation — Agent portal" }] }),
  component: AgentReconciliation,
});

function AgentReconciliation() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["agent-rec"], queryFn: () => api.agents.reconciliations() });
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [currency, setCurrency] = useState("KES");
  const [reported, setReported] = useState("");
  const [explanation, setExplanation] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.agents.createReconciliation({
        businessDate: date,
        currency,
        reportedClosing: Number(reported) * 100,
        explanation: explanation || undefined,
      }),
    onSuccess: (rec) => {
      qc.invalidateQueries();
      setShowForm(false);
      setReported("");
      setExplanation("");
      if (rec.variance === 0) toast.success("Reconciliation submitted — balanced");
      else toast.warning(`Variance detected: ${formatMoney(Math.abs(rec.variance), rec.currency)}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const items = list.data ?? [];

  return (
    <div>
      <PageHeader
        title="Daily Reconciliation"
        desc="Compare recorded operations with expected financial positions."
        action={
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>New reconciliation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create reconciliation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Business date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">KES</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reported closing balance</Label>
                  <Input
                    inputMode="decimal"
                    value={reported}
                    onChange={(e) => setReported(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Explanation (if variance)</Label>
                  <Textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Explain any difference"
                  />
                </div>
                <Button
                  disabled={!(Number(reported) > 0) || create.isPending}
                  onClick={() => create.mutate()}
                >
                  {create.isPending ? "Submitting…" : "Submit reconciliation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No reconciliations yet. Start today's reconciliation if authorized.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((r: Reconciliation) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm">{r.reference}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.businessDate} · {r.currency} · {r.outletId}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Opening:</span>{" "}
                    <span className="tabular-nums">{formatMoney(r.openingFloat, r.currency)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cash-in:</span>{" "}
                    <span className="tabular-nums">{formatMoney(r.cashInTotal, r.currency)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cash-out:</span>{" "}
                    <span className="tabular-nums">{formatMoney(r.cashOutTotal, r.currency)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Commission:</span>{" "}
                    <span className="tabular-nums">
                      {formatMoney(r.commissionTotal, r.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected:</span>{" "}
                    <span className="tabular-nums">
                      {formatMoney(r.expectedClosing, r.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reported:</span>{" "}
                    <span className="tabular-nums">
                      {r.reportedClosing ? formatMoney(r.reportedClosing, r.currency) : "—"}
                    </span>
                  </div>
                  <div className={r.variance !== 0 ? "font-semibold text-warning" : ""}>
                    <span className="text-muted-foreground">Variance:</span>{" "}
                    <span className="tabular-nums">{formatMoney(r.variance, r.currency)}</span>
                  </div>
                </div>
                {r.explanation && (
                  <p className="mt-2 rounded bg-secondary p-2 text-xs">{r.explanation}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
