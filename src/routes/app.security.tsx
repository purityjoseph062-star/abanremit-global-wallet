import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shield, Smartphone, KeyRound, Monitor } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/security")({ component: Security });

function Security() {
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: api.notifications.list });
  const [twoFactor, setTwoFactor] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  const sessions = [
    { id: "s1", device: "Chrome on Windows", location: "Nairobi, Kenya", current: true, at: "Active now" },
    { id: "s2", device: "Safari on iPhone", location: "Nairobi, Kenya", current: false, at: "2 hours ago" },
  ];

  return (
    <>
      <PageHeader
        title="Security"
        desc="Manage your account security, authentication, and active sessions."
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Two-factor authentication</Label>
                <p className="text-xs text-muted-foreground">
                  Add an extra layer of security to your sign-in.
                </p>
              </div>
              <Switch
                checked={twoFactor}
                onCheckedChange={(v) => {
                  setTwoFactor(v);
                  toast.info(v ? "2FA enabled (demo)" : "2FA disabled (demo)");
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Login alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified of new sign-ins to your account.
                </p>
              </div>
              <Switch
                checked={loginAlerts}
                onCheckedChange={setLoginAlerts}
              />
            </div>
            <div className="border-t pt-4">
              <Button variant="outline" onClick={() => toast.info("Demo only — password changes are not persisted")}>
                <KeyRound className="mr-2 h-4 w-4" /> Change password
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" /> Active sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {s.device} {s.current && <span className="text-xs text-success">· Current</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.location} · {s.at}</p>
                  </div>
                </div>
                {!s.current && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toast.info("Session revoked (demo)")}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent security events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {(notifications.data ?? []).filter((n) => n.category === "security").map((n) => (
                <div key={n.id} className="py-2 text-sm">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.body} · {new Date(n.at).toLocaleString()}
                  </p>
                </div>
              ))}
              {(notifications.data ?? []).filter((n) => n.category === "security").length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">No security events.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
