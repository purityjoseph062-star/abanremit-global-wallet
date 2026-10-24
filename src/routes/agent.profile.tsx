import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { StatusBadge } from "@/components/brand";
import { currentUser, useDemo } from "@/lib/demo/store";
import { ROLE_LABEL, ROLE_PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/agent/profile")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.dashboard.view"),
  head: () => ({ meta: [{ title: "Profile — Agent portal" }] }),
  component: AgentProfilePage,
});

function AgentProfilePage() {
  const user = useDemo((s) => currentUser(s));
  const profile = useQuery({ queryKey: ["agent-profile"], queryFn: () => api.agents.profile() });
  const ap = profile.data;

  if (profile.isLoading) return <div className="p-8 text-muted-foreground">Loading profile…</div>;
  if (!ap || !user) return <div className="p-8 text-destructive">Unable to load profile.</div>;

  return (
    <div>
      <PageHeader title="Agent Profile" desc="Your agent identity and assigned outlet." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Display name" value={user.name} />
            <Row label="Agent code" value={ap.agentCode} />
            <Row label="Outlet" value={ap.outletName} />
            <Row label="Location" value={ap.outletLocation} />
            <Row label="Agent type" value={ap.agentType.replace(/_/g, " ")} />
            <Row label="Joined" value={new Date(ap.joinedAt).toLocaleDateString()} />
            <Row label="Operating status" value={<StatusBadge status={ap.operatingStatus} />} />
            <Row label="Contact" value={user.phone} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Role & Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-semibold">{ROLE_LABEL[user.role]}</p>
              <p className="text-xs text-muted-foreground">
                Your role determines which operations you can perform.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_PERMISSIONS[user.role].map((p) => (
                <span key={p} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                  {p.replace(/\./g, " ")}
                </span>
              ))}
            </div>
            <p className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              These permissions are enforced on the frontend for usability. The Laravel backend must
              enforce the same permissions server-side.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
