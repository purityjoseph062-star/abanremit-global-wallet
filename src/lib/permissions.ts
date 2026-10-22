import type { Role } from "./domain/types";

export type Permission =
  | "portal.customer" | "wallet.read" | "transfer.create" | "beneficiary.manage"
  | "portal.agent" | "agent.cash_in" | "agent.cash_out"
  | "portal.admin" | "admin.customers.read" | "admin.wallets.read" | "admin.adjust.request"
  | "admin.adjust.approve" | "compliance.kyc.review" | "config.manage";

const CUSTOMER: Permission[] = ["portal.customer", "wallet.read", "transfer.create", "beneficiary.manage"];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  customer: CUSTOMER,
  business_customer: CUSTOMER,
  agent: ["portal.agent", "agent.cash_in", "agent.cash_out"],
  support_officer: ["portal.admin", "admin.customers.read"],
  compliance_officer: ["portal.admin", "admin.customers.read", "compliance.kyc.review"],
  payment_ops_officer: ["portal.admin", "admin.wallets.read"],
  finance_officer: ["portal.admin", "admin.wallets.read", "admin.adjust.request"],
  administrator: ["portal.admin", "admin.customers.read", "admin.wallets.read", "admin.adjust.request", "admin.adjust.approve"],
  super_administrator: ["portal.admin", "admin.customers.read", "admin.wallets.read", "admin.adjust.request", "admin.adjust.approve", "compliance.kyc.review", "config.manage"],
};

export function can(role: Role | undefined, p: Permission) {
  return !!role && ROLE_PERMISSIONS[role].includes(p);
}

export const ROLE_LABEL: Record<Role, string> = {
  customer: "Personal customer", business_customer: "Business customer", agent: "Agent",
  support_officer: "Support officer", compliance_officer: "Compliance officer",
  payment_ops_officer: "Payment operations", finance_officer: "Finance / treasury",
  administrator: "Administrator", super_administrator: "Super administrator",
};
