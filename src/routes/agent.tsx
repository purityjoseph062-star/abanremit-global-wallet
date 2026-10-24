import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  HandCoins,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Shield,
  TrendingUp,
  Users,
  Wallet,
  Wallet2,
} from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { currentUser, useDemo } from "@/lib/demo/store";
import type { NavGroup } from "@/components/portal-shell";

export const Route = createFileRoute("/agent")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.dashboard.view"),
  head: () => ({
    meta: [{ title: "Agent portal — AbanRemit demo" }, { name: "robots", content: "noindex" }],
  }),
  component: AgentLayout,
});

function AgentLayout() {
  const user = useDemo((s) => currentUser(s));
  const role = user?.role;

  const groups: NavGroup[] = [];

  const customerServices: NavGroup["items"] = [];
  if (can(role, "agent.customers.search"))
    customerServices.push({ to: "/agent/customers", label: "Customers", icon: Users });
  if (can(role, "agent.cash_in.create"))
    customerServices.push({ to: "/agent/cash-in", label: "Cash In", icon: HandCoins });
  if (can(role, "agent.cash_out.create"))
    customerServices.push({ to: "/agent/cash-out", label: "Cash Out", icon: Wallet });
  if (can(role, "agent.transactions.view"))
    customerServices.push({ to: "/agent/transactions", label: "Transactions", icon: Receipt });
  if (customerServices.length)
    groups.push({ label: "Customer Services", icon: Briefcase, items: customerServices });

  const agentFinance: NavGroup["items"] = [];
  if (can(role, "agent.float.view"))
    agentFinance.push({ to: "/agent/float", label: "Float Management", icon: Wallet2 });
  if (can(role, "agent.commissions.view"))
    agentFinance.push({ to: "/agent/commissions", label: "Commissions", icon: TrendingUp });
  if (can(role, "agent.settlements.view"))
    agentFinance.push({ to: "/agent/settlements", label: "Settlements", icon: ListChecks });
  if (can(role, "agent.reconciliation.view"))
    agentFinance.push({ to: "/agent/reconciliation", label: "Reconciliation", icon: BarChart3 });
  if (can(role, "agent.reports.view"))
    agentFinance.push({ to: "/agent/reports", label: "Reports", icon: Activity });
  if (agentFinance.length)
    groups.push({ label: "Agent Finance", icon: Wallet2, items: agentFinance });

  const operations: NavGroup["items"] = [
    { to: "/agent/notifications", label: "Notifications", icon: Bell },
    { to: "/agent/support", label: "Support", icon: HelpCircle },
    { to: "/agent/profile", label: "Profile", icon: Building2 },
    { to: "/agent/security", label: "Security", icon: Shield },
  ];
  groups.push({ label: "Operations", icon: Shield, items: operations });

  return (
    <PortalShell
      title="Agent portal"
      home={{ to: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true }}
      groups={groups}
    />
  );
}
