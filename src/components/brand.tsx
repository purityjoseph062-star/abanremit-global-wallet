import { Link } from "@tanstack/react-router";
import { FlaskConical, RotateCcw } from "lucide-react";
import { resetDemo } from "@/lib/demo/store";
import { toast } from "sonner";
import { api } from "@/lib/api";
import logo from "@/assets/abanremit-logo.png.asset.json";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link to="/login" className="flex items-center gap-2 font-display text-lg font-bold" aria-label="AbanRemit">
      <img src={logo.url} alt="" className="h-11 w-11 rounded-md object-contain" />
      <span className={inverted ? "text-primary-foreground" : "text-foreground"}>Aban<span className="text-accent">Remit</span></span>
    </Link>
  );
}

export function DemoBanner() {
  if (api.mode !== "demo") return null;
  return (
    <div className="flex items-center justify-center gap-3 bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground" role="status">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" /> <span>DEMO MODE<span className="hidden sm:inline"> — all funds, rates, people and verifications are simulated.</span></span>
      <button
        className="inline-flex items-center gap-1 underline underline-offset-2"
        onClick={() => { resetDemo(); toast.success("Demo data reset to original seed"); setTimeout(() => window.location.reload(), 400); }}
      >
        <RotateCcw className="h-3 w-3" /> Reset demo
      </button>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed" || status === "active" || status === "approved" ? "bg-success/15 text-success"
    : status === "failed" || status === "rejected" || status === "suspended" ? "bg-destructive/15 text-destructive"
    : "bg-warning/25 text-accent-foreground";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tone}`}>{status.replace(/_/g, " ")}</span>;
}
