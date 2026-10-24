import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { ArrowRight, FlaskConical, UserRound } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setState, useDemo } from "@/lib/demo/store";
import { can, ROLE_LABEL } from "@/lib/permissions";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ denied: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Sign in — AbanRemit Wallet" },
    { name: "description", content: "Access your AbanRemit demo wallet and explore money transfers." },
    { property: "og:title", content: "Sign in — AbanRemit Wallet" },
    { property: "og:description", content: "Access your AbanRemit demo wallet and explore money transfers." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Login,
});

function Login() {
  const users = useDemo((s) => s.users);
  const { denied } = Route.useSearch();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setReady(true); }, []);
  const user = users.find((u) => u.id === selected) ?? users[0];
  return (
    <AuthLayout>
      <span className="mb-5 inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"><UserRound className="size-3.5" /> Your wallet, connected</span>
      <h1 className="text-3xl font-bold sm:text-4xl">Welcome back</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in to your AbanRemit wallet.</p>
      {denied && <p role="alert" className="mt-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive">That area requires the “{denied}” permission. Choose an authorised demo account.</p>}
      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
      <form className="mt-8 space-y-5" onSubmit={async (e) => {
        e.preventDefault();
        if (!ready || !user || busy) return;
        setBusy(true);
        setError("");
        try {
          setState((s) => ({ ...s, personaId: user.id }));
          await navigate({ to: can(user.role, "portal.customer") ? "/app" : can(user.role, "portal.agent") ? "/agent" : "/admin" });
        } catch {
          setError("Unable to open your demo wallet. Please allow browser storage and try again.");
        } finally {
          setBusy(false);
        }
      }}>
        <div>
          <Label htmlFor="demo-account">Demo account</Label>
          <select id="demo-account" value={user?.id ?? ""} onChange={(e) => setSelected(e.target.value)} className="mt-2 h-12 w-full rounded-md border bg-background px-3 text-sm">{users.map((u) => <option key={u.id} value={u.id}>{u.name} — {ROLE_LABEL[u.role]}</option>)}</select>
        </div>
        {user && <div className="flex items-center gap-3 border-l-2 border-primary pl-3"><UserRound className="size-5 shrink-0 text-primary" /><div className="min-w-0"><p className="break-all text-sm font-medium">{user.email}</p><p className="mt-0.5 text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p></div></div>}
        <Button type="submit" className="h-12 w-full" disabled={!ready || !user || busy}>{!ready ? "Loading sign-in…" : busy ? "Opening wallet…" : "Sign in to demo"}<ArrowRight /></Button>
      </form>
      <div className="mt-6 flex gap-3 rounded-md bg-muted p-4"><FlaskConical className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-xs leading-5 text-muted-foreground">Simulated access with fictional accounts. No password needed. Transfer PIN: <strong className="text-foreground">1234</strong>.</p></div>
      <p className="mt-8 text-center text-sm text-muted-foreground">New to AbanRemit? <Link to="/signup" className="font-semibold text-primary">Create an account</Link></p>
    </AuthLayout>
  );
}
