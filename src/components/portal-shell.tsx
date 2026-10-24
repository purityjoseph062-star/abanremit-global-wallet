import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ChevronUp, LogOut, RotateCcw } from "lucide-react";
import { DemoBanner, Logo } from "./brand";
import { currentUser, resetDemo, setState, useDemo } from "@/lib/demo/store";
import { ROLE_LABEL } from "@/lib/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}
export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export function PortalShell({
  home,
  groups,
  title,
}: {
  home: NavItem;
  groups: NavGroup[];
  title: string;
}) {
  const user = useDemo((s) => currentUser(s));
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const signOut = () => {
    setState((s) => ({ ...s, personaId: null }));
    navigate({ to: "/login", replace: true });
  };
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to || pathname === to + "/" : pathname.startsWith(to);
  const linkCls =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent";
  const active = { className: "bg-sidebar-accent text-sidebar-primary" };

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-sidebar p-5 text-sidebar-foreground md:flex">
          <Logo inverted />
          <p className="mt-1 text-xs uppercase tracking-widest text-sidebar-foreground/60">
            {title}
          </p>
          <nav className="mt-8 flex flex-1 flex-col gap-5" aria-label={title}>
            <Link
              to={home.to}
              activeOptions={{ exact: true }}
              className={linkCls}
              activeProps={active}
            >
              <home.icon className="h-4 w-4" />
              {home.label}
            </Link>
            {groups.map((g) => (
              <div key={g.label}>
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
                  {g.label}
                </p>
                {g.items.map((n) => (
                  <Link key={n.to} to={n.to} className={linkCls} activeProps={active}>
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          {user && (
            <div className="rounded-lg bg-sidebar-accent p-3 text-xs">
              <p className="font-semibold text-sidebar-accent-foreground">{user.name}</p>
              <p className="text-sidebar-foreground/70">{ROLE_LABEL[user.role]}</p>
              <button
                onClick={signOut}
                className="mt-2 inline-flex items-center gap-1 text-sidebar-primary"
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
            <div className="min-w-0">
              <Logo />
            </div>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {user?.name[0]}
            </span>
          </header>
          <main className="mx-auto max-w-6xl p-4 pb-28 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] rounded-2xl border bg-card/95 p-1.5 shadow-elegant backdrop-blur md:hidden"
      >
        <Link
          to={home.to}
          activeOptions={{ exact: true }}
          className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-muted-foreground"
          activeProps={{ className: "bg-secondary text-primary" }}
        >
          <home.icon className="h-5 w-5" />
          {home.label}
        </Link>
        {groups.map((g) => {
          const on = g.items.some((i) => isActive(i.to));
          return (
            <DropdownMenu key={g.label}>
              <DropdownMenuTrigger
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium outline-none ${on ? "bg-secondary text-primary" : "text-muted-foreground"}`}
              >
                <g.icon className="h-5 w-5" />
                <span className="flex items-center gap-0.5">
                  {g.label}
                  <ChevronUp className="h-3 w-3" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="center"
                sideOffset={10}
                className="w-52 rounded-xl"
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {g.label}
                </DropdownMenuLabel>
                {g.items.map((n) => (
                  <DropdownMenuItem
                    key={n.to}
                    asChild
                    className={`gap-3 py-2.5 ${isActive(n.to) ? "text-primary font-semibold" : ""}`}
                  >
                    <Link to={n.to}>
                      <n.icon className="h-4 w-4" />
                      {n.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-muted-foreground outline-none">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {user?.name[0]}
            </span>
            Account
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={10} className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <span className="block truncate">{user?.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user && ROLE_LABEL[user.role]}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-3 py-2.5"
              onSelect={() => {
                resetDemo();
                setTimeout(() => window.location.reload(), 200);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset demo data
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 py-2.5 text-destructive" onSelect={signOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold md:text-3xl">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground md:text-base">{desc}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
