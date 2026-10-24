import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { api, newIdempotencyKey } from "@/lib/api";
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
import type { FloatMovement } from "@/lib/domain/types";

export const Route = createFileRoute("/agent/float")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.float.view"),
  head: () => ({ meta: [{ title: "Float Management — Agent portal" }] }),
  component: AgentFloat,
});

function AgentFloat() {
  const qc = useQueryClient();
  const accounts = useQuery({
    queryKey: ["agent-float"],
    queryFn: () => api.agents.floatAccounts(),
  });
  const ledger = useQuery({
    queryKey: ["agent-float-ledger"],
    queryFn: () => api.agents.floatLedger(),
  });
  const replenishments = useQuery({
    queryKey: ["agent-replenishments"],
    queryFn: () => api.agents.replenishmentRequests(),
  });
  const [showReq, setShowReq] = useState(false);
  const [reqAccountId, setReqAccountId] = useState("");
  const [reqAmount, setReqAmount] = useState("");
  const [reqReason, setReqReason] = useState("");
  const idem = useRef(newIdempotencyKey());

  const submitReq = useMutation({
    mutationFn: () =>
      api.agents.requestReplenishment({
        accountId: reqAccountId,
        amount: Number(reqAmount) * 100,
        reason: reqReason,
        idempotencyKey: idem.current,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Replenishment request submitted — pending approval");
      setShowReq(false);
      setReqAmount("");
      setReqReason("");
      idem.current = newIdempotencyKey();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelReq = useMutation({
    mutationFn: (id: string) => api.agents.cancelReplenishment(id),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Request cancelled");
    },
    onError: (e) => toast.error(e.message),
  });

  const acctList = accounts.data ?? [];
  const ledgerList = ledger.data ?? [];
  const reqList = replenishments.data ?? [];

  return (
    <div>
      <PageHeader
        title="Float Management"
        desc="Electronic float accounts, ledger, and replenishment requests."
        action={
          <Dialog open={showReq} onOpenChange={setShowReq}>
            <DialogTrigger asChild>
              <Button>Request replenishment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request float replenishment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Float account</Label>
                  <Select value={reqAccountId} onValueChange={setReqAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {acctList.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.currency} — {formatMoney(f.available, f.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    inputMode="decimal"
                    value={reqAmount}
                    onChange={(e) => setReqAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder="Explain why replenishment is needed"
                  />
                </div>
                <p className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
                  Submitting a request does not change your float balance. Only an approved
                  allocation can do that.
                </p>
                <Button
                  disabled={
                    !reqAccountId ||
                    !(Number(reqAmount) > 0) ||
                    !reqReason.trim() ||
                    submitReq.isPending
                  }
                  onClick={() => submitReq.mutate()}
                >
                  {submitReq.isPending ? "Submitting…" : "Submit request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {acctList.map((f) => {
          const low = f.available < f.minimumRecommended;
          return (
            <Card key={f.id} className={low ? "border-warning" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{f.currency} Float</p>
                  {low && <StatusBadge status="pending" />}
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums">
                  {formatMoney(f.available, f.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Reserved: {formatMoney(f.reserved, f.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Min recommended: {formatMoney(f.minimumRecommended, f.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(f.lastUpdated).toLocaleString()}
                </p>
                {low && (
                  <p className="mt-2 text-xs font-medium text-warning">
                    Float is below recommended minimum.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Float Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            {ledgerList.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No float movements yet.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-1">Ref</th>
                      <th>Type</th>
                      <th className="text-right">Amount</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerList.map((m: FloatMovement) => (
                      <tr key={m.id} className="border-b">
                        <td className="py-1 font-mono">{m.reference}</td>
                        <td className="capitalize">{m.movementType.replace(/_/g, " ")}</td>
                        <td className="text-right tabular-nums">
                          {formatMoney(m.amount, m.currency)}
                        </td>
                        <td className="tabular-nums">
                          {formatMoney(m.resultingBalance, m.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Replenishment Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {reqList.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No replenishment requests. Submit one if you need more float.
              </p>
            ) : (
              <div className="space-y-2">
                {reqList.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-mono text-xs">{r.reference}</p>
                      <p className="text-sm">
                        {formatMoney(r.amount, r.currency)} — {r.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      {r.status === "pending_approval" && (
                        <Button size="sm" variant="ghost" onClick={() => cancelReq.mutate(r.id)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
