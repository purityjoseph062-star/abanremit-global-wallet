import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/app/notifications")({ component: Notifications });

function Notifications() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["notifications"], queryFn: api.notifications.list });
  const markRead = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const items = list.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        desc={`${unread} unread notification${unread !== 1 ? "s" : ""}.`}
      />
      <Card>
        <CardContent className="p-4">
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No notifications. You'll see transaction alerts, security warnings, and account updates here.
              </p>
            </div>
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
                  {!n.read && (
                    <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
