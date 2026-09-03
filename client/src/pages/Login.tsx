import { useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck, Truck as TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type FleetRole, useFleetAuth } from "@/contexts/FleetAuthContext";

const roleOptions: Array<{ value: FleetRole; label: string; description: string }> = [
  { value: "driver", label: "Driver", description: "Complete today’s truck inspection" },
  { value: "admin", label: "Admin", description: "Manage the fleet and driver roster" },
];

export default function Login({ onSuccess, mode }: { onSuccess: () => void; mode?: FleetRole }) {
  const { signIn, loading, error } = useFleetAuth();
  const [role, setRole] = useState<FleetRole>(mode ?? "driver");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    try {
      await signIn(email, password, mode ?? role);
      onSuccess();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Sign-in failed. Check your details and try again.");
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#ede9dd] px-3 py-3 text-[#2e4335] sm:px-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-md overflow-hidden rounded-2xl border border-[#d6d0c1] bg-[#fbf8ef] shadow-[0_24px_80px_rgba(46,67,53,0.14)] lg:max-w-6xl lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden overflow-hidden bg-[#203d2d] lg:block px-6 py-8 text-[#f5f0e2] sm:px-12 sm:py-12 lg:px-16 lg:py-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#f4a36f]/20" />
          <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full border border-[#f4a36f]/20" />
          <div className="relative flex h-full flex-col justify-between gap-16">
            <div>
              <div className="mb-12 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#f4a36f]/60 bg-[#f4a36f]/15"><TruckIcon className="h-5 w-5 text-[#f4a36f]" /></div>
                <div><p className="font-slab text-xl font-bold tracking-[-0.04em]">Field Ledger</p><p className="text-[10px] uppercase tracking-[0.22em] text-[#b7c6b6]">Fleet operations</p></div>
              </div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f4a36f]">Secure yard access</p>
              <h1 className="max-w-lg font-slab text-4xl font-bold leading-[0.98] tracking-[-0.05em] sm:text-6xl">Start every shift with a clear record.</h1>
              <p className="mt-6 max-w-md text-sm leading-7 text-[#d2ded0]">Sign in to inspect assigned trucks, review live fleet status, or manage the roster from a single operational source of truth.</p>
            </div>
            <div className="grid gap-3 text-xs text-[#cad8ca] sm:grid-cols-3">
              {[["01", "Identity"], ["02", "Evidence"], ["03", "Accountability"]].map(([number, label]) => <div key={number} className="border-t border-[#b7c6b6]/25 pt-3"><span className="font-mono text-[#f4a36f]">{number}</span><p className="mt-2 font-semibold">{label}</p></div>)}
            </div>
          </div>
        </section>

        <section className="flex items-center px-4 py-5 sm:px-12 sm:py-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-5">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#2f4638] shadow-[3px_3px_0_#e9682a]" aria-label="Field Ledger logo"><TruckIcon className="h-5 w-5 text-[#f4a36f]" /></div>
                <div><div className="font-slab text-lg font-bold tracking-[-0.03em] text-[#263c30]">Field Ledger</div><div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#7b8775]">Fleet operations</div></div>
              </div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e9682a]">{mode === "admin" ? "Admin sign in" : "Driver sign in"}</p>
              <h2 className="font-slab text-2xl font-bold tracking-[-0.05em] text-[#2e4335] sm:text-4xl">{mode === "admin" ? "Manage the fleet" : "Start your inspection"}</h2>
              <p className="mt-2 text-xs leading-5 text-[#6d7a6d]">{mode === "admin" ? "Manage trucks, drivers, defects, and daily fleet records." : "Complete your assigned truck checklist and submit today’s evidence."}</p>
            </div>
            <form onSubmit={submit} className="space-y-3.5 sm:space-y-5">
              {!mode && <div><label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#667466]">I am signing in as</label><div className="grid gap-2 sm:grid-cols-2">{roleOptions.map((option) => <button type="button" key={option.value} onClick={() => setRole(option.value)} className={cn("rounded-xl border px-3 py-3 text-left transition", role === option.value ? "border-[#2f8b5e] bg-[#e8eee5] text-[#2e4335]" : "border-[#d7d1c3] bg-[#fffdf6] text-[#7c877c] hover:border-[#a9b9a8]")}><span className="block text-xs font-bold">{option.label}</span><span className="mt-1 block text-[10px] leading-4">{option.description}</span></button>)}</div></div>}
              <div><label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#667466]">Work email</label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="h-11 rounded-xl border-[#d4cfc1] bg-[#fffdf6] text-sm" /></div>
              <div><label htmlFor="password" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#667466]">Password</label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-11 rounded-xl border-[#d4cfc1] bg-[#fffdf6] text-sm" /></div>
              {(localError || error) && <div className="rounded-xl border border-[#e7b6aa] bg-[#fff0ec] px-4 py-3 text-sm leading-5 text-[#a33f2a]">{localError || error}</div>}
              <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-[#e9682a] text-sm font-bold text-white hover:bg-[#d95a20]">{loading ? "Signing in…" : "Continue to workspace"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
            </form>
            <div className="mt-5 hidden grid gap-3 border-t sm:grid border-[#ded8ca] pt-6 text-xs text-[#788477] sm:grid-cols-2"><div className="flex gap-2"><LockKeyhole className="h-4 w-4 shrink-0 text-[#6a8d70]" /><span>Session protected by Supabase Auth</span></div><div className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-[#6a8d70]" /><span>Access follows your fleet role</span></div></div>
          </div>
        </section>
      </div>
    </main>
  );
}
