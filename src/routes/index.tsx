import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Globe2, ShieldCheck, Store, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBanner, Logo } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AbanRemit — One wallet number, money everywhere" },
      { name: "description", content: "Multi-currency wallet, transparent transfers and agent cash services. Interactive demo." },
      { property: "og:title", content: "AbanRemit — One wallet number, money everywhere" },
      { property: "og:description", content: "Multi-currency wallet, transparent transfers and agent cash services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const features = [
  { icon: Wallet, title: "Multi-currency wallets", body: "Hold KES, USD and more under one profile, each with its own permanent account number." },
  { icon: Globe2, title: "Transparent transfers", body: "See the fee, rate and exact recipient amount before you confirm. No surprises." },
  { icon: Store, title: "Agent cash services", body: "Cash-in and cash-out at authorised outlets, with receipts for both sides." },
  { icon: ShieldCheck, title: "Built for auditability", body: "Double-entry ledger, idempotent payments and audited admin actions." },
];

function Home() {
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <section className="bg-hero text-primary-foreground">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo inverted />
          <Button asChild variant="secondary"><Link to="/login">Try the demo</Link></Button>
        </header>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-24 pt-12 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">Wallet · Remittance · Agents</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">One wallet number.<br />Money that moves.</h1>
            <p className="mt-5 max-w-md text-lg text-primary-foreground/80">Receive, save, send and withdraw across wallets, banks, mobile money and agents — with every charge shown upfront.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/login">Open the demo <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          </div>
          <div className="relative">
            <div className="bg-wallet-card shadow-elegant rounded-3xl border border-primary-foreground/15 p-7">
              <div className="flex justify-between text-sm text-primary-foreground/70"><span>My Digital Wallet · Personal</span><span className="rounded-full bg-success/30 px-2 text-xs">Active</span></div>
              <p className="mt-8 text-xs uppercase tracking-widest text-primary-foreground/60">Wallet account number</p>
              <p className="font-display text-3xl font-semibold tracking-wider">1000 0028 4751</p>
              <div className="mt-8 flex justify-between text-sm"><span>KES</span><span className="text-primary-foreground/60">Illustrative example</span></div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-20 md:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border bg-muted p-6 text-sm text-muted-foreground">
          <strong className="text-foreground">Important:</strong> AbanRemit is shown here as a demonstration. Live deposits, withdrawals and held balances require appropriate licensing or authorised partner institutions. No country, currency or payment method is claimed as available.
        </div>
      </section>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© 2026 AbanRemit (demo). Legal pages pending legal review.</footer>
    </div>
  );
}
