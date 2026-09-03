/* Field Ledger direction: evidence-led operational interface with ruled sections, tactile records, and large field-ready actions. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Cloud,
  Download,
  FileCheck2,
  Gauge,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  PenLine,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Truck as TruckIcon,
  Upload,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleVisibleAction } from "@/components/RoleVisibleAction";
import { cn } from "@/lib/utils";
import { checklistSections, demoDrivers, inspections, today, trucks, type Truck } from "@/lib/demo-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { type FleetRole, useFleetAuth } from "@/contexts/FleetAuthContext";
import { canAccessView, defaultViewForRole, type WorkspaceView } from "@/lib/access-control";
import { buildInspectionDraft, clearInspectionDraft, loadInspectionDraft, saveInspectionDraft, submitInspection as submitInspectionToSupabase, syncQueuedInspection } from "@/lib/inspection-sync.js";
import { formatFleetNumber, onlyDigits } from "@/lib/fleet-number";

const markUrl = "/manus-storage/field-ledger-mark_99bde0f5.png";
const truckDetailUrl = "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1600&q=85";
const cabInteriorUrl = "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=85";

type View = WorkspaceView;

const photoSlots = [
  { id: "front", label: "Front", helper: "Headlamps & plate" },
  { id: "rear", label: "Rear", helper: "Doors & lights" },
  { id: "left", label: "Left side", helper: "Body & tyres" },
  { id: "right", label: "Right side", helper: "Body & tyres" },
  { id: "cab", label: "Cab interior", helper: "Controls & seat" },
  { id: "dashboard", label: "Dashboard", helper: "Warning lights" },
];

function describeInspectionError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const value = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [value.message, value.details, value.hint, value.code ? `code ${value.code}` : undefined].filter(Boolean);
    if (parts.length) return parts.join(" — ");
  }
  return "The server rejected the inspection";
}

function StatusPill({ status }: { status: Truck["status"] | "Completed" | "Needs review" | "In progress" }) {
  const styles = {
    Ready: "bg-[#e5efe5] text-[#2f5b3f]",
    Completed: "bg-[#e5efe5] text-[#2f5b3f]",
    "Inspection due": "bg-[#fff0dc] text-[#a54d1f]",
    "Needs review": "bg-[#ffe7d7] text-[#9a411e]",
    "In progress": "bg-[#e9eee8] text-[#42624b]",
    "Out of service": "bg-[#f3e4df] text-[#954939]",
  } as const;

  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]", styles[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

function SectionEyebrow({ children, icon: Icon = CircleDot }: { children: React.ReactNode; icon?: React.ElementType }) {
  return <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]"><Icon className="h-3.5 w-3.5 text-[#e9682a]" />{children}</div>;
}

function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact && "gap-2")}>
      <div className={cn("grid h-10 w-10 place-items-center overflow-hidden rounded-[10px] bg-[#2f4638] shadow-[4px_4px_0_#e9682a]", compact && "h-8 w-8 rounded-lg shadow-[3px_3px_0_#e9682a]")}>
        <img src={markUrl} alt="Field Ledger mark" className="h-full w-full object-contain p-1.5" />
      </div>
      {!compact && <div><div className="font-slab text-[17px] font-bold tracking-[-0.02em] text-[#263c30]">Field Ledger</div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7b8775]">Fleet operations</div></div>}
    </div>
  );
}

function Sidebar({ activeView, onNavigate, role }: { activeView: View; onNavigate: (view: View) => void; role: FleetRole | null }) {
  const items: { id: View; label: string; icon: React.ElementType; count?: string }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "inspection", label: "Start inspection", icon: ClipboardCheck },
    { id: "fleet", label: "Fleet register", icon: TruckIcon, count: "84" },
    { id: "defects", label: "Defects", icon: Wrench, count: "03" },
  ];
  const visibleItems = items.filter((item) => canAccessView(role, item.id));

  return (
    <aside className="hidden min-h-screen w-[238px] shrink-0 flex-col border-r border-[#d6d2c4] bg-[#e9e4d6] px-5 py-6 lg:flex">
      <div className="mb-12 px-2"><AppLogo /></div>
      <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b9486]">Control room</div>
      <nav className="space-y-1">
        {visibleItems.map(({ id, label, icon: Icon, count }) => (
          <button key={id} onClick={() => onNavigate(id)} className={cn("group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#627064] transition duration-150 hover:bg-[#f5f1e7] hover:text-[#2f4638] active:scale-[0.98]", activeView === id && "bg-[#f9f5ea] text-[#2f4638] shadow-[0_2px_0_rgba(47,70,56,0.08)]")}>
            <span className={cn("grid h-8 w-8 place-items-center rounded-lg text-[#7e897b] transition group-hover:text-[#e9682a]", activeView === id && "bg-[#2f4638] text-[#f9f5ea]")}><Icon className="h-4 w-4" /></span>
            <span className="flex-1">{label}</span>
            {count && <span className={cn("text-[11px] font-bold tabular-nums text-[#9ba398]", activeView === id && "text-[#e9682a]")}>{count}</span>}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-4">
        <div className="rounded-xl border border-[#d0cbbd] bg-[#f4f0e5] p-3.5">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#748174]"><Cloud className="h-3.5 w-3.5 text-[#e9682a]" />System status</div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#45614e]"><span className="h-2 w-2 rounded-full bg-[#6ba377] shadow-[0_0_0_3px_#d9ead8]" />{isSupabaseConfigured ? "Supabase client configured" : "Demo mode — ready to connect"}</div>
        </div>
        <button className="flex w-full items-center gap-3 px-2 py-2 text-sm font-semibold text-[#738073] transition hover:text-[#2f4638]"><Settings2 className="h-4 w-4" />Settings</button>
      </div>
    </aside>
  );
}

function MobileNav({ activeView, onNavigate, role }: { activeView: View; onNavigate: (view: View) => void; role: FleetRole | null }) {
  const items: { id: View; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Home", icon: LayoutDashboard },
    { id: "inspection", label: "Inspect", icon: ClipboardCheck },
    { id: "fleet", label: "Fleet", icon: TruckIcon },
    { id: "defects", label: "Defects", icon: Wrench },
  ];
  const visibleItems = items.filter((item) => canAccessView(role, item.id));
  return <div className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[#d4d0c2] bg-[#f8f4ea]/95 px-2 py-2 backdrop-blur-xl lg:hidden">{visibleItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onNavigate(id)} className={cn("flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#849083]", activeView === id && "text-[#2f4638]")}><span className={cn("grid h-7 w-10 place-items-center rounded-full", activeView === id && "bg-[#e4eee2] text-[#2f4638]")}><Icon className="h-4 w-4" /></span>{label}</button>)}</div>;
}

function TopBar({ activeView, onNavigate }: { activeView: View; onNavigate: (view: View) => void }) {
  const title = { overview: "Operations overview", inspection: "Daily inspection", fleet: "Fleet register", defects: "Defect queue" }[activeView];
  const { profile, signOut } = useFleetAuth();
  const initials = profile?.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "FL";
  return <header className="flex items-center justify-between border-b border-[#d8d3c5] bg-[#f7f3e9]/80 px-4 py-4 backdrop-blur-xl sm:px-8 lg:px-10"><div className="flex items-center gap-3"><button className="grid h-9 w-9 place-items-center rounded-lg text-[#6d7b6e] hover:bg-[#e8e5da] lg:hidden"><Menu className="h-5 w-5" /></button><div><div className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a9386] sm:block">Control room / {activeView}</div><h1 className="font-slab text-xl font-bold tracking-[-0.02em] text-[#293e31] sm:text-2xl">{title}</h1></div></div><div className="flex items-center gap-2 sm:gap-4"><div className="hidden items-center gap-2 rounded-full border border-[#d2cec0] bg-[#fdf9ef] px-3 py-2 text-xs font-semibold text-[#667466] md:flex"><CalendarDays className="h-3.5 w-3.5 text-[#e9682a]" />{today.label}</div><button className="relative grid h-9 w-9 place-items-center rounded-full border border-[#d2cec0] bg-[#fbf8ef] text-[#677568] transition hover:border-[#afb9aa]" aria-label="Notifications"><Bell className="h-4 w-4" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#e9682a]" /></button><div className="text-right"><div className="text-xs font-bold text-[#344b3b]">{profile?.full_name}</div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#829083]">{profile?.role}</div></div><button onClick={() => void signOut()} className="group grid h-9 w-9 place-items-center rounded-full bg-[#2f4638] text-xs font-bold text-[#fbf7eb]" title="Sign out" aria-label="Sign out"><span className="group-hover:hidden">{initials}</span><LogOut className="hidden h-4 w-4 group-hover:block" /></button></div></header>;
}

function MetricCard({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string; detail: string; icon: React.ElementType; accent?: boolean }) {
  return <div className={cn("paper-panel rounded-xl border border-[#d8d3c5] p-4 sm:p-5", accent && "border-[#e9682a]/30 bg-[#fff6eb]")}><div className="mb-5 flex items-start justify-between"><div className={cn("grid h-9 w-9 place-items-center rounded-lg bg-[#e6eee3] text-[#45664e]", accent && "bg-[#ffe3c4] text-[#b25525]")}><Icon className="h-4 w-4" /></div>{accent && <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#e9682a]">Action</span>}</div><div className="font-slab text-3xl font-bold tracking-[-0.04em] text-[#2c4133]">{value}</div><div className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-[#718070]">{label}</div><div className="mt-3 border-t border-[#e0dbce] pt-3 text-xs font-medium text-[#8a9386]">{detail}</div></div>;
}

type LiveOverviewInspection = {
  id: string;
  status: "in_progress" | "completed" | "needs_review" | "rejected";
  submitted_at: string | null;
  inspection_date: string;
  driver?: { full_name: string }[] | null;
  truck?: { fleet_number: string; registration: string }[] | null;
};

type LiveOverviewDefect = { id: string; category: string; status: "open" | "in_progress" | "resolved" | "waived"; title: string; created_at: string; inspection?: { truck?: { fleet_number: string }[] | null }[] | null };

function Overview({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { role } = useFleetAuth();
  const [inspectionRows, setInspectionRows] = useState<LiveOverviewInspection[]>([]);
  const [defectRows, setDefectRows] = useState<LiveOverviewDefect[]>([]);
  const [truckCount, setTruckCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const loadOverview = async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const [inspectionResult, defectResult, truckResult] = await Promise.all([
      supabase.from("daily_inspections").select("id, status, submitted_at, inspection_date, driver:drivers(full_name), truck:trucks(fleet_number, registration)").order("created_at", { ascending: false }).limit(20),
      supabase.from("defects").select("id, category, status, title, created_at, inspection:daily_inspections(truck:trucks(fleet_number))").neq("status", "resolved").neq("status", "waived").order("created_at", { ascending: false }).limit(10),
      supabase.from("trucks").select("id", { count: "exact", head: true }),
    ]);
    const error = inspectionResult.error || defectResult.error || truckResult.error;
    if (error) {
      toast.error(`Live dashboard refresh failed: ${error.message}`);
      setLive(false);
    } else {
      setInspectionRows((inspectionResult.data ?? []) as unknown as LiveOverviewInspection[]);
      setDefectRows((defectResult.data ?? []) as unknown as LiveOverviewDefect[]);
      setTruckCount(truckResult.count ?? 0);
      setLastSync(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setLive(true);
    }
    setLoading(false);
  };

  useEffect(() => { void loadOverview(); }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayInspections = inspectionRows.filter((inspection) => inspection.inspection_date === todayKey);
  const completedToday = todayInspections.filter((inspection) => inspection.status === "completed").length;
  const needsAttention = defectRows.length + todayInspections.filter((inspection) => inspection.status === "needs_review" || inspection.status === "rejected").length;
  const clearedPercent = truckCount ? Math.min(100, Math.round((completedToday / truckCount) * 100)) : 0;
  const latest = inspectionRows.slice(0, 5);

  return <div className="fade-up space-y-7 p-4 sm:p-8 lg:p-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><SectionEyebrow icon={ShieldCheck}>Operations control · {today.weekday}</SectionEyebrow><h2 className="font-slab text-3xl font-bold tracking-[-0.04em] text-[#2e4335] sm:text-4xl">Live yard overview</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7a6d]">Review the latest driver submissions, open defects, and fleet readiness from Supabase.</p></div><Button variant="outline" onClick={() => void loadOverview()} disabled={loading} className="h-10 rounded-lg border-[#cfc9ba] bg-[#fbf8ef] text-xs font-bold"><Cloud className="mr-2 h-3.5 w-3.5" />{loading ? "Refreshing…" : "Refresh live data"}</Button></div><section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><div className="relative min-h-[260px] overflow-hidden rounded-2xl bg-[#2f4638] text-[#f9f5ea] signal-shadow"><img src={truckDetailUrl} alt="Truck exterior inspection detail" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity" /><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(31,53,41,0.98)_0%,rgba(39,65,49,0.7)_65%,rgba(39,65,49,0.2)_100%)]" /><div className="relative flex h-full flex-col justify-between p-6 sm:p-9"><div><SectionEyebrow icon={ShieldCheck}>Live operations</SectionEyebrow><h3 className="max-w-xl font-slab text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-5xl">Every submission is visible to the control room.</h3><p className="mt-4 max-w-lg text-sm leading-6 text-[#d6e0d3]">{live ? `Last synchronized at ${lastSync}.` : "Connect to Supabase to load operational records."}</p></div><RoleVisibleAction role={role} view="inspection"><Button onClick={() => onNavigate("inspection")} className="h-11 w-fit rounded-lg bg-[#e9682a] px-4 text-sm font-bold text-white hover:bg-[#d85d23]">Start an inspection <ArrowRight className="ml-2 h-4 w-4" /></Button></RoleVisibleAction></div></div><div className="paper-panel relative overflow-hidden rounded-2xl border border-[#d8d3c5] p-6"><SectionEyebrow icon={ClipboardCheck}>Today’s pulse</SectionEyebrow><div className="mt-5 flex items-end gap-3"><div className="font-slab text-6xl font-bold leading-none tracking-[-0.06em] text-[#2f4638]">{clearedPercent}<span className="text-3xl text-[#829082]">%</span></div><div className="pb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#718070]">fleet cleared</div></div><div className="mt-7 h-2 overflow-hidden rounded-full bg-[#e8e4d8]"><div className="h-full rounded-full bg-[#2f8b5e] transition-all" style={{ width: `${clearedPercent}%` }} /></div><div className="mt-3 flex justify-between text-xs font-semibold text-[#818c80]"><span>{completedToday} completed today</span><span>{truckCount} trucks</span></div><div className="mt-8 border-t border-[#dfd9ca] pt-5"><div className="flex items-center justify-between"><span className="text-sm font-bold text-[#2f4638]">{needsAttention} items need attention</span><AlertTriangle className="h-4 w-4 text-[#e9682a]" /></div><button onClick={() => onNavigate("defects")} className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#e9682a] hover:text-[#b94e1f]">Open review queue <ChevronRight className="ml-1 inline h-3.5 w-3.5" /></button></div></div></section><section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MetricCard label="Completed today" value={String(completedToday)} detail={live ? "Live from Supabase" : "Waiting for connection"} icon={CheckCircle2} /><MetricCard label="Need attention" value={String(needsAttention).padStart(2, "0")} detail="Open defects and reviews" icon={AlertTriangle} accent /><MetricCard label="Fleet records" value={String(truckCount)} detail="Master register" icon={TruckIcon} /><MetricCard label="Latest sync" value={lastSync || "--:--"} detail={live ? "Supabase connected" : "Not connected"} icon={Cloud} /></section><section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><div className="paper-panel overflow-hidden rounded-2xl border border-[#d8d3c5]"><div className="flex items-center justify-between border-b border-[#dfd9ca] px-5 py-5 sm:px-6"><div><SectionEyebrow icon={FileCheck2}>Latest records</SectionEyebrow><h3 className="font-slab text-xl font-bold text-[#2e4335]">Driver submissions</h3></div><button onClick={() => void loadOverview()} className="text-xs font-bold uppercase tracking-[0.14em] text-[#e9682a]">Refresh <Cloud className="ml-1 inline h-3.5 w-3.5" /></button></div><div className="divide-y divide-[#e4dfd2]">{loading ? <div className="p-6 text-sm text-[#7c887b]">Loading live inspections…</div> : !latest.length ? <div className="p-6 text-sm text-[#7c887b]">No inspections have been submitted yet.</div> : latest.map((inspection) => { const truck = inspection.truck?.[0]; const driver = inspection.driver?.[0]?.full_name || "Unknown driver"; const status = inspection.status === "completed" ? "Completed" : inspection.status === "in_progress" ? "In progress" : "Needs review"; return <div key={inspection.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e9eee7] text-[#47664d]"><TruckIcon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-mono text-xs font-bold text-[#304a38]">{truck ? formatFleetNumber(truck.fleet_number) : "No truck"}</span><span className="truncate text-xs font-semibold text-[#889286]">{truck?.registration || ""}</span></div><div className="mt-1 truncate text-xs text-[#798477]">{driver} · {inspection.submitted_at ? new Date(inspection.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "not submitted"}</div></div><StatusPill status={status} /></div>; })}</div></div><div className="paper-panel rounded-2xl border border-[#d8d3c5] p-5 sm:p-6"><div className="flex items-start justify-between"><div><SectionEyebrow icon={AlertTriangle}>Needs review</SectionEyebrow><h3 className="font-slab text-xl font-bold text-[#2e4335]">Open defects</h3></div><div className="grid h-8 w-8 place-items-center rounded-full bg-[#ffe5cc] text-xs font-bold text-[#a64f24]">{defectRows.length}</div></div><div className="mt-5 space-y-3">{defectRows.slice(0, 4).map((defect) => <div key={defect.id} className="flex gap-3 rounded-xl border border-[#e2dcd0] bg-[#fbf8ef] p-3"><div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#e9682a]" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-[#35503d]">{defect.inspection?.[0]?.truck?.[0]?.fleet_number ? formatFleetNumber(defect.inspection[0].truck[0].fleet_number) : "Unassigned"}</span><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a715b]">{defect.category}</span></div><div className="mt-1 text-xs leading-5 text-[#687469]">{defect.title}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#a1a79e]">{defect.status.replace("_", " ")}</div></div></div>)}</div><button onClick={() => onNavigate("defects")} className="mt-5 w-full rounded-lg border border-[#cfc8b9] py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#536656] transition hover:bg-[#f1ece0]">Review defect queue</button></div></section></div>;
}

function Inspection({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { profile } = useFleetAuth();
  const [selectedFleet, setSelectedFleet] = useState("7100796");
  const [fleetInput, setFleetInput] = useState(() => formatFleetNumber("7100796"));
  const [liveTrucks, setLiveTrucks] = useState<Truck[]>(trucks);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [photoFiles, setPhotoFiles] = useState<Record<string, File>>({});
  const [notes, setNotes] = useState("");
  const queuedDraftRef = useRef(false);
  const draftLoadedRef = useRef(false);
  const skipNextAutosaveRef = useRef(false);
  const selectedTruck = liveTrucks.find((truck) => truck.fleetNumber === selectedFleet) ?? liveTrucks[0];
  const totalChecks = checklistSections.reduce((sum, section) => sum + section.items.length, 0);

  useEffect(() => {
    let active = true;
    async function loadInspectionFleet() {
      if (!supabase) return;
      const { data, error } = await supabase.from("trucks").select("fleet_number, registration, status").order("fleet_number");
      if (!active) return;
      if (error) {
        toast.error("Live fleet lookup unavailable — showing preview data.");
        return;
      }
      const mapped = (data ?? []).map((row: { fleet_number: string; registration: string; status: string }) => ({
        fleetNumber: row.fleet_number,
        registration: row.registration,
        type: "Truck" as const,
        status: row.status === "out_of_service" ? "Out of service" : row.status === "inspection_due" ? "Inspection due" : "Ready",
        assignedDriver: undefined,
        lastInspection: "Not yet logged",
      })) as Truck[];
      if (mapped.length) setLiveTrucks(mapped);
    }
    loadInspectionFleet();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void loadInspectionDraft().then(async (draft) => {
      if (!active) return;
      if (!draft) {
        draftLoadedRef.current = true;
        return;
      }
      queuedDraftRef.current = Boolean(draft.queued);
      if (draft.selectedFleet) { setSelectedFleet(draft.selectedFleet); setFleetInput(formatFleetNumber(draft.selectedFleet)); }
      if (draft.checks) setChecks(draft.checks);
      if (draft.notes) setNotes(draft.notes);
      if (draft.photoFiles) {
        setPhotoFiles(draft.photoFiles);
        setPhotos(Object.fromEntries(Object.entries(draft.photoFiles).map(([id, file]) => [id, URL.createObjectURL(file as File)])));
      }
      draftLoadedRef.current = true;
      if (draft.queued && profile) {
        try {
          await syncQueuedInspection({ profile, checklistSections });
          queuedDraftRef.current = false;
          toast.success("Your offline inspection has been uploaded.");
        } catch {
          toast.info("Your saved inspection is ready and will retry when connected.");
        }
      }
    });
    return () => { active = false; };
  }, [profile]);

  useEffect(() => {
    if (!profile || !draftLoadedRef.current) return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    void saveInspectionDraft(buildInspectionDraft({ selectedFleet, checks, notes, photoFiles, queued: queuedDraftRef.current }));
  }, [checks, notes, photoFiles, profile, selectedFleet]);

  useEffect(() => {
    if (!profile) return;
    const handleOnline = async () => {
      try {
        const result = await syncQueuedInspection({ profile, checklistSections });
        if (result) {
          queuedDraftRef.current = false;
          toast.success("Your offline inspection has been uploaded.");
        }
      } catch {
        toast.info("The saved inspection could not upload yet; it remains on this device.");
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [profile]);

  const answeredCount = Object.values(checks).filter((value) => value !== undefined).length;
  const fleetDigits = onlyDigits(fleetInput);
  const filteredTrucks = fleetDigits && fleetDigits !== selectedFleet
    ? liveTrucks.filter((truck) => `${truck.fleetNumber} ${truck.registration}`.toLowerCase().includes(fleetDigits.toLowerCase()))
    : [];

  const setCheck = (id: string, value: boolean) => setChecks((current) => ({ ...current, [id]: value }));
  const saveAndFinishLater = async () => {
    try {
      await saveInspectionDraft(buildInspectionDraft({ selectedFleet, checks, notes, photoFiles, queued: queuedDraftRef.current }));
      toast.success("Inspection draft saved on this device.");
      onNavigate("overview");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the inspection draft.");
    }
  };
  const handlePhoto = (id: string, file?: File) => {
    if (!file) return;
    const scrollY = window.scrollY;
    setPhotoFiles((current) => ({ ...current, [id]: file }));
    setPhotos((current) => ({ ...current, [id]: URL.createObjectURL(file) }));
    // Mobile browsers reset scroll to top when returning from the native camera app,
    // and that reset can happen slightly after the file input's change event fires —
    // one or two requestAnimationFrame calls isn't always enough to win the race.
    // Re-apply the saved position on every frame for ~1s, plus a couple of delayed
    // timers to catch late layout shifts (image load, keyboard dismissal, etc.).
    const restoreDeadline = Date.now() + 1000;
    const restoreOnNextFrame = () => {
      if (window.scrollY !== scrollY) window.scrollTo({ top: scrollY });
      if (Date.now() < restoreDeadline) requestAnimationFrame(restoreOnNextFrame);
    };
    requestAnimationFrame(restoreOnNextFrame);
    [50, 150, 300, 600, 1000].forEach((delay) => {
      window.setTimeout(() => { if (window.scrollY !== scrollY) window.scrollTo({ top: scrollY }); }, delay);
    });
  };
  const submitInspection = async () => {
    if (answeredCount < totalChecks) { toast.error(`${totalChecks - answeredCount} checklist items still need a response.`); return; }
    if (Object.keys(photos).length < 2) { toast.error("Add at least two inspection photos before submitting."); return; }
    try {
      const result = await submitInspectionToSupabase({ profile, selectedFleet, checks, notes, photoFiles, checklistSections });
      queuedDraftRef.current = Boolean(result.queued);
      if (result.queued) {
        toast.success("Inspection saved offline and will upload when connected.");
        onNavigate("overview");
        return;
      }
      skipNextAutosaveRef.current = true;
      queuedDraftRef.current = false;
      await clearInspectionDraft();
      setChecks({});
      setPhotos({});
      setPhotoFiles({});
      setNotes("");
      toast.success(`Inspection for ${selectedFleet} submitted. A new checklist is ready.`);
    } catch (error) {
      try {
        await saveInspectionDraft(buildInspectionDraft({ selectedFleet, checks, notes, photoFiles, queued: false }));
      } catch {
        // Keep the original submission error visible; the autosave remains best-effort.
      }
      toast.error(`Unable to submit inspection: ${describeInspectionError(error)} Your draft remains saved on this device.`);
    }
  };

  return <div className="fade-up p-4 pb-28 sm:p-8 sm:pb-32 lg:p-10"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><SectionEyebrow icon={ClipboardCheck}>Driver workflow · {today.label}</SectionEyebrow><h2 className="font-slab text-3xl font-bold tracking-[-0.04em] text-[#2e4335] sm:text-4xl">Make the truck safe to leave.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#6d7a6d]">Select your assigned truck, record every check, and capture the evidence that protects the next journey.</p></div><div className="flex items-center gap-2 text-xs font-semibold text-[#788578]"><span className="h-2 w-2 rounded-full bg-[#6ba377]" />Autosave on</div></div>
    <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
      <div className="space-y-5"><div className="paper-panel rounded-2xl border border-[#d8d3c5] p-5 sm:p-6"><div className="flex items-start justify-between"><div><SectionEyebrow icon={TruckIcon}>Assigned truck</SectionEyebrow><div className="font-slab text-3xl font-bold tracking-[-0.04em] text-[#2e4335]">{formatFleetNumber(selectedTruck.fleetNumber)}</div><div className="mt-1 font-mono text-sm font-bold tracking-[0.08em] text-[#e9682a]">{selectedTruck.registration}</div></div><StatusPill status={selectedTruck.status} /></div><div className="mt-6 border-t border-[#dfd9ca] pt-5"><label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#788578]">Enter fleet number</label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-[#9ca69b]" /><Input value={fleetInput} onChange={(event) => { const digits = onlyDigits(event.target.value).slice(0, 7); setFleetInput(formatFleetNumber(digits)); if (liveTrucks.some((truck) => truck.fleetNumber === digits)) setSelectedFleet(digits); }} inputMode="numeric" className="h-10 rounded-lg border-[#d3cec0] bg-[#fbf8ef] pl-9 font-mono text-sm font-bold text-[#2e4335] focus-visible:ring-[#e9682a]" placeholder="e.g. 710-0796" /></div>{filteredTrucks.length > 0 && <div className="mt-2 overflow-hidden rounded-lg border border-[#ddd7c9] bg-[#fffdf6]">{filteredTrucks.map((truck) => <button key={truck.fleetNumber} onClick={() => { setSelectedFleet(truck.fleetNumber); setFleetInput(formatFleetNumber(truck.fleetNumber)); }} className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-[#f2eee4]"><span><span className="font-mono text-xs font-bold text-[#2e4335]">{formatFleetNumber(truck.fleetNumber)}</span><span className="ml-2 text-xs text-[#849083]">{truck.registration}</span></span><ChevronRight className="h-3.5 w-3.5 text-[#a0aa9f]" /></button>)}</div>}<p className="mt-2 text-[11px] leading-5 text-[#8b9588]">Registration details appear automatically from the fleet register.</p></div><div className="mt-5 flex items-center gap-3 rounded-lg bg-[#edf1e9] px-3 py-3"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#d6e4d3] text-[#3d6548]"><Users className="h-4 w-4" /></div><div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#819080]">Today’s driver</div><div className="text-sm font-bold text-[#36503d]">{profile?.full_name ?? "Signed-in driver"}</div></div><ChevronDown className="ml-auto h-4 w-4 text-[#91a08f]" /></div></div><div className="relative overflow-hidden rounded-2xl bg-[#2f4638] p-5 text-[#f7f2e6] sm:p-6"><img src={truckDetailUrl} alt="Truck front inspection" className="absolute inset-0 h-full w-full object-cover opacity-20" /><div className="relative"><div className="flex items-center justify-between"><SectionEyebrow icon={ShieldCheck}>Inspection progress</SectionEyebrow><span className="font-mono text-sm font-bold text-[#e9682a]">{String(answeredCount).padStart(2, "0")} / {String(totalChecks).padStart(2, "0")}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#526757]"><div className="h-full rounded-full bg-[#e9682a] transition-all duration-200" style={{ width: `${(answeredCount / totalChecks) * 100}%` }} /></div><p className="mt-4 text-xs leading-5 text-[#c6d3c4]">{answeredCount === totalChecks ? "All checks recorded. Add evidence and submit." : `${totalChecks - answeredCount} checks left before submission.`}</p></div></div></div>
      <div className="space-y-5"><div className="space-y-3">{checklistSections.map((section) => <div key={section.id} className="paper-panel rounded-2xl border border-[#d8d3c5] p-4 sm:p-5"><div className="mb-3 flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#2f4638] font-mono text-xs font-bold text-[#fbf7eb]">{section.number}</div><div><h3 className="font-slab text-lg font-bold text-[#2e4335]">{section.title}</h3><p className="text-[11px] font-medium text-[#879185]">{section.note}</p></div><span className="ml-auto font-mono text-xs font-bold text-[#a1aaa0]">{section.items.filter((item) => checks[item.id] !== undefined).length}/{section.items.length}</span></div><div className="divide-y divide-[#e5dfd3] border-t border-[#e5dfd3]">{section.items.map((item) => <div key={item.id} className="flex w-full items-center gap-3 py-3"><span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-[#445746]">{item.label}</span><div role="group" aria-label={`${item.label}: working condition`} className="flex shrink-0 gap-1.5"><button type="button" aria-pressed={checks[item.id] === true} onClick={() => setCheck(item.id, true)} className={cn("rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]", checks[item.id] === true ? "border-[#2f8b5e] bg-[#2f8b5e] text-white" : "border-[#b8c0b4] bg-transparent text-[#617562]")}>Yes</button><button type="button" aria-pressed={checks[item.id] === false} onClick={() => setCheck(item.id, false)} className={cn("rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]", checks[item.id] === false ? "border-[#b65323] bg-[#b65323] text-white" : "border-[#b8c0b4] bg-transparent text-[#617562]")}>No</button></div>{item.required && <span className="hidden shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[#a0aa9f] sm:inline">Required</span>}</div>)}</div></div>)}</div><div className="paper-panel rounded-2xl border border-[#d8d3c5] p-4 sm:p-5"><div className="flex items-center justify-between"><div><SectionEyebrow icon={Camera}>Field evidence</SectionEyebrow><h3 className="font-slab text-xl font-bold text-[#2e4335]">Take the required photos</h3></div><span className="font-mono text-xs font-bold text-[#718070]">{Object.keys(photos).length} / {photoSlots.length}</span></div><div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">{photoSlots.map((slot) => <label key={slot.id} className={cn("group relative flex min-h-[105px] cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-dashed border-[#c8c5b8] bg-[#f5f1e7] p-3 transition hover:border-[#e9682a] hover:bg-[#fff8ed]", photos[slot.id] && "border-solid border-[#77a07c] bg-[#e8f0e5]")}>{photos[slot.id] ? <img src={photos[slot.id]} alt={`${slot.label} preview`} className="absolute inset-0 h-full w-full object-cover opacity-75" /> : <div className="relative grid h-7 w-7 place-items-center rounded-lg bg-[#e5e9df] text-[#617562] group-hover:bg-[#ffe2c5] group-hover:text-[#b35425]"><Camera className="h-3.5 w-3.5" /></div>}<div className="relative"><div className="text-xs font-bold text-[#3c513f]">{slot.label}</div><div className="mt-0.5 text-[10px] text-[#829083]">{photos[slot.id] ? "Evidence added" : slot.helper}</div></div><input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => handlePhoto(slot.id, event.target.files?.[0])} /></label>)}</div></div><div className="paper-panel rounded-2xl border border-[#d8d3c5] p-4 sm:p-5"><label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#788578]"><PenLine className="h-3.5 w-3.5 text-[#e9682a]" />Notes & defects <span className="font-normal normal-case tracking-normal text-[#a1a99f]">(optional)</span></label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Add a note if something needs attention…" className="w-full resize-none rounded-lg border border-[#d3cec0] bg-[#fbf8ef] px-3 py-2.5 text-sm text-[#405343] outline-none placeholder:text-[#a2aa9f] focus:border-[#8a9e8c] focus:ring-2 focus:ring-[#dfe9dc]" /></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><button onClick={() => void saveAndFinishLater()} className="order-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7c897c] hover:text-[#2e4335] sm:order-1">Save and finish later</button><Button onClick={submitInspection} className="order-1 h-12 rounded-lg bg-[#2f4638] px-5 text-sm font-bold text-[#fbf7eb] shadow-[4px_4px_0_#bfcdbd] hover:bg-[#24382d] sm:order-2">Submit inspection <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>
    </div>
  </div>;
}

function FleetRegister({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [search, setSearch] = useState("");
  const [liveTrucks, setLiveTrucks] = useState<Truck[]>(trucks);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadFleet() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase.from("trucks").select("fleet_number, registration, status").order("fleet_number");
      if (!active) return;
      if (error) {
        toast.error("Live fleet register unavailable — showing preview data.");
        setIsLoading(false);
        return;
      }
      const mapped = (data ?? []).map((row: { fleet_number: string; registration: string; status: string }) => ({
        fleetNumber: row.fleet_number,
        registration: row.registration,
        type: "Truck" as const,
        status: row.status === "out_of_service" ? "Out of service" : row.status === "inspection_due" ? "Inspection due" : "Ready",
        assignedDriver: undefined,
        lastInspection: "Not yet logged",
      })) as Truck[];
      setLiveTrucks(mapped.length ? mapped : trucks);
      setIsLive(true);
      setIsLoading(false);
    }
    loadFleet();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => liveTrucks.filter((truck) => `${truck.fleetNumber} ${truck.registration} ${truck.assignedDriver ?? ""}`.toLowerCase().includes(search.toLowerCase())), [liveTrucks, search]);
  return <div className="fade-up p-4 pb-28 sm:p-8 sm:pb-32 lg:p-10"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><SectionEyebrow icon={TruckIcon}>Master data · {liveTrucks.length} records</SectionEyebrow><h2 className="font-slab text-3xl font-bold tracking-[-0.04em] text-[#2e4335] sm:text-4xl">Fleet register</h2><p className="mt-2 text-sm leading-6 text-[#6d7a6d]">One source of truth for truck identity, availability, and daily assignment.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => toast.info("Export will be available once Supabase is connected.")} className="h-10 rounded-lg border-[#cfc9ba] bg-[#fbf8ef] text-xs font-bold uppercase tracking-[0.1em] text-[#536656]"><Download className="mr-2 h-3.5 w-3.5" />Export</Button><Button onClick={() => toast.info("Add truck will be enabled after Supabase connection.")} className="h-10 rounded-lg bg-[#2f4638] text-xs font-bold text-white hover:bg-[#24382d]"><Plus className="mr-2 h-4 w-4" />Add truck</Button></div></div><div className="paper-panel overflow-hidden rounded-2xl border border-[#d8d3c5]"><div className="flex flex-col gap-3 border-b border-[#dfd9ca] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9ba59a]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search fleet, reg or driver" className="h-9 rounded-lg border-[#d5d0c2] bg-[#fbf8ef] pl-9 text-sm focus-visible:ring-[#e9682a]" /></div><div className="flex items-center gap-3 text-xs font-semibold text-[#7d897e]"><span><span className="font-mono font-bold text-[#2e4335]">{filtered.length}</span> shown</span><span className="h-4 w-px bg-[#d8d3c5]" /><span className={cn("font-bold", isLoading ? "text-[#a77927]" : isLive ? "text-[#2f8b5e]" : "text-[#a77927]")}>{isLoading ? "Syncing…" : isLive ? "Live from Supabase" : "Preview data"}</span></div></div><div className="hidden grid-cols-[1.1fr_1fr_1.4fr_0.9fr_0.8fr] gap-4 border-b border-[#e5dfd3] bg-[#f4f0e5] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#879185] sm:grid"><span>Fleet number</span><span>Registration</span><span>Assigned driver</span><span>Last inspection</span><span>Status</span></div><div className="divide-y divide-[#e5dfd3]">{filtered.map((truck) => <div key={truck.fleetNumber} className="grid gap-2 px-4 py-4 transition hover:bg-[#fcf8ee] sm:grid-cols-[1.1fr_1fr_1.4fr_0.9fr_0.8fr] sm:items-center sm:gap-4 sm:px-6"><div className="flex items-center justify-between sm:block"><div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e8eee5] text-[#47654e]"><TruckIcon className="h-3.5 w-3.5" /></div><span className="font-mono text-sm font-bold tracking-[0.04em] text-[#2f4638]">{formatFleetNumber(truck.fleetNumber)}</span></div><div className="sm:hidden"><StatusPill status={truck.status} /></div></div><div className="pl-10 font-mono text-xs font-semibold tracking-[0.08em] text-[#e9682a] sm:pl-0">{truck.registration}</div><div className="pl-10 text-xs font-semibold text-[#607061] sm:pl-0">{truck.assignedDriver ?? <span className="text-[#a0a89f]">Unassigned</span>}</div><div className="pl-10 text-xs text-[#818b80] sm:pl-0">{truck.lastInspection}</div><div className="hidden sm:block"><StatusPill status={truck.status} /></div></div>)}</div></div><div className="mt-5 flex items-center gap-2 text-xs text-[#879185]"><ShieldCheck className="h-4 w-4 text-[#6a8d70]" />Fleet identity is linked to the daily inspection record.</div></div>;
}

type LiveDefect = {
  id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved" | "waived";
  created_at: string;
  reported_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  inspection?: { inspection_date: string; truck?: { fleet_number: string; registration: string }[] | null; driver?: { full_name: string }[] | null }[] | null;
};

function Defects({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { role, profile } = useFleetAuth();
  const [issues, setIssues] = useState<LiveDefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadDefects = async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("defects")
      .select("id, category, severity, title, description, status, created_at, reported_by, resolved_by, resolved_at, inspection:daily_inspections(inspection_date, truck:trucks(fleet_number, registration), driver:drivers(full_name))")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(`Unable to load live defects: ${error.message}`);
      setLive(false);
    } else {
      setIssues((data ?? []) as unknown as LiveDefect[]);
      setLive(true);
    }
    setLoading(false);
  };

  useEffect(() => { void loadDefects(); }, []);

  const updateDefect = async (issue: LiveDefect, status: LiveDefect["status"]) => {
    if (!supabase || !profile) return;
    setUpdatingId(issue.id);
    const payload = status === "resolved"
      ? { status, resolved_by: profile.id, resolved_at: new Date().toISOString() }
      : { status, resolved_by: null, resolved_at: null };
    const { error } = await supabase.from("defects").update(payload).eq("id", issue.id);
    if (error) {
      toast.error(`Unable to update defect: ${error.message}`);
      setUpdatingId(null);
      return;
    }
    await supabase.from("audit_events").insert({ actor_id: profile.id, entity_type: "defect", entity_id: issue.id, action: `status_${status}`, metadata: { title: issue.title } });
    toast.success(status === "resolved" ? "Defect marked resolved." : status === "waived" ? "Defect waived." : "Defect moved to in progress.");
    setUpdatingId(null);
    await loadDefects();
  };

  const openCount = issues.filter((issue) => issue.status === "open").length;
  const evidenceCount = issues.filter((issue) => issue.category.toLowerCase() === "admin" && issue.status !== "resolved").length;
  const resolvedCount = issues.filter((issue) => issue.status === "resolved").length;
    return <div className="fade-up p-4 pb-28 sm:p-8 sm:pb-32 lg:p-10"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><SectionEyebrow icon={Wrench}>Follow-up · {openCount} open</SectionEyebrow><h2 className="font-slab text-3xl font-bold tracking-[-0.04em] text-[#2e4335] sm:text-4xl">Defect queue</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7a6d]">Review live inspection exceptions, assign a response, and close the loop with an auditable status update.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void loadDefects()} className="h-10 rounded-lg border-[#cfc9ba] bg-[#fbf8ef] text-xs font-bold"><Cloud className="mr-2 h-3.5 w-3.5" />Refresh</Button><RoleVisibleAction role={role} view="inspection"><Button onClick={() => onNavigate("inspection")} className="h-10 rounded-lg bg-[#e9682a] text-xs font-bold text-white hover:bg-[#d85d23]"><ClipboardCheck className="mr-2 h-4 w-4" />New inspection</Button></RoleVisibleAction></div></div><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Open issues" value={String(openCount).padStart(2, "0")} detail={live ? "Live from Supabase" : "Connect Supabase to review"} icon={AlertTriangle} accent /><MetricCard label="Awaiting evidence" value={String(evidenceCount).padStart(2, "0")} detail="Needs follow-up" icon={ImagePlus} /><MetricCard label="Resolved in queue" value={String(resolvedCount).padStart(2, "0")} detail="Closed by management" icon={CheckCircle2} /></div><div className="mt-6 space-y-3">{loading ? <div className="paper-panel rounded-2xl border border-[#d8d3c5] p-8 text-sm text-[#7c887b]">Loading live defect queue…</div> : !issues.length ? <div className="paper-panel rounded-2xl border border-[#d8d3c5] p-8 text-sm text-[#7c887b]">No defects are visible for this account.</div> : issues.map((issue) => { const inspection = issue.inspection?.[0]; const truck = inspection?.truck?.[0]; const driver = inspection?.driver?.[0]?.full_name || "Unknown driver"; return <div key={issue.id} className="paper-panel rounded-2xl border border-[#d8d3c5] p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", issue.severity === "critical" || issue.severity === "high" ? "bg-[#ffe4d2] text-[#b65323]" : "bg-[#f8edcf] text-[#a77927]")}><AlertTriangle className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-[#2e4335]">{truck ? formatFleetNumber(truck.fleet_number) : "Unassigned truck"}</span>{truck && <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-[#e9682a]">{truck.registration}</span>}<span className="rounded-full bg-[#f8edcf] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9a772d]">{issue.category}</span><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8c9589]">{issue.severity}</span></div><h3 className="mt-1 font-slab text-lg font-bold text-[#334a39]">{issue.title}</h3><p className="mt-1 text-xs text-[#839083]">Reported by {driver} · {inspection?.inspection_date || "Date unavailable"} · {issue.id.slice(0, 8)}</p>{issue.description && <p className="mt-2 text-sm leading-5 text-[#657466]">{issue.description}</p>}</div><div className="flex flex-col gap-3 lg:min-w-[260px] lg:items-end"><StatusPill status={issue.status === "open" ? "Needs review" : issue.status === "in_progress" ? "In progress" : issue.status === "resolved" ? "Completed" : "Needs review"} /><div className="flex flex-wrap gap-2"><Button disabled={updatingId === issue.id || issue.status === "in_progress"} onClick={() => void updateDefect(issue, "in_progress")} variant="outline" className="h-8 rounded-lg border-[#d2cec0] bg-[#fbf8ef] text-xs font-bold">Start work</Button><Button disabled={updatingId === issue.id || issue.status === "resolved"} onClick={() => void updateDefect(issue, "resolved")} className="h-8 rounded-lg bg-[#2f4638] text-xs font-bold text-white">Resolve</Button><Button disabled={updatingId === issue.id || issue.status === "waived"} onClick={() => void updateDefect(issue, "waived")} variant="outline" className="h-8 rounded-lg border-[#e8c4b8] bg-[#fff6f1] text-xs font-bold text-[#a44b2d]">Waive</Button></div></div></div></div>; })}</div></div>;
}

export default function Home() {
  const { role } = useFleetAuth();
  const [activeView, setActiveView] = useState<View>(() => defaultViewForRole(role));
  const handleNavigate = (view: View) => { if (!canAccessView(role, view)) { toast.error("This area is restricted to your fleet role."); return; } setActiveView(view); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className="min-h-screen bg-transparent"><div className="flex min-h-screen"><Sidebar role={role} activeView={activeView} onNavigate={handleNavigate} /><main className="min-w-0 flex-1"><TopBar activeView={activeView} onNavigate={handleNavigate} />{activeView === "overview" && canAccessView(role, "overview") && <Overview onNavigate={handleNavigate} />}{activeView === "inspection" && canAccessView(role, "inspection") && <Inspection onNavigate={handleNavigate} />}{activeView === "fleet" && canAccessView(role, "fleet") && <FleetRegister onNavigate={handleNavigate} />}{activeView === "defects" && canAccessView(role, "defects") && <Defects onNavigate={handleNavigate} />}</main></div><MobileNav role={role} activeView={activeView} onNavigate={handleNavigate} /></div>;
}
