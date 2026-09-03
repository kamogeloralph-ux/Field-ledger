import React, { useEffect, useState } from "react";
import { ArrowLeft, Download, RefreshCw, Save, ShieldCheck, Trash2, Truck as TruckIcon, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { type FleetRole, useFleetAuth } from "@/contexts/FleetAuthContext";
import Login from "@/pages/Login";

type AdminTruck = { id: string; fleet_number: string; registration: string; truck_type: string | null; model: string | null; size: string | null; status: "ready" | "inspection_due" | "out_of_service" };
type AdminDriver = { id: string; auth_user_id: string | null; employee_number: string | null; full_name: string; phone: string | null; role: FleetRole; active: boolean };

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { loading, profile } = useFleetAuth();
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#ede9dd] text-[#2e4335]">Loading secure admin area…</div>;
  if (!profile) return <Login onSuccess={() => window.location.reload()} />;
  if (profile.role !== "admin") return <main className="grid min-h-screen place-items-center bg-[#ede9dd] p-6"><div className="max-w-md rounded-2xl border border-[#e1c4b7] bg-[#fff5f0] p-8 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-[#b65323]" /><h1 className="mt-4 font-slab text-3xl font-bold text-[#2e4335]">Admin access required</h1><p className="mt-3 text-sm leading-6 text-[#6d7a6d]">This page is restricted to the admin role. Ask an administrator to update your fleet profile, then sign in again.</p></div></main>;
  return <>{children}</>;
}

export default function Admin() {
  return <AdminGate><AdminWorkspace /></AdminGate>;
}

