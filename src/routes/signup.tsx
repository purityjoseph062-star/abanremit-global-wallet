import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { ArrowRight, Eye, EyeOff, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getState, setState } from "@/lib/demo/store";
import type { Role, User, Wallet } from "@/lib/domain/types";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — AbanRemit demo" },
      { name: "description", content: "Open a demo AbanRemit wallet with its own account number." },
      { property: "og:title", content: "Create account — AbanRemit demo" },
      { property: "og:description", content: "Open a demo AbanRemit wallet with its own account number." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Signup,
});

const COUNTRIES = [{ c: "KE", n: "Kenya", d: "+254", cur: "KES" }, { c: "UG", n: "Uganda", d: "+256", cur: "UGX" }, { c: "TZ", n: "Tanzania", d: "+255", cur: "TZS" }] as const;

const schema = z.object({
  accountType: z.enum(["customer", "business_customer", "agent"]),
  country: z.enum(["KE", "UG", "TZ"]),
  name: z.string().trim().min(3, "Enter your full legal name").max(80),
  phone: z.string().regex(/^\d{9}$/, "Enter 9 digits without the leading 0"),
  email: z.string().trim().email("Enter a valid email").max(120),
  document: z.enum(["passport", "national_id", "residence_permit"]),
  password: z.string().min(8, "At least 8 characters"),
});
type F = z.infer<typeof schema>;

/** Demo-only number generator. Laravel generates and uniquely enforces real numbers. */
function nextWalletNumber(prefix: "1" | "2") {
  const used = new Set(getState().wallets.map((w) => w.number));
  let n: string;
  do { n = prefix + String(Math.floor(Math.random() * 1e11)).padStart(11, "0"); } while (used.has(n));
  return n;
}

function Signup() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<F | null>(null);
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const f = useForm<F>({ resolver: zodResolver(schema), defaultValues: { accountType: "customer", country: "KE", document: "national_id", name: "", phone: "", email: "", password: "" } });
  const country = COUNTRIES.find((c) => c.c === f.watch("country")) ?? COUNTRIES[0];
  const sel = "h-11 w-full rounded-md border bg-background px-3 text-sm";
  const err = (k: keyof F) => f.formState.errors[k] && <p className="mt-1 text-xs text-destructive">{f.formState.errors[k]?.message}</p>;

  const finish = () => {
    if (otp !== "123456") { toast.error("Incorrect code. Demo code is 123456."); return; }
    if (!pending) return;
    const v = pending; const c = COUNTRIES.find((x) => x.c === v.country) ?? COUNTRIES[0];
    const id = "u_" + crypto.randomUUID().slice(0, 8);
    const user: User = { id, name: v.name, email: v.email, phone: c.d + v.phone, country: v.country, role: v.accountType as Role, kycStatus: "pending_review" };
    const wallet: Wallet = { id: "w_" + crypto.randomUUID().slice(0, 8), number: nextWalletNumber(v.accountType === "agent" ? "2" : "1"), ownerId: id, currency: c.cur, accountType: v.accountType === "agent" ? "agent" : v.accountType === "business_customer" ? "business" : "personal", status: "pending_activation", available: 0, pending: 0, held: 0 };
    setState((s) => ({ ...s, users: [...s.users, user], wallets: [...s.wallets, wallet], personaId: id }));
    toast.success(`Wallet ${wallet.number} created — awaiting verification review`);
    navigate({ to: v.accountType === "agent" ? "/agent" : "/app" });
  };

  return (
    <AuthLayout registration>
        <ol aria-label="Registration progress" className="mb-7 flex items-center gap-3 text-xs font-semibold"><li className="flex items-center gap-2 text-primary"><span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">{pending ? <Check className="size-3.5" /> : "1"}</span>Account details</li><span className="h-px flex-1 bg-border" aria-hidden /><li className={`flex items-center gap-2 ${pending ? "text-primary" : "text-muted-foreground"}`}><span className="grid size-6 place-items-center rounded-full border">2</span>Verification</li></ol>
        {!pending ? (
          <form noValidate onSubmit={f.handleSubmit((v) => { setPending(v); toast.info("Demo code sent: 123456"); })} className="space-y-4">
            <div><h1 className="text-3xl font-bold">Create your account</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Your AbanRemit wallet starts here. Demo only — use fictional details.</p></div>
            <fieldset><legend className="mb-2 text-sm font-medium">Account type</legend>
              <div className="grid grid-cols-3 gap-2">{([["customer", "Personal"], ["business_customer", "Business"], ["agent", "Agent"]] as const).map(([v, l]) => (
                <label key={v} className="cursor-pointer rounded-md border p-3 text-center text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"><input type="radio" value={v} className="sr-only" {...f.register("accountType")} />{l}</label>))}</div></fieldset>
            <div><Label htmlFor="country">Country</Label><select id="country" className={sel} {...f.register("country")}>{COUNTRIES.map((c) => <option key={c.c} value={c.c}>{c.n}</option>)}</select></div>
            <div><Label htmlFor="name">Full legal name</Label><Input id="name" className="h-11" autoComplete="name" {...f.register("name")} />{err("name")}</div>
            <div><Label htmlFor="phone">Mobile number</Label><div className="flex"><span className="grid shrink-0 place-items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm">{country.d}</span><Input id="phone" className="h-11 rounded-l-none" inputMode="numeric" placeholder="700000000" {...f.register("phone")} /></div>{err("phone")}</div>
            <div><Label htmlFor="email">Email</Label><Input id="email" className="h-11" type="email" autoComplete="email" {...f.register("email")} />{err("email")}</div>
            <div><Label htmlFor="doc">Identity document</Label><select id="doc" className={sel} {...f.register("document")}><option value="national_id">National ID</option><option value="passport">Passport</option><option value="residence_permit">Residence permit / alien ID</option></select><p className="mt-1 text-xs text-muted-foreground">Uploads are not collected in the demo.</p></div>
            <div><Label htmlFor="pw">Password</Label><div className="relative"><Input id="pw" className="h-11 pr-12" type={showPassword ? "text" : "password"} autoComplete="new-password" {...f.register("password")} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" title={showPassword ? "Hide password" : "Show password"} aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div>{err("password")}</div>
            <p className="text-xs text-muted-foreground">Wallet currency: <strong>{country.cur}</strong></p>
            <Button type="submit" className="h-11 w-full">Continue<ArrowRight /></Button>
            <p className="text-center text-sm">Have an account? <Link to="/login" className="font-semibold text-primary">Sign in</Link></p>
          </form>
        ) : (
          <div className="space-y-4">
            <Smartphone className="mb-5 size-9 text-primary" /><h1 className="text-3xl font-bold">Verify your phone</h1>
            <p className="text-sm text-muted-foreground">Enter the code sent to {(COUNTRIES.find((c) => c.c === pending.country) ?? COUNTRIES[0]).d}{pending.phone}. Simulated — demo code <strong>123456</strong>.</p>
            <Input className="h-14 text-center font-mono text-2xl" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} aria-label="Verification code" />
            <Button className="h-11 w-full" disabled={otp.length !== 6} onClick={finish}>Verify & create wallet</Button>
            <Button variant="ghost" className="w-full" onClick={() => setPending(null)}>Back</Button>
          </div>
        )}
    </AuthLayout>
  );
}
