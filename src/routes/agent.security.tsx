import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { setState } from "@/lib/demo/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/agent/security")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.dashboard.view"),
  head: () => ({ meta: [{ title: "Security — Agent portal" }] }),
  component: AgentSecurity,
});

function AgentSecurity() {
  const navigate = useNavigate();
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const isDemo = api.mode === "demo";

  return (
    <div>
      <PageHeader title="Security" desc="Account security and session management." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Demo PIN</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              The demo uses PIN 1234 for customer authorization. In production, this would be
              replaced by a real authentication system. No real PIN changes are possible in demo
              mode.
            </p>
            <div>
              <Label>Demo PIN</Label>
              <Input value="1234" disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="text-muted-foreground">You are signed in as a demo persona.</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isDemo
                  ? "Demo mode — all data is simulated."
                  : "Production mode — connected to Laravel API."}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                setState((s) => ({ ...s, personaId: null }));
                navigate({ to: "/login", replace: true });
              }}
            >
              Sign out
            </Button>
            <div className="pt-2">
              <Link to="/agent/notifications">
                <Button variant="ghost" size="sm">
                  View security notifications
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
