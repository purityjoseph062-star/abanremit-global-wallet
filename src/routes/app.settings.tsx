import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { currentUser, useDemo } from "@/lib/demo/store";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/brand";

export const Route = createFileRoute("/app/settings")({ component: Settings });

function Settings() {
  const user = useDemo((s) => currentUser(s));
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: api.wallets.list });
  const [hideBalances, setHideBalances] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState("KES");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);

  return (
    <>
      <PageHeader
        title="Settings"
        desc="Manage your display preferences and notification options."
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Display preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Hide balances</Label>
                <p className="text-xs text-muted-foreground">
                  Mask balance amounts on the dashboard and wallet cards.
                </p>
              </div>
              <Switch
                checked={hideBalances}
                onCheckedChange={(v) => {
                  setHideBalances(v);
                  toast.info(v ? "Balances hidden (demo)" : "Balances visible (demo)");
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Portfolio display currency</Label>
                <p className="text-xs text-muted-foreground">
                  Currency used to show your estimated total portfolio value.
                </p>
              </div>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Email notifications</Label>
              <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Push notifications</Label>
              <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
            </div>
            <div className="flex items-center justify-between">
              <Label>SMS notifications</Label>
              <Switch checked={smsNotifs} onCheckedChange={setSmsNotifs} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{user?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Verification</span>
              <StatusBadge status={user?.kycStatus ?? "draft"} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallets</span>
              <span className="font-medium">{wallets.data?.length ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
