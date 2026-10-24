import { redirect } from "@tanstack/react-router";
import { currentUser } from "./demo/store";
import { can, type Permission } from "./permissions";

/** Route guard (frontend). Laravel must enforce the same permission server-side. */
export function requirePermission(p: Permission) {
  const u = currentUser();
  if (!u) throw redirect({ to: "/login" });
  if (!can(u.role, p)) throw redirect({ to: "/login", search: { denied: p } });
}
