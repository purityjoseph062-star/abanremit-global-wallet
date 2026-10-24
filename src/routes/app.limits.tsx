import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { currentUser, useDemo } from "@/lib/demo/store";
import { StatusBadge } from "@/components/brand";

export const Route = createFileRoute("/app/limits")({ component: Limits });

function Limits() {
  const user = useDemo((s) => currentUser(s));
  const limits = useQuery({ queryKey: ["limits"], queryFn: api.limits.get });
  const l = limits.data;

  return (
    <>
      <PageHeader
        title="Account limits"
        desc="Your transaction limits based on verification status and account type."
      />
      <div className="mb-4 rounded-xl border border-warning bg-warning/10 p-4 text-sm">
        <p className="font-medium">Verification status: <StatusBadge status={user?.kycStatus ?? "draft"} /></p>
        {user?.kycStatus !== "approved" && (
          <p className="mt-1 text-muted-foreground">
            Some limits may be restricted until your verification is approved.
          </p>
        )}
      </div>
      {limits.isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : l ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Daily transfer limit</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {formatMoney(l.dailyTransferLimit, l.currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Daily withdrawal limit</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {formatMoney(l.dailyWithdrawalLimit, l.currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Single transaction limit</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {formatMoney(l.singleTransactionLimit, l.currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Monthly volume limit</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {formatMoney(l.monthlyVolumeLimit, l.currency)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Unable to load limits.</p>
      )}
    </>
  );
}