function AdminWorkspace() {
  const { profile, signOut } = useFleetAuth();
  const [trucks, setTrucks] = useState<AdminTruck[]>([]);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [truckForm, setTruckForm] = useState({ fleet_number: "", registration: "", truck_type: "", model: "", size: "", status: "ready" as AdminTruck["status"] });
  const [driverForm, setDriverForm] = useState({ auth_user_id: "", employee_number: "", full_name: "", phone: "", role: "driver" as FleetRole });
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) return;
    setLoading(true);
    const [{ data: truckData, error: truckError }, { data: driverData, error: driverError }] = await Promise.all([
      supabase.from("trucks").select("id, fleet_number, registration, truck_type, model, size, status").order("fleet_number"),
      supabase.from("drivers").select("id, auth_user_id, employee_number, full_name, phone, role, active").order("full_name"),
    ]);
    if (truckError || driverError) toastError(truckError?.message || driverError?.message || "Unable to load admin data.");
    setTrucks((truckData ?? []) as AdminTruck[]);
    setDrivers((driverData ?? []) as AdminDriver[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const saveTruck = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    const payload = { fleet_number: truckForm.fleet_number.trim(), registration: truckForm.registration.trim().toUpperCase(), truck_type: truckForm.truck_type.trim() || null, model: truckForm.model.trim() || null, size: truckForm.size.trim() || null, status: truckForm.status };
    if (!payload.fleet_number || !payload.registration) return toastError("Fleet number and registration are required.");
    const result = editingTruckId
      ? await supabase.from("trucks").update(payload).eq("id", editingTruckId)
      : await supabase.from("trucks").insert(payload);
    if (result.error) return toastError(result.error.message);
    toastSuccess(editingTruckId ? "Truck updated." : "Truck added.");
    setTruckForm({ fleet_number: "", registration: "", truck_type: "", model: "", size: "", status: "ready" });
    setEditingTruckId(null);
    await load();
  };

  const exportTrucks = () => {
    const rows = [["Fleet number", "Registration", "Truck type", "Model", "Size", "Status"], ...trucks.map((truck) => [truck.fleet_number, truck.registration, truck.truck_type ?? "", truck.model ?? "", truck.size ?? "", truck.status])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `field-ledger-fleet-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const deleteTruck = async (truck: AdminTruck) => {
    if (!supabase || !window.confirm(`Delete fleet ${truck.fleet_number}? This cannot be undone.`)) return;
    const { error } = await supabase.from("trucks").delete().eq("id", truck.id);
    if (error) return toastError(error.message);
    toastSuccess("Truck deleted.");
    await load();
  };

  const saveDriver = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    const payload = { auth_user_id: driverForm.auth_user_id.trim() || null, employee_number: driverForm.employee_number.trim() || null, full_name: driverForm.full_name.trim(), phone: driverForm.phone.trim() || null, role: driverForm.role, active: true };
    if (!payload.full_name) return toastError("Driver name is required.");
    const { error } = await supabase.from("drivers").insert(payload);
    if (error) return toastError(error.message);
    toastSuccess("Driver profile added.");
    setDriverForm({ auth_user_id: "", employee_number: "", full_name: "", phone: "", role: "driver" });
    await load();
  };

  const deleteDriver = async (driver: AdminDriver) => {
    if (!supabase || !window.confirm(`Delete ${driver.full_name}'s fleet profile?`)) return;
    const { error } = await supabase.from("drivers").delete().eq("id", driver.id);
    if (error) return toastError(error.message);
    toastSuccess("Driver profile deleted.");
    await load();
  };

  return <main className="min-h-screen bg-[#ede9dd] text-[#2e4335]"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d8d3c5] bg-[#f7f3e9] px-4 py-4 sm:px-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2f4638] text-[#f4a36f]"><ShieldCheck className="h-5 w-5" /></div><div><p className="font-slab text-xl font-bold tracking-[-0.03em]">Admin control</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7b8775]">Field Ledger · {profile?.full_name}</p></div></div><div className="flex items-center gap-2"><Button variant="outline" onClick={exportTrucks} className="h-9 rounded-lg border-[#d2cec0] bg-[#fbf8ef] text-xs font-bold"><Download className="mr-2 h-3.5 w-3.5" />Export</Button><Button variant="outline" onClick={() => void load()} className="h-9 rounded-lg border-[#d2cec0] bg-[#fbf8ef] text-xs font-bold"><RefreshCw className="mr-2 h-3.5 w-3.5" />Refresh</Button><Button variant="outline" onClick={() => void signOut()} className="h-9 rounded-lg border-[#d2cec0] bg-[#fbf8ef] text-xs font-bold"><X className="mr-2 h-3.5 w-3.5" />Sign out</Button></div></header><div className="mx-auto max-w-7xl space-y-8 p-4 pb-16 sm:p-8 lg:p-10"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7c887b]"><a href="./" className="inline-flex items-center gap-2 hover:text-[#e9682a]"><ArrowLeft className="h-3.5 w-3.5" />Return to workspace</a><span>/</span><span className="text-[#e9682a]">Admin only</span></div><section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]"><div className="paper-panel overflow-hidden rounded-2xl border border-[#d8d3c5]"><div className="flex items-start justify-between border-b border-[#dfd9ca] px-5 py-5 sm:px-6"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]"><TruckIcon className="h-3.5 w-3.5 text-[#e9682a]" />Master fleet</div><h1 className="font-slab text-2xl font-bold tracking-[-0.04em]">Fleet records</h1></div><span className="rounded-full bg-[#e8eee5] px-3 py-1 text-xs font-bold text-[#45664e]">{trucks.length} trucks</span></div><div className="divide-y divide-[#e5dfd3]">{loading ? <div className="p-6 text-sm text-[#7c887b]">Loading fleet records…</div> : trucks.map((truck) => <div key={truck.id} role="button" tabIndex={0} onClick={() => { setEditingTruckId(truck.id); setTruckForm({ fleet_number: truck.fleet_number, registration: truck.registration, truck_type: truck.truck_type ?? "", model: truck.model ?? "", size: truck.size ?? "", status: truck.status }); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setEditingTruckId(truck.id); setTruckForm({ fleet_number: truck.fleet_number, registration: truck.registration, truck_type: truck.truck_type ?? "", model: truck.model ?? "", size: truck.size ?? "", status: truck.status }); } }} className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-[#f5f1e7] sm:px-6"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#e8eee5] text-[#47654e]"><TruckIcon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="font-mono text-sm font-bold">{truck.fleet_number}</div><div className="font-mono text-xs font-bold tracking-[0.08em] text-[#e9682a]">{truck.registration}</div></div><span className="text-xs font-semibold text-[#728071]">{truck.status.replaceAll("_", " ")}</span><Button variant="outline" onClick={(event) => { event.stopPropagation(); setEditingTruckId(truck.id); setTruckForm({ fleet_number: truck.fleet_number, registration: truck.registration, truck_type: truck.truck_type ?? "", model: truck.model ?? "", size: truck.size ?? "", status: truck.status }); }} className="h-8 rounded-lg border-[#d2cec0] bg-[#fbf8ef] text-xs font-bold">Edit</Button><Button variant="outline" onClick={(event) => { event.stopPropagation(); void deleteTruck(truck); }} className="h-8 rounded-lg border-[#e8c4b8] bg-[#fff6f1] text-xs font-bold text-[#a44b2d]"><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div></div><form onSubmit={saveTruck} className={cn("paper-panel h-fit rounded-2xl border border-[#d8d3c5] p-5 sm:p-6", editingTruckId && "fixed inset-4 z-50 mx-auto max-w-xl overflow-y-auto bg-[#fbf8ef] shadow-[0_24px_80px_rgba(46,67,53,0.25)] sm:inset-8")}><div className="mb-5 flex items-center justify-between"><div><div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">{editingTruckId ? "Edit record" : "New record"}</div><h2 className="font-slab text-2xl font-bold">{editingTruckId ? "Update truck" : "Add truck"}</h2></div>{editingTruckId && <Button type="button" variant="ghost" onClick={() => { setEditingTruckId(null); setTruckForm({ fleet_number: "", registration: "", truck_type: "", model: "", size: "", status: "ready" }); }} className="h-8 text-xs font-bold">Cancel</Button>}</div><div className="space-y-4"><Field label="Fleet number"><Input required value={truckForm.fleet_number} onChange={(event) => setTruckForm({ ...truckForm, fleet_number: event.target.value })} placeholder="e.g. 7100796" /></Field><Field label="Registration"><Input required value={truckForm.registration} onChange={(event) => setTruckForm({ ...truckForm, registration: event.target.value })} placeholder="e.g. LC77YCGP" /></Field><Field label="Truck type"><Input value={truckForm.truck_type} onChange={(event) => setTruckForm({ ...truckForm, truck_type: event.target.value })} placeholder="Optional" /></Field><Field label="Model"><Input value={truckForm.model} onChange={(event) => setTruckForm({ ...truckForm, model: event.target.value })} placeholder="e.g. Actros" /></Field><Field label="Size"><Input value={truckForm.size} onChange={(event) => setTruckForm({ ...truckForm, size: event.target.value })} placeholder="e.g. 18 ton" /></Field><label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#667466]">Status<select value={truckForm.status} onChange={(event) => setTruckForm({ ...truckForm, status: event.target.value as AdminTruck["status"] })} className="mt-2 h-10 w-full rounded-xl border border-[#d4cfc1] bg-[#fffdf6] px-3 text-sm font-medium normal-case tracking-normal text-[#405343] outline-none"><option value="ready">Ready</option><option value="inspection_due">Inspection due</option><option value="out_of_service">Out of service</option></select></label><Button type="submit" className="h-11 w-full rounded-xl bg-[#2f4638] text-sm font-bold text-white"><Save className="mr-2 h-4 w-4" />{editingTruckId ? "Save truck" : "Add truck"}</Button></div></form></section><section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"><form onSubmit={saveDriver} className="paper-panel h-fit rounded-2xl border border-[#d8d3c5] p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8eee5] text-[#47654e]"><UserPlus className="h-5 w-5" /></div><div><div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Roster control</div><h2 className="font-slab text-2xl font-bold">Add driver profile</h2></div></div><p className="mb-5 rounded-xl border border-[#ded8ca] bg-[#f5f1e7] px-3 py-3 text-xs leading-5 text-[#6e7c70]">Create the Supabase Auth user first, then paste its User UID here so this profile can be linked to the driver’s login.</p><div className="space-y-4"><Field label="Auth user UID"><Input value={driverForm.auth_user_id} onChange={(event) => setDriverForm({ ...driverForm, auth_user_id: event.target.value })} placeholder="Supabase Authentication user UID" /></Field><Field label="Full name"><Input required value={driverForm.full_name} onChange={(event) => setDriverForm({ ...driverForm, full_name: event.target.value })} placeholder="Driver full name" /></Field><Field label="Employee number"><Input value={driverForm.employee_number} onChange={(event) => setDriverForm({ ...driverForm, employee_number: event.target.value })} placeholder="Optional" /></Field><Field label="Phone"><Input value={driverForm.phone} onChange={(event) => setDriverForm({ ...driverForm, phone: event.target.value })} placeholder="Optional" /></Field><label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#667466]">Role<select value={driverForm.role} onChange={(event) => setDriverForm({ ...driverForm, role: event.target.value as FleetRole })} className="mt-2 h-10 w-full rounded-xl border border-[#d4cfc1] bg-[#fffdf6] px-3 text-sm font-medium normal-case tracking-normal text-[#405343] outline-none"><option value="driver">Driver</option><option value="supervisor">Supervisor</option><option value="admin">Admin</option></select></label><Button type="submit" className="h-11 w-full rounded-xl bg-[#e9682a] text-sm font-bold text-white"><UserPlus className="mr-2 h-4 w-4" />Add profile</Button></div></form><div className="paper-panel overflow-hidden rounded-2xl border border-[#d8d3c5]"><div className="flex items-start justify-between border-b border-[#dfd9ca] px-5 py-5 sm:px-6"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]"><Users className="h-3.5 w-3.5 text-[#e9682a]" />People</div><h2 className="font-slab text-2xl font-bold">Driver profiles</h2></div><span className="rounded-full bg-[#e8eee5] px-3 py-1 text-xs font-bold text-[#45664e]">{drivers.length} profiles</span></div><div className="divide-y divide-[#e5dfd3]">{loading ? <div className="p-6 text-sm text-[#7c887b]">Loading driver profiles…</div> : drivers.map((driver) => <div key={driver.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e9eee7] text-xs font-bold text-[#47664d]">{driver.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-[#344b3b]">{driver.full_name}</div><div className="text-xs text-[#849083]">{driver.role} · {driver.employee_number || "No employee number"}</div></div><span className={cn("h-2 w-2 rounded-full", driver.active ? "bg-[#6ba377]" : "bg-[#b1aaa0]")} /><Button variant="outline" onClick={() => void deleteDriver(driver)} className="h-8 rounded-lg border-[#e8c4b8] bg-[#fff6f1] text-xs font-bold text-[#a44b2d]"><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div></div></section></div></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#667466]">{label}<div className="mt-2">{children}</div></label>; }
function toastSuccess(message: string) { window.dispatchEvent(new CustomEvent("field-ledger-toast", { detail: { type: "success", message } })); }
function toastError(message: string) { window.dispatchEvent(new CustomEvent("field-ledger-toast", { detail: { type: "error", message } })); }
