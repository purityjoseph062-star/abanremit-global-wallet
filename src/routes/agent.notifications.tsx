import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/agent/notifications")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.dashboard.view"),
  head: () => ({ meta: [{ title: "Notifications — Agent portal" }] }),
  component: AgentNotifications,
});

function AgentNotifications() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["notifications"], queryFn: () => api.notifications.list() });
  const markRead = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const items = list.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        desc={`${unread} unread notification${unread !== 1 ? "s" : ""}.`}
      />
      <Card>
        <CardContent className="p-4">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No notifications. You'll see transaction alerts, float warnings, and settlement
              updates here.
            </p>
          ) : (
            <div className="divide-y">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between gap-3 py-3 ${n.read ? "opacity-60" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.severity === "warning" && (
                        <span className="rounded bg-warning/20 px-1.5 text-xs">warning</span>
                      )}
                      {n.severity === "error" && (
                        <span className="rounded bg-destructive/20 px-1.5 text-xs">error</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {n.body} · {new Date(n.at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {n.txId && (
                      <Link to="/agent/transactions">
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                    )}
                    {!n.read && (
                      <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                        Mark read
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
  );
}
