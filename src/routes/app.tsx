import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Download, LayoutDashboard, Send, Users, Wallet } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/guard";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: () => requirePermission("portal.customer"),
  head: () => ({ meta: [{ title: "My AbanRemit (demo)" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PortalShell title="Customer portal" nav={[
      { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/app/wallets", label: "My wallets", icon: Wallet },
      { to: "/app/send", label: "Send money", icon: Send },
      { to: "/app/receive", label: "Receive", icon: Download },
      { to: "/app/beneficiaries", label: "Beneficiaries", icon: Users },
      { to: "/app/transactions", label: "Transactions", icon: ArrowLeftRight },
    ]} />
  ),
});
