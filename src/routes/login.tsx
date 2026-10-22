import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { DemoBanner, Logo } from "@/components/brand";
import { setState, useDemo } from "@/lib/demo/store";
import { can, ROLE_LABEL } from "@/lib/permissions";
import type { User } from "@/lib/domain/types";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ denied: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — AbanRemit demo" },
      { name: "description", content: "Choose a fictional demo persona to explore AbanRemit." },
      { property: "og:title", content: "Sign in — AbanRemit demo" },
      { property: "og:description", content: "Choose a fictional demo persona to explore AbanRemit." },
    ],
  }),
  component: Login,
});

function Login() {
  const users = useDemo((s) => s.users);
  const { denied } = Route.useSearch();
  const navigate = useNavigate();
  const go = (u: User) => {
    setState((s) => ({ ...s, personaId: u.id }));
    navigate({ to: can(u.role, "portal.customer") ? "/app" : can(u.role, "portal.agent") ? "/agent" : "/admin" });
  };
  return (
    <div className="min-h-screen bg-muted">
      <DemoBanner />
      <div className="mx-auto max-w-xl px-5 py-10 sm:py-16">
        <Logo />
        <h1 className="mt-8 text-3xl font-bold">Choose a demo persona</h1>
        <p className="mt-2 text-muted-foreground">Simulated sign-in. Every person below is fictional. Demo transfer PIN: <strong>1234</strong>.</p>
        {denied && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">That area requires the “{denied}” permission. Pick an authorised persona.</p>}
        <ul className="mt-8 space-y-3">
          {users.map((u) => (
            <li key={u.id}>
              <button onClick={() => go(u)} className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left transition hover:border-primary focus-visible:outline-2 focus-visible:outline-ring">
                <span><span className="block font-semibold">{u.name}</span><span className="text-sm text-muted-foreground">{u.email}</span></span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{ROLE_LABEL[u.role]}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-sm">New to AbanRemit? <Link to="/signup" className="font-semibold text-primary">Create an account</Link></p>
      </div>
    </div>
  );
}
