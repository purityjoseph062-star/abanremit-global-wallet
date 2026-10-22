import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/brand";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/beneficiaries")({ component: Beneficiaries });

export const beneficiarySchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient's full name").max(80),
  type: z.enum(["wallet", "bank", "mobile_money"]),
  destination: z.string().trim(),
  provider: z.string().optional(),
  currency: z.enum(["KES", "UGX", "TZS", "USD", "GBP", "EUR"]),
}).superRefine((v, ctx) => {
  const ok = v.type === "wallet" ? /^\d{12}$/.test(v.destination) : v.type === "mobile_money" ? /^\+\d{10,15}$/.test(v.destination) : /^\d{6,18}$/.test(v.destination);
  if (!ok) ctx.addIssue({ path: ["destination"], code: "custom", message: v.type === "wallet" ? "Wallet numbers are 12 digits" : v.type === "mobile_money" ? "Use international format, e.g. +254700000000" : "Bank account: 6–18 digits" });
  if (v.type !== "wallet" && !v.provider) ctx.addIssue({ path: ["provider"], code: "custom", message: "Choose a provider" });
});
type Form = z.infer<typeof beneficiarySchema>;

function Beneficiaries() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["beneficiaries"], queryFn: api.beneficiaries.list });
  const [q, setQ] = useState("");
  const [del, setDel] = useState<string | null>(null);
  const f = useForm<Form>({ resolver: zodResolver(beneficiarySchema), defaultValues: { type: "wallet", currency: "KES", name: "", destination: "" } });
  const type = f.watch("type");
  const create = useMutation({ mutationFn: api.beneficiaries.create, onSuccess: () => { qc.invalidateQueries(); f.reset(); toast.success("Recipient saved"); } });
  const remove = useMutation({ mutationFn: api.beneficiaries.remove, onSuccess: () => { qc.invalidateQueries(); toast.success("Recipient deleted"); } });
  const rows = list.data?.filter((b) => (b.name + b.destination).toLowerCase().includes(q.toLowerCase())) ?? [];
  const sel = "h-10 w-full rounded-md border bg-background px-3 text-sm";
  return (
    <>
      <PageHeader title="Beneficiaries" desc="Saved recipients for wallets, banks and mobile money." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border bg-card p-5">
          <Input placeholder="Search recipients…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search recipients" />
          <ul className="mt-4 divide-y">
            {rows.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3">
                <span><span className="block font-medium">{b.name}</span><span className="text-xs text-muted-foreground capitalize">{b.type.replace("_", " ")} · {b.destination}{b.provider ? ` · ${b.provider}` : ""} · {b.currency}</span></span>
                <span className="flex items-center gap-2"><StatusBadge status={b.verified ? "approved" : "pending_review"} />
                  <Button size="icon" variant="ghost" aria-label={`Delete ${b.name}`} onClick={() => setDel(b.id)}><Trash2 className="h-4 w-4" /></Button></span>
              </li>
            ))}
            {rows.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No recipients match.</li>}
          </ul>
        </section>
        <form onSubmit={f.handleSubmit((v) => create.mutate(v))} className="space-y-3 rounded-2xl border bg-card p-5" noValidate>
          <h2 className="font-semibold">Add recipient</h2>
          <div><Label htmlFor="name">Full name</Label><Input id="name" {...f.register("name")} />{f.formState.errors.name && <p className="text-xs text-destructive">{f.formState.errors.name.message}</p>}</div>
          <div><Label htmlFor="type">Type</Label><select id="type" className={sel} {...f.register("type")}><option value="wallet">AbanRemit wallet</option><option value="bank">Bank account</option><option value="mobile_money">Mobile money</option></select></div>
          <div><Label htmlFor="dest">{type === "wallet" ? "Wallet number" : type === "bank" ? "Account number" : "Phone number"}</Label><Input id="dest" {...f.register("destination")} />{f.formState.errors.destination && <p className="text-xs text-destructive">{f.formState.errors.destination.message}</p>}</div>
          {type !== "wallet" && <div><Label htmlFor="prov">Provider (demo)</Label><select id="prov" className={sel} {...f.register("provider")}><option value="">Choose…</option>{type === "bank" ? <><option>Demo Bank KE</option><option>Demo Bank UG</option></> : <><option>Demo Mobile KE</option><option>Demo Mobile UG</option></>}</select>{f.formState.errors.provider && <p className="text-xs text-destructive">{f.formState.errors.provider.message}</p>}</div>}
          <div><Label htmlFor="cur">Currency</Label><select id="cur" className={sel} {...f.register("currency")}>{["KES", "UGX", "TZS", "USD"].map((c) => <option key={c}>{c}</option>)}</select></div>
          <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Saving…" : "Save recipient"}</Button>
        </form>
      </div>
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this recipient?</AlertDialogTitle><AlertDialogDescription>Past transactions are kept. You can add the recipient again later.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (del) remove.mutate(del); setDel(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
