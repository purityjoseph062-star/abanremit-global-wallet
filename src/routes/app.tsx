import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowLeftRight, Download, LayoutDashboard, MinusCircle, PlusCircle, Send, Users, Wallet, Wallet2 } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/guard";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: () => requirePermission("portal.customer"),
  head: () => ({ meta: [{ title: "My AbanRemit (demo)" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PortalShell
      title="Customer portal"
      home={{ to: "/app", label: "Home", icon: LayoutDashboard, exact: true }}
      groups={[
        { label: "Money", icon: Wallet2, items: [
          { to: "/app/send", label: "Send money", icon: Send },
          { to: "/app/deposit", label: "Add money", icon: PlusCircle },
          { to: "/app/withdraw", label: "Withdraw", icon: MinusCircle },
          { to: "/app/receive", label: "Receive", icon: Download },
          { to: "/app/wallets", label: "My wallets", icon: Wallet },
        ] },
        { label: "Activity", icon: Activity, items: [
          { to: "/app/transactions", label: "Transactions", icon: ArrowLeftRight },
          { to: "/app/beneficiaries", label: "Beneficiaries", icon: Users },
        ] },
      ]}
    />
  ),
});
