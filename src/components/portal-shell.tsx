import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import { DemoBanner, Logo } from "./brand";
import { currentUser, setState, useDemo } from "@/lib/demo/store";
import { ROLE_LABEL } from "@/lib/permissions";

export interface NavItem { to: string; label: string; icon: LucideIcon; exact?: boolean }

export function PortalShell({ nav, title }: { nav: NavItem[]; title: string }) {
  const user = useDemo((s) => currentUser(s));
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground md:flex">
          <Logo inverted />
          <p className="mt-1 text-xs uppercase tracking-widest text-sidebar-foreground/60">{title}</p>
          <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label={title}>
            {nav.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: !!n.exact }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-sidebar-ring"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
          </nav>
          {user && (
            <div className="rounded-lg bg-sidebar-accent p-3 text-xs">
              <p className="font-semibold text-sidebar-accent-foreground">{user.name}</p>
              <p className="text-sidebar-foreground/70">{ROLE_LABEL[user.role]}</p>
            </div>
          )}
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-8">
            <div className="md:hidden"><Logo /></div>
            <nav className="flex gap-3 overflow-x-auto text-sm md:hidden">
              {nav.map((n) => <Link key={n.to} to={n.to} activeOptions={{ exact: !!n.exact }} activeProps={{ className: "font-bold text-primary" }} className="whitespace-nowrap">{n.label}</Link>)}
            </nav>
            <span className="hidden text-sm text-muted-foreground md:block">{title}</span>
            <button className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => { setState((s) => ({ ...s, personaId: null })); navigate({ to: "/login", replace: true }); }}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </header>
          <main className="mx-auto max-w-6xl p-4 md:p-8"><Outlet /></main>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold md:text-3xl">{title}</h1>{desc && <p className="mt-1 text-muted-foreground">{desc}</p>}</div>
      {action}
    </div>
  );
}
