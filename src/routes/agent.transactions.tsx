import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { TxDetail, download, receiptText } from "@/components/tx";
import { formatMoney } from "@/lib/money";
import type { Transaction } from "@/lib/domain/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/agent/transactions")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.transactions.view"),
  head: () => ({ meta: [{ title: "Transactions — Agent portal" }] }),
  component: AgentTransactions,
});

function AgentTransactions() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [selected, setSelected] = useState<Transaction | null>(null);

  const txs = useQuery({
    queryKey: ["agent-txs", typeFilter, statusFilter, currencyFilter, query],
    queryFn: () =>
      api.agents.agentTransactions({
        type: typeFilter,
        status: statusFilter,
        currency: currencyFilter,
        query,
      }),
  });

  const list = txs.data ?? [];

  return (
    <div>
      <PageHeader
        title="Transactions"
        desc="All agent transactions with search, filters, and receipt access."
      />
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Search by reference"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="cash_in">Cash In</SelectItem>
                <SelectItem value="cash_out">Cash Out</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All currencies</SelectItem>
                <SelectItem value="KES">KES</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="UGX">UGX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No transactions match your filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Reference</th>
                    <th>Type</th>
                    <th>Customer</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelected(t)}
                    >
                      <td className="py-2 font-mono text-xs">{t.reference}</td>
                      <td className="capitalize">{t.type.replace("_", " ")}</td>
                      <td className="truncate">{t.counterparty}</td>
                      <td className="text-right font-semibold tabular-nums">
                        {formatMoney(t.amount, t.currency)}
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction detail</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <TxDetail t={selected} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => download(`${selected.reference}.txt`, receiptText(selected))}
                >
                  Download receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
