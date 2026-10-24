import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/assets/abanremit-logo.png.asset.json";

export function AuthLayout({ children, registration = false }: { children: ReactNode; registration?: boolean }) {
  return (
    <div className="auth-theme min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)]">
      <aside className="auth-brand flex flex-col items-center justify-center px-6 py-5 lg:sticky lg:top-0 lg:h-screen lg:px-12">
        <Link to="/login" aria-label="AbanRemit sign in" className="block w-36 lg:w-full lg:max-w-sm">
          <img src={logo.url} alt="AbanRemit Wallet — Send, Receive, Transact, Anywhere" className="aspect-square w-full object-contain" />
        </Link>
        <span className="mt-3 hidden items-center gap-2 text-xs font-medium text-brand-caption lg:inline-flex"><ShieldCheck className="size-4" /> Demo workspace</span>
      </aside>
      <main className="flex min-w-0 flex-col px-5 py-6 sm:px-10 lg:px-14 lg:py-8">
        <nav aria-label="Account navigation" className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-primary">AbanRemit Wallet</span>
          <Link to={registration ? "/login" : "/signup"} className="inline-flex items-center gap-1.5 font-semibold text-primary">{registration && <ArrowLeft className="size-3.5" />}{registration ? "Sign in" : "Create account"}</Link>
        </nav>
        <div className="mx-auto my-auto w-full max-w-md py-9 sm:py-12">{children}</div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground"><span>© {new Date().getFullYear()} AbanRemit</span><span>Demo only · No real money</span></footer>
      </main>
    </div>
  );
}