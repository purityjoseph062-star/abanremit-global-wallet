import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { WalletCard } from "@/components/wallet-bits";
import { TxRow, TxDetail, download } from "@/components/tx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/app/wallets/$walletId")({ component: WalletDetail });

function WalletDetail() {
  const { walletId } = useParams({ from: "/app/wallets/$walletId" });
  const wallet = useQuery({ queryKey: ["wallet", walletId], queryFn: () => api.wallets.get(walletId) });
  const txs = useQuery({
    queryKey: ["wallet-txs", walletId],
    queryFn: () => api.transactions.forWallet(walletId),
  });
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedTx, setSelectedTx] = useState<string | null>(null);

  const w = wallet.data;
  if (wallet.isLoading || !w) {
    return <div className="h-48 animate-pulse rounded-2xl bg-muted" />;
  }

  const filtered = (txs.data ?? []).filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search && !t.reference.toLowerCase().includes(search.toLowerCase())) return false;
    if (fromDate && t.createdAt < fromDate) return false;
    if (toDate && t.createdAt > toDate + "T23:59:59.999Z") return false;
    return true;
  });

  const exportStatement = () => {
    const lines = [
      ["Date", "Reference", "Type", "Description", "Debit", "Credit", "Balance"],
    ];
    api.wallets.statement(walletId, fromDate || "2000-01-01", toDate || new Date().toISOString().split("T")[0]).then((stmt) => {
      for (const l of stmt.lines) {
        lines.push([
          new Date(l.date).toLocaleDateString(),
          l.reference,
          l.type,
          l.description,
          String(l.debit),
          String(l.credit),
          String(l.balance),
        ]);
      }
      const csv = lines.map((r) => r.join(",")).join("\n");
      download(`${w.currency}-statement.csv`, csv, "text/csv");
    });
  };

  return (
    <>
      <Link to="/app/wallets" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All wallets
      </Link>
      <PageHeader
        title={`${w.currency} Wallet`}
        desc={w.number}
        action={
          <Button variant="outline" onClick={exportStatement}>
            Export statement
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <WalletCard w={w} />
          <div className="flex flex-col gap-2">
            <Link to="/app/deposit">
              <Button variant="outline" className="w-full">Add money</Button>
            </Link>
            <Link to="/app/withdraw">
              <Button variant="outline" className="w-full">Withdraw</Button>
            </Link>
            <Link to="/app/send">
              <Button variant="outline" className="w-full">Send money</Button>
            </Link>
            <Link to="/app/exchange">
              <Button variant="outline" className="w-full">Exchange</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                placeholder="Search reference"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="exchange">Exchange</SelectItem>
                  <SelectItem value="cash_in">Cash in</SelectItem>
                  <SelectItem value="cash_out">Cash out</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="reversed">Reversed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No transactions match your filters.
              </p>
            ) : (
              <div className="divide-y">
                {filtered.map((t) => (
                  <TxRow
                    key={t.id}
                    t={t}
                    onOpen={() => setSelectedTx(t.id)}
                  />
                ))}
              </div>
            )}

            {selectedTx && (
              (() => {
                const t = filtered.find((x) => x.id === selectedTx);
                if (!t) return null;
                return (
                  <div className="mt-4 rounded-xl border p-4">
                    <TxDetail t={t} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => download(`${t.reference}.txt`, "")}
                    >
                      Download receipt
                    </Button>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
