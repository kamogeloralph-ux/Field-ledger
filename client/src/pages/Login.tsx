import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFleetAuth } from "@/contexts/FleetAuthContext";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const { signIn, loading, error } = useFleetAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    try {
      await signIn(email, password, "admin");
      onSuccess();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Sign-in failed. Check your details and try again.");
    }
  };

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#FAF6EF] px-4 py-8 text-[#14532D] sm:px-6">
      <section className="w-full max-w-md rounded-[2rem] border border-[#E7DFD0] bg-white px-6 py-9 shadow-[0_24px_60px_-24px_rgba(20,83,45,0.25)] sm:px-10 sm:py-12">
        <div className="flex items-center gap-4">
          <img src={`${import.meta.env.BASE_URL}rovana-logo.png`} alt="Rovana logo — letter R formed by a winding road" className="h-14 w-14 rounded-2xl object-cover" />
          <div>
            <h2 className="font-slab text-[1.875rem] font-bold leading-none tracking-[-0.02em]">Rovana</h2>
            <p className="mt-1 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#6B7264]">Fleet Operations</p>
          </div>
        </div>
        <p className="mt-10 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#E8590C]">Admin sign in</p>
        <h1 className="mt-2 font-slab text-4xl font-bold leading-[1.15] tracking-[-0.02em] sm:text-[2.25rem]">Run the road.<br />Not the paperwork.</h1>
        <p className="mt-3 text-base text-[#6B7264]">Manage trucks, companies, defects, and daily fleet records.</p>
        <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
          <label className="block">
            <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#6B7264]">Work email</span>
            <Input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="mt-2 h-auto w-full rounded-2xl border-[#E7DFD0] bg-white px-5 py-4 text-base text-[#14532D] outline-none focus:border-[#E8590C] focus:ring-4 focus:ring-[#E8590C]/15" />
          </label>
          <label className="block">
            <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#6B7264]">Password</span>
            <Input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="mt-2 h-auto w-full rounded-2xl border-[#E7DFD0] bg-white px-5 py-4 text-base text-[#14532D] outline-none focus:border-[#E8590C] focus:ring-4 focus:ring-[#E8590C]/15" />
          </label>
          {(localError || error) && <div className="rounded-2xl border border-[#f0b7a5] bg-[#fff1ec] px-4 py-3 text-sm leading-5 text-[#a33f2a]">{localError || error}</div>}
          <Button type="submit" disabled={loading} className="mt-1 flex h-auto w-full items-center justify-center gap-3 rounded-full bg-gradient-to-br from-[#E8590C] to-[#D9480F] px-6 py-4 text-base font-medium text-[#FFF8F0] shadow-[0_12px_28px_-10px_rgba(232,89,12,0.55)] hover:brightness-105">{loading ? "Signing in…" : "Continue to workspace"}<ArrowRight className="h-5 w-5" /></Button>
        </form>
        <p className="mt-8 text-center text-sm text-[#6B7264]">Trouble signing in? <a href="mailto:fleet-admin@example.com" className="font-medium text-[#E8590C] hover:underline">Contact your fleet admin</a></p>
      </section>
    </main>
  );
}
