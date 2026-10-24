import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { CustomerSummary } from "@/lib/domain/types";

export const Route = createFileRoute("/agent/customers")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.customers.search"),
  head: () => ({ meta: [{ title: "Customers — Agent portal" }] }),
  component: AgentCustomers,
});

function AgentCustomers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSummary[] | null>(null);

  const search = useMutation({
    mutationFn: () => api.agents.searchCustomers(query),
    onSuccess: (r) => {
      setResults(r);
      if (r.length === 0) toast.info("No customers matched your search");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        desc="Search for customers to initiate cash-in, cash-out, or review their status."
      />
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone, or email"
              onKeyDown={(e) => e.key === "Enter" && search.mutate()}
            />
            <Button disabled={!query.trim() || search.isPending} onClick={() => search.mutate()}>
              <Search className="mr-1 h-4 w-4" /> Search
            </Button>
          </div>
          {results && results.length > 0 && (
            <div className="divide-y rounded-xl border">
              {results.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.maskedPhone} · KYC: {c.kycStatus.replace(/_/g, " ")}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.wallets.map((w) => (
                        <span
                          key={w.currency}
                          className="rounded bg-secondary px-1.5 py-0.5 text-xs"
                        >
                          {w.currency} · {formatMoney(w.available, w.currency)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.accountStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {results && results.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No customers found. Try a different search term.
            </p>
          )}
          {!results && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Enter a search term to find customers. Search by name, phone number, or email.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
