import React, { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Building2, Camera, ChevronDown, Download, History, RefreshCw, Save, Share2, ShieldCheck, Trash2, Truck as TruckIcon, UserPlus, X } from "lucide-react";
import { jsPDF } from "jspdf";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { type FleetRole, useFleetAuth } from "@/contexts/FleetAuthContext";
import Login from "@/pages/Login";
import AdminPhotoLibrary from "@/pages/AdminPhotoLibrary";

type AdminTruck = { id: string; fleet_number: string; registration: string; truck_type: string | null; model: string | null; size: string | null; status: "ready" | "inspection_due" | "out_of_service"; license_disc_expiry: string | null; roadworthy_expiry: string | null; insurance_expiry: string | null; next_service_km: number | null };

// Fleet numbers are always displayed/stored as NNN-NNNN (e.g. 744-0771).
function formatFleetNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
}
type AdminAccount = { id: string; auth_user_id: string | null; employee_number: string | null; full_name: string; phone: string | null; role: FleetRole; company_id: string | null; active: boolean };
type AdminCompany = { id: string; name: string; active: boolean; photo_retention_days: number | null };
type ReportRow = { id: string; inspection_date: string; started_at: string | null; submitted_at: string | null; status: string; notes: string | null; driver_name: string | null; opening_kilometers: number | null; shift: "morning" | "day" | "night" | null; truck: { fleet_number: string; registration: string; model: string | null } | null; answers: { result: string; checklist_item: { prompt: string; section_title: string | null; sort_order: number | null } | null }[]; photos: { id: string; photo_type: string; storage_path: string; captured_at: string; url?: string }[] };
type SelectedPhoto = { url?: string; photo_type: string; truck: string; driver: string; captured_at: string };
type AdminDefect = { id: string; category: string; severity: "low" | "medium" | "high" | "critical"; title: string; description: string | null; status: "open" | "in_progress" | "resolved" | "waived"; created_at: string; resolved_at: string | null; inspection: { inspection_date: string; driver_name: string | null; truck: { fleet_number: string; registration: string } | null } | null };
type AuditEvent = { id: string; entity_type: string; entity_id: string; action: string; metadata: Record<string, unknown>; created_at: string };

// Canonical evidence set: every completed inspection should carry exactly these seven images.
const PHOTO_ORDER = ["selfie", "front", "rear", "left", "right", "cab", "dashboard"] as const;
const PHOTO_LABELS: Record<string, string> = { selfie: "Driver selfie", front: "Front", rear: "Rear", left: "Left side", right: "Right side", cab: "Cab interior", dashboard: "Dashboard" };
function sortedPhotos(photos: ReportRow["photos"]) { return [...photos].sort((a, b) => PHOTO_ORDER.indexOf(a.photo_type as typeof PHOTO_ORDER[number]) - PHOTO_ORDER.indexOf(b.photo_type as typeof PHOTO_ORDER[number])); }
function shiftLabel(shift: ReportRow["shift"]) { if (shift === "morning") return "Morning shift"; if (shift === "day") return "Day shift"; if (shift === "night") return "Night shift"; return "No shift recorded"; }
function sortedAnswers(answers: ReportRow["answers"]) { return [...answers].sort((a, b) => (a.checklist_item?.sort_order ?? 0) - (b.checklist_item?.sort_order ?? 0)); }
function expiryStatus(dateStr: string | null): "expired" | "soon" | "ok" | null {
  if (!dateStr) return null;
  const days = (new Date(dateStr).getTime() - Date.now()) / 86400000;
  if (days < 0) return "expired";
  if (days <= 30) return "soon";
  return "ok";
}
function ExpiryBadge({ label, date }: { label: string; date: string | null }) {
  const status = expiryStatus(date);
  if (!status) return null;
  const colors = status === "expired" ? "bg-[#fce8e3] text-[#b0402a]" : status === "soon" ? "bg-[#fff0dc] text-[#a54d1f]" : "bg-[#e6f3ea] text-[#2f8b5e]";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", colors)}>{label} {new Date(date as string).toLocaleDateString()}</span>;
}
// Loads the same logo file used elsewhere in the app (client/public/rovana-logo.png) so the
// PDF report can embed it. Resolves to null (rather than throwing) if the image can't be
// loaded, so a missing/broken logo file never blocks report generation — the PDF just
// falls back to the text-only header.
function loadLogoImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `${import.meta.env.BASE_URL}rovana-logo.png`;
  });
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { loading, profile, signOut } = useFleetAuth();
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#ede9dd] text-[#2e4335]">Loading secure admin area…</div>;
  if (!profile) return <Login onSuccess={() => window.location.reload()} />;
  if (profile.role !== "admin" && profile.role !== "super_admin") return <main className="grid min-h-screen place-items-center bg-[#ede9dd] p-6"><div className="max-w-md rounded-2xl border border-[#e1c4b7] bg-[#fff5f0] p-8 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-[#b65323]" /><h1 className="mt-4 font-slab text-3xl font-bold text-[#2e4335]">Management access required</h1><p className="mt-3 text-sm leading-6 text-[#6d7a6d]">This page is restricted to the admin role.</p><Button type="button" variant="outline" onClick={() => { void signOut().finally(() => window.location.replace(import.meta.env.BASE_URL)); }} className="mt-6 h-10 rounded-lg bg-[#fbf8ef] text-xs font-bold"><ArrowLeft className="mr-2 h-3.5 w-3.5" />Back to sign in</Button></div></main>;
  return <>{children}</>;
}
export default function Admin() { return <AdminGate><AdminWorkspace /></AdminGate>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#667466]">{label}<div className="mt-2">{children}</div></label>; }
function toastSuccess(message: string) { window.dispatchEvent(new CustomEvent("field-ledger-toast", { detail: { type: "success", message } })); }
function toastError(message: string) { window.dispatchEvent(new CustomEvent("field-ledger-toast", { detail: { type: "error", message } })); }

function AdminWorkspace() {
  const { profile, signOut } = useFleetAuth();
  const isSuperAdmin = profile?.role === "super_admin";
  const [trucks, setTrucks] = useState<AdminTruck[]>([]); const [admins, setAdmins] = useState<AdminAccount[]>([]); const [reports, setReports] = useState<ReportRow[]>([]); const [companies, setCompanies] = useState<AdminCompany[]>([]); const [loading, setLoading] = useState(true); const [generatingPdf, setGeneratingPdf] = useState(false);
  const [defects, setDefects] = useState<AdminDefect[]>([]); const [defectStatusFilter, setDefectStatusFilter] = useState<"open" | "in_progress" | "resolved" | "waived" | "all">("open"); const [openDefects, setOpenDefects] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]); const [openAudit, setOpenAudit] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => (profile?.role === "admin" ? profile.company_id ?? null : null));
  const [truckForm, setTruckForm] = useState({ fleet_number: "", registration: "", truck_type: "", model: "", size: "", status: "ready" as AdminTruck["status"], license_disc_expiry: "", roadworthy_expiry: "", insurance_expiry: "", next_service_km: "" }); const [adminForm, setAdminForm] = useState({ auth_user_id: "", employee_number: "", full_name: "", phone: "" });
  const [companyForm, setCompanyForm] = useState({ name: "" });
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null); const [fleetFilter, setFleetFilter] = useState(""); const [openFleet, setOpenFleet] = useState(false); const [openAdmins, setOpenAdmins] = useState(false); const [openMissed, setOpenMissed] = useState(false); const [openCard, setOpenCard] = useState<"admin" | "truck" | "company" | null>(null); const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10)); const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null); const [expandedReportIds, setExpandedReportIds] = useState<Set<string>>(new Set()); const toggleReportRow = (id: string) => setExpandedReportIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const loadCompanies = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("companies").select("id, name, active, photo_retention_days").order("name");
    if (error) return toastError(error.message);
    const list = (data ?? []) as AdminCompany[]; setCompanies(list);
    setSelectedCompanyId((current) => current ?? (isSuperAdmin ? list[0]?.id ?? null : profile?.company_id ?? null));
  };

  const load = async () => {
    if (!supabase || !selectedCompanyId) { setLoading(false); return; } const client = supabase; setLoading(true);
    const [{ data: truckData, error: truckError }, { data: adminData, error: adminError }, { data: reportData, error: reportError }] = await Promise.all([
      supabase.from("trucks").select("id, fleet_number, registration, truck_type, model, size, status, license_disc_expiry, roadworthy_expiry, insurance_expiry, next_service_km").eq("company_id", selectedCompanyId).order("fleet_number"),
      supabase.from("drivers").select("id, auth_user_id, employee_number, full_name, phone, role, company_id, active").eq("company_id", selectedCompanyId).order("full_name"),
      supabase.from("daily_inspections").select("id, inspection_date, started_at, submitted_at, status, notes, driver_name, opening_kilometers, shift, truck:trucks(fleet_number, registration, model), answers:inspection_answers(result, checklist_item:checklist_items(prompt, section_title, sort_order)), photos:inspection_photos(id, photo_type, storage_path, captured_at)").eq("inspection_date", reportDate).eq("company_id", selectedCompanyId).order("created_at", { ascending: false }),
    ]);
    if (truckError || adminError || reportError) toastError((truckError || adminError || reportError)?.message || "Unable to load admin data.");
    setTrucks((truckData ?? []) as AdminTruck[]); setAdmins((adminData ?? []) as AdminAccount[]);
    const rows = (reportData ?? []) as unknown as ReportRow[];
    // Sign each inspection's own photos in place so every fleet's evidence set (selfie + six angles) stays grouped together.
    const withSignedPhotos = await Promise.all(rows.map(async (row) => {
      const photos = await Promise.all((row.photos ?? []).map(async (photo) => { const result = await client.storage.from("inspection-photos").createSignedUrl(photo.storage_path, 3600); return { ...photo, url: result.data?.signedUrl }; }));
      return { ...row, photos };
    }));
    setReports(withSignedPhotos); setExpandedReportIds(new Set()); setLoading(false);
  };
  const logAudit = async (entityType: string, entityId: string, action: string, metadata: Record<string, unknown> = {}) => {
    if (!supabase || !profile?.id) return;
    await supabase.from("audit_events").insert({ actor_id: profile.id, entity_type: entityType, entity_id: entityId, action, metadata, company_id: selectedCompanyId });
  };
  const loadDefects = async () => {
    if (!supabase || !selectedCompanyId) return;
    const { data, error } = await supabase.from("defects").select("id, category, severity, title, description, status, created_at, resolved_at, inspection:daily_inspections!inner(inspection_date, driver_name, company_id, truck:trucks(fleet_number, registration))").eq("inspection.company_id", selectedCompanyId).order("created_at", { ascending: false });
    if (error) return toastError(error.message);
    setDefects((data ?? []) as unknown as AdminDefect[]);
  };
  const updateDefectStatus = async (defect: AdminDefect, status: AdminDefect["status"]) => {
    if (!supabase) return;
    const payload: Record<string, unknown> = { status };
    payload.resolved_by = status === "resolved" ? profile?.id ?? null : null;
    payload.resolved_at = status === "resolved" ? new Date().toISOString() : null;
    const { error } = await supabase.from("defects").update(payload).eq("id", defect.id);
    if (error) return toastError(error.message);
    await logAudit("defect", defect.id, `status → ${status}`, { title: defect.title });
    toastSuccess("Defect updated.");
    await loadDefects();
  };
  const loadAuditEvents = async () => {
    if (!supabase || !selectedCompanyId) return;
    const { data, error } = await supabase.from("audit_events").select("id, entity_type, entity_id, action, metadata, created_at").eq("company_id", selectedCompanyId).order("created_at", { ascending: false }).limit(100);
    if (error) return toastError(error.message);
    setAuditEvents((data ?? []) as AuditEvent[]);
  };
  useEffect(() => { void loadCompanies(); }, []);
  useEffect(() => { void load(); void loadDefects(); void loadAuditEvents(); }, [reportDate, selectedCompanyId]);

  const createCompany = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase) return;
    const name = companyForm.name.trim(); if (!name) return toastError("Company name is required.");
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: company, error } = await supabase.from("companies").insert({ name, slug }).select("id").single();
    if (error || !company) return toastError(error?.message || "Unable to create company.");
    const code = `${name.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { error: codeError } = await supabase.from("company_access_codes").insert({ company_id: company.id, code });
    if (codeError) return toastError(codeError.message);
    const { error: templateError } = await supabase.from("checklist_templates").insert({ company_id: company.id, title: `${name} checklist v1`, version: 1, active: true });
    if (templateError) return toastError(templateError.message);
    toastSuccess(`${name} created. Driver access code: ${code}`);
    setCompanyForm({ name: "" }); setOpenCard(null); setSelectedCompanyId(company.id); await loadCompanies();
  };

  const saveTruck = async (event: React.FormEvent) => { event.preventDefault(); if (!supabase || !selectedCompanyId) return; const payload = { fleet_number: formatFleetNumber(truckForm.fleet_number), registration: truckForm.registration.trim().toUpperCase(), truck_type: truckForm.truck_type.trim() || null, model: truckForm.model.trim() || null, size: truckForm.size.trim() || null, status: truckForm.status, company_id: selectedCompanyId, license_disc_expiry: truckForm.license_disc_expiry || null, roadworthy_expiry: truckForm.roadworthy_expiry || null, insurance_expiry: truckForm.insurance_expiry || null, next_service_km: truckForm.next_service_km === "" ? null : Number(truckForm.next_service_km) }; if (!payload.fleet_number || !payload.registration) return toastError("Fleet number and registration are required."); const result = editingTruckId ? await supabase.from("trucks").update(payload).eq("id", editingTruckId) : await supabase.from("trucks").insert(payload); if (result.error) return toastError(result.error.message); await logAudit("truck", editingTruckId ?? payload.fleet_number, editingTruckId ? "updated" : "created", { fleet_number: payload.fleet_number }); toastSuccess(editingTruckId ? "Truck updated." : "Truck added."); setTruckForm({ fleet_number: "", registration: "", truck_type: "", model: "", size: "", status: "ready", license_disc_expiry: "", roadworthy_expiry: "", insurance_expiry: "", next_service_km: "" }); setEditingTruckId(null); setOpenCard(null); await load(); };
  const saveAdmin = async (event: React.FormEvent) => { event.preventDefault(); if (!supabase || !selectedCompanyId) return; const payload = { auth_user_id: adminForm.auth_user_id.trim() || null, employee_number: adminForm.employee_number.trim() || null, full_name: adminForm.full_name.trim(), phone: adminForm.phone.trim() || null, role: "admin" as FleetRole, company_id: selectedCompanyId, active: true }; if (!payload.full_name) return toastError("Name is required."); const { error } = await supabase.from("drivers").insert(payload); if (error) return toastError(error.message); toastSuccess("Company admin added."); setAdminForm({ auth_user_id: "", employee_number: "", full_name: "", phone: "" }); setOpenCard(null); await load(); };
  const deleteTruck = async (truck: AdminTruck) => { if (!supabase || !window.confirm(`Delete fleet ${truck.fleet_number}? This cannot be undone.`)) return; const { error } = await supabase.from("trucks").delete().eq("id", truck.id); if (error) return toastError(error.message); await logAudit("truck", truck.id, "deleted", { fleet_number: truck.fleet_number, registration: truck.registration }); toastSuccess("Truck deleted."); await load(); };
  const deleteAdmin = async (admin: AdminAccount) => { if (!supabase || !window.confirm(`Remove ${admin.full_name}'s admin access?`)) return; const { error } = await supabase.from("drivers").delete().eq("id", admin.id); if (error) return toastError(error.message); await logAudit("admin", admin.id, "removed", { full_name: admin.full_name }); toastSuccess("Admin access removed."); await load(); };
  const exportFleet = () => { const rows = [["Fleet number", "Registration", "Truck type", "Model", "Size", "Status"], ...trucks.map((t) => [t.fleet_number, t.registration, t.truck_type ?? "", t.model ?? "", t.size ?? "", t.status])]; const csv = rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = `${(companies.find((c) => c.id === selectedCompanyId)?.name || "rovaya").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-fleet-${reportDate}.csv`; link.click(); };
  const filteredReports = reports.filter((row) => !fleetFilter || row.truck?.fleet_number?.toLowerCase().includes(fleetFilter.toLowerCase()));
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null;
  const inspectedFleetNumbers = new Set(reports.map((r) => r.truck?.fleet_number).filter(Boolean));
  const missedTrucks = trucks.filter((t) => t.status !== "out_of_service" && !inspectedFleetNumbers.has(t.fleet_number));
  const failCountsByPrompt = new Map<string, number>();
  reports.forEach((row) => row.answers?.forEach((a) => { if (a.result !== "pass") { const prompt = a.checklist_item?.prompt || "Unknown item"; failCountsByPrompt.set(prompt, (failCountsByPrompt.get(prompt) ?? 0) + 1); } }));
  const topFailingItems = Array.from(failCountsByPrompt.entries()).map(([prompt, count]) => ({ prompt: prompt.length > 28 ? `${prompt.slice(0, 26)}…` : prompt, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  const fullPhotoCount = reports.filter((r) => (r.photos?.length ?? 0) >= 7).length;
  const photoComplianceRate = reports.length > 0 ? Math.round((fullPhotoCount / reports.length) * 100) : 0;
  const filteredDefects = defects.filter((d) => defectStatusFilter === "all" || d.status === defectStatusFilter);
  const openDefectCount = defects.filter((d) => d.status === "open" || d.status === "in_progress").length;
  const companyName = selectedCompany?.name || "Rovaya";
  const exportInspections = () => {
    const header = ["#", "Fleet number", "Registration", "Inspection date", "Shift", "Opening kilometers", "Driver name", "Status", "Checklist results", "Notes", "Evidence photos"];
    const rows = [header, ...filteredReports.map((row, index) => [
      String(index + 1),
      row.truck?.fleet_number || "",
      row.truck?.registration || "",
      row.inspection_date,
      shiftLabel(row.shift),
      row.opening_kilometers != null ? `Opening Kilometers: ${row.opening_kilometers}` : "Opening Kilometers: —",
      row.driver_name || "",
      row.status.replaceAll("_", " "),
      sortedAnswers(row.answers ?? []).map((a) => `${a.checklist_item?.prompt ?? "Checklist item"}: ${a.result === "pass" ? "Pass" : "Fail"}`).join("; "),
      row.notes || "",
      `${row.photos?.length || 0}/7`,
    ])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-inspections-${reportDate}${fleetFilter ? `-${fleetFilter}` : ""}.csv`; link.click(); toastSuccess("Inspection report CSV downloaded.");
  };
  const shareReport = async () => {
    if (filteredReports.length === 0) return toastError("No inspections to include in this report.");
    setGeneratingPdf(true);
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;
      const bottomLimit = pageHeight - 12;

      // Column layout. Checklist items become short "Qn" columns (dynamic — a company's
      // checklist can have any number of items); the full wording for each is printed once
      // in the key beneath the table, the same way the wash-bay report keys its short columns.
      const firstAnswers = sortedAnswers(filteredReports[0]?.answers ?? []);
      const checklistCount = firstAnswers.length;
      const checklistStopwords = new Set(["and", "the", "of", "in", "on", "for", "with", "after", "before", "a", "an"]);
      const abbreviateChecklistLabel = (prompt: string, index: number) => {
        const firstClause = (prompt || "").split(/[,.:;]/)[0]?.trim() || "";
        const words = firstClause.split(/\s+/).filter(Boolean).filter((w) => !checklistStopwords.has(w.toLowerCase()));
        if (words.length === 0) return `ITEM${index + 1}`;
        if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
        return `${words[0].slice(0, 4)}${words[1].slice(0, 2)}`.toUpperCase();
      };
      const checklistCols = firstAnswers.map((answer, i) => abbreviateChecklistLabel(answer.checklist_item?.prompt || "", i));
      const fixedCols = [
        { key: "#", w: 8 },
        { key: "Fleet No.", w: 20 },
        { key: "Registration", w: 22 },
        { key: "Driver", w: 30 },
        { key: "Shift", w: 14 },
        { key: "Open KM", w: 16 },
      ];
      const tailCols = [
        { key: "Photos", w: 14 },
        { key: "Notes", w: 0 }, // filled below with remaining space
      ];
      const usableWidth = pageWidth - marginX * 2;
      const checklistColWidth = checklistCount > 0 ? 12 : 0;
      const fixedWidth = fixedCols.reduce((sum, c) => sum + c.w, 0);
      const checklistWidth = checklistColWidth * checklistCount;
      const photosWidth = tailCols[0].w;
      tailCols[1].w = Math.max(30, usableWidth - fixedWidth - checklistWidth - photosWidth);
      const columns = [...fixedCols, ...checklistCols.map((label) => ({ key: label, w: checklistColWidth })), ...tailCols];

      const rowHeight = 7;
      const headerHeight = 8;
      let y = 0;

      const shiftShort = (shift: ReportRow["shift"]) => (shift === "morning" ? "AM" : shift === "day" ? "Day" : shift === "night" ? "Night" : "—");

      const drawTableHeader = () => {
        pdf.setFillColor(47, 70, 56);
        pdf.rect(marginX, y, usableWidth, headerHeight, "F");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255);
        let x = marginX;
        columns.forEach((col) => { const clippedHeader = pdf.splitTextToSize(col.key, col.w - 2)[0] ?? col.key; pdf.text(clippedHeader, x + 1.5, y + headerHeight - 2.5); x += col.w; });
        pdf.setTextColor(20, 30, 25);
        y += headerHeight;
      };

      const ensureSpace = (needed: number) => {
        if (y + needed > bottomLimit) { pdf.addPage(); y = 20; drawTableHeader(); }
      };

      // Cover header, same shape as the wash-bay report's summary block.
      const logoImg = await loadLogoImage();
      let titleX = marginX;
      if (logoImg) {
        const logoH = 14;
        const logoW = logoImg.naturalWidth && logoImg.naturalHeight ? logoH * (logoImg.naturalWidth / logoImg.naturalHeight) : logoH;
        pdf.addImage(logoImg, "PNG", marginX, 3, logoW, logoH);
        titleX = marginX + logoW + 4;
      }
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.text(`${companyName} — Fleet Inspection Report`, titleX, 16);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(90, 100, 90);
      pdf.text(`Report date: ${reportDate}    Fleets inspected: ${filteredReports.length}    Generated: ${new Date().toLocaleString()}`, titleX, 22);
      pdf.setTextColor(20, 30, 25);
      y = 28;
      drawTableHeader();

      filteredReports.forEach((row, index) => {
        ensureSpace(rowHeight);
        const answers = sortedAnswers(row.answers ?? []);
        const photos = sortedPhotos(row.photos ?? []);
        if (index % 2 === 1) { pdf.setFillColor(245, 242, 234); pdf.rect(marginX, y, usableWidth, rowHeight, "F"); }

        let x = marginX;
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(20, 30, 25);
        const cell = (text: string, width: number, opts?: { bold?: boolean }) => {
          pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
          const clipped = pdf.splitTextToSize(text, width - 2)[0] ?? "";
          pdf.text(clipped, x + 1.5, y + rowHeight - 2.5);
          x += width;
        };

        cell(String(index + 1), fixedCols[0].w);
        cell(formatFleetNumber(row.truck?.fleet_number || ""), fixedCols[1].w, { bold: true });
        cell(row.truck?.registration || "—", fixedCols[2].w);
        cell(row.driver_name || "Unknown", fixedCols[3].w);
        cell(shiftShort(row.shift), fixedCols[4].w);
        cell(row.opening_kilometers != null ? String(row.opening_kilometers) : "—", fixedCols[5].w);

        answers.forEach((answer) => {
          const pass = answer.result === "pass";
          const cx = x + checklistColWidth / 2;
          const cy = y + rowHeight / 2;
          const r = 2.2;
          pdf.setFillColor(pass ? 40 : 191, pass ? 120 : 74, pass ? 70 : 46);
          pdf.circle(cx, cy, r, "F");
          pdf.setDrawColor(255, 255, 255);
          pdf.setLineWidth(0.5);
          if (pass) {
            pdf.line(cx - r * 0.55, cy + r * 0.05, cx - r * 0.1, cy + r * 0.5);
            pdf.line(cx - r * 0.1, cy + r * 0.5, cx + r * 0.6, cy - r * 0.45);
          } else {
            pdf.line(cx - r * 0.5, cy - r * 0.5, cx + r * 0.5, cy + r * 0.5);
            pdf.line(cx - r * 0.5, cy + r * 0.5, cx + r * 0.5, cy - r * 0.5);
          }
          pdf.setLineWidth(0.2);
          pdf.setDrawColor(225, 220, 205);
          x += checklistColWidth;
        });
        // Pad any missing checklist answers so columns stay aligned across rows.
        for (let i = answers.length; i < checklistCount; i += 1) x += checklistColWidth;

        cell(`${photos.length}/7`, tailCols[0].w);
        cell(row.notes ? row.notes : "—", tailCols[1].w);

        pdf.setDrawColor(225, 220, 205);
        pdf.line(marginX, y + rowHeight, marginX + usableWidth, y + rowHeight);
        y += rowHeight;
      });

      // Key: what each Qn column and Y/N mean, plus the full prompt text — same role as the
      // wash-bay report's "PRE-WASH KEY" legend beneath its table.
      ensureSpace(10 + checklistCount * 4.5);
      y += 4;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.text("Checklist key (green = Pass, red = Fail)", marginX, y); y += 5.5;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(90, 100, 90);
      firstAnswers.forEach((answer, i) => {
        ensureSpace(4.5);
        pdf.text(`${checklistCols[i]}   ${answer.checklist_item?.prompt || "Checklist item"}`, marginX, y);
        y += 4.5;
      });
      pdf.setTextColor(20, 30, 25);

      const blob = pdf.output("blob");
      const file = new File([blob], `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-fleet-inspection-report-${reportDate}.pdf`, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: `${companyName} Fleet Inspection Report`, text: `${companyName} fleet inspection report for ${reportDate}`, files: [file] });
      else { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = file.name; link.click(); toastSuccess("Report PDF downloaded."); }
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Unable to generate the report PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };
  const startEdit = (truck: AdminTruck) => { setEditingTruckId(truck.id); setTruckForm({ fleet_number: truck.fleet_number, registration: truck.registration, truck_type: truck.truck_type ?? "", model: truck.model ?? "", size: truck.size ?? "", status: truck.status, license_disc_expiry: truck.license_disc_expiry ?? "", roadworthy_expiry: truck.roadworthy_expiry ?? "", insurance_expiry: truck.insurance_expiry ?? "", next_service_km: truck.next_service_km == null ? "" : String(truck.next_service_km) }); setOpenCard("truck"); };

  return <main className="min-h-screen bg-[#ede9dd] text-[#2e4335]"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d8d3c5] bg-[#f7f3e9] px-4 py-4 sm:px-8"><div className="flex items-center gap-3"><img src={`${import.meta.env.BASE_URL}rovana-logo.png`} alt="Rovaya" className="h-10 w-10 rounded-xl object-cover" /><div><p className="font-slab text-xl font-bold">Admin control</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7b8775]">Rovaya · {profile?.full_name}</p></div></div><div className="flex items-center gap-1.5 sm:gap-2"><Button variant="outline" onClick={exportFleet} className="h-8 rounded-lg bg-[#fbf8ef] px-2.5 text-[10px] font-bold sm:h-9 sm:px-3 sm:text-xs"><Download className="mr-1 h-3 w-3 sm:mr-2 sm:h-3.5 sm:w-3.5" />Export</Button><Button variant="outline" onClick={() => void load()} className="h-8 rounded-lg bg-[#fbf8ef] px-2.5 text-[10px] font-bold sm:h-9 sm:px-3 sm:text-xs"><RefreshCw className="mr-1 h-3 w-3 sm:mr-2 sm:h-3.5 sm:w-3.5" />Refresh</Button><Button variant="outline" onClick={() => void signOut()} className="h-8 rounded-lg bg-[#fbf8ef] px-2.5 text-[10px] font-bold sm:h-9 sm:px-3 sm:text-xs"><X className="mr-1 h-3 w-3 sm:mr-2 sm:h-3.5 sm:w-3.5" />Sign out</Button></div></header><div className="mx-auto max-w-7xl space-y-6 p-4 pb-16 sm:p-8"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7c887b]"><button type="button" onClick={() => { void signOut().finally(() => window.location.replace(import.meta.env.BASE_URL)); }} className="inline-flex items-center gap-2 hover:text-[#e9682a]"><ArrowLeft className="h-3.5 w-3.5" />Return to workspace</button><span>/</span><span className="text-[#e9682a]">Admin only</span></div>
{isSuperAdmin && <section className="paper-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d8d3c5] p-4"><div className="flex items-center gap-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Viewing company</p><select value={selectedCompanyId ?? ""} onChange={(e) => setSelectedCompanyId(e.target.value)} className="h-10 rounded-xl border border-[#d4cfc1] bg-[#fffdf6] px-3 text-sm font-bold">{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><ActionCard icon={Building2} title="Add company" detail={`${companies.length} companies managed`} open={openCard === "company"} onClick={() => setOpenCard(openCard === "company" ? null : "company")} /></section>}
{openCard === "company" && <form onSubmit={createCompany} className="paper-panel rounded-2xl border border-[#d8d3c5] p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Platform control</p><h2 className="font-slab text-2xl font-bold">Onboard a new company</h2><p className="mt-1 text-xs text-[#718070]">Creates the company, a driver access code, and an empty checklist ready for items.</p></div><Button type="button" variant="ghost" onClick={() => setOpenCard(null)}><X className="h-4 w-4" /></Button></div><Field label="Company name"><Input required value={companyForm.name} onChange={(e) => setCompanyForm({ name: e.target.value })} placeholder="e.g. Clover" /></Field><Button type="submit" className="mt-5 h-11 w-full rounded-xl bg-[#e9682a] text-sm font-bold text-white"><Building2 className="mr-2 h-4 w-4" />Create company</Button></form>}
<section className="grid gap-3 md:grid-cols-2"><ActionCard icon={UserPlus} title="Add admin" detail={`${admins.length} admins for this company`} open={openCard === "admin"} onClick={() => setOpenCard(openCard === "admin" ? null : "admin")} /><ActionCard icon={TruckIcon} title={editingTruckId ? "Edit truck" : "Add truck"} detail={`${trucks.length} fleet records`} open={openCard === "truck"} onClick={() => setOpenCard(openCard === "truck" ? null : "truck")} /></section>
{openCard === "admin" && <form onSubmit={saveAdmin} className="paper-panel rounded-2xl border border-[#d8d3c5] p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Access control</p><h2 className="font-slab text-2xl font-bold">Add company admin</h2></div><Button type="button" variant="ghost" onClick={() => setOpenCard(null)}><X className="h-4 w-4" /></Button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Auth user UID"><Input value={adminForm.auth_user_id} onChange={(e) => setAdminForm({ ...adminForm, auth_user_id: e.target.value })} /></Field><Field label="Full name"><Input required value={adminForm.full_name} onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })} /></Field><Field label="Employee number"><Input value={adminForm.employee_number} onChange={(e) => setAdminForm({ ...adminForm, employee_number: e.target.value })} /></Field><Field label="Phone"><Input value={adminForm.phone} onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })} /></Field></div><Button type="submit" className="mt-5 h-11 w-full rounded-xl bg-[#e9682a] text-sm font-bold text-white"><UserPlus className="mr-2 h-4 w-4" />Add admin</Button></form>}
{openCard === "truck" && <form onSubmit={saveTruck} className={cn("paper-panel w-full rounded-2xl border border-[#d8d3c5] p-5", editingTruckId && "fixed inset-0 z-50 mx-auto flex max-w-2xl items-start justify-center overflow-y-auto rounded-none border-0 bg-[#1f3529]/45 p-4 sm:items-center sm:p-8") }><div className={cn("w-full", editingTruckId && "max-w-xl rounded-2xl border border-[#d8d3c5] bg-[#fbf8ef] p-5 shadow-2xl sm:p-6")}><div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Fleet control</p><h2 className="font-slab text-2xl font-bold">{editingTruckId ? "Edit truck" : "Add truck"}</h2></div><Button type="button" variant="ghost" onClick={() => { setOpenCard(null); setEditingTruckId(null); }}><X className="h-4 w-4" /></Button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Fleet number"><Input required value={truckForm.fleet_number} onChange={(e) => setTruckForm({ ...truckForm, fleet_number: formatFleetNumber(e.target.value) })} placeholder="e.g. 744-0771" maxLength={8} /></Field><Field label="Registration"><Input required value={truckForm.registration} onChange={(e) => setTruckForm({ ...truckForm, registration: e.target.value })} /></Field><Field label="Truck type"><Input value={truckForm.truck_type} onChange={(e) => setTruckForm({ ...truckForm, truck_type: e.target.value })} /></Field><Field label="Model"><Input value={truckForm.model} onChange={(e) => setTruckForm({ ...truckForm, model: e.target.value })} /></Field><Field label="Size"><Input value={truckForm.size} onChange={(e) => setTruckForm({ ...truckForm, size: e.target.value })} /></Field><Field label="Status"><select value={truckForm.status} onChange={(e) => setTruckForm({ ...truckForm, status: e.target.value as AdminTruck["status"] })} className="h-10 w-full rounded-xl border border-[#d4cfc1] bg-[#fffdf6] px-3 text-sm"><option value="ready">Ready</option><option value="inspection_due">Inspection due</option><option value="out_of_service">Out of service</option></select></Field><Field label="License disc expiry"><Input type="date" value={truckForm.license_disc_expiry} onChange={(e) => setTruckForm({ ...truckForm, license_disc_expiry: e.target.value })} /></Field><Field label="Roadworthy / COF expiry"><Input type="date" value={truckForm.roadworthy_expiry} onChange={(e) => setTruckForm({ ...truckForm, roadworthy_expiry: e.target.value })} /></Field><Field label="Insurance expiry"><Input type="date" value={truckForm.insurance_expiry} onChange={(e) => setTruckForm({ ...truckForm, insurance_expiry: e.target.value })} /></Field><Field label="Next service (km)"><Input inputMode="numeric" value={truckForm.next_service_km} onChange={(e) => setTruckForm({ ...truckForm, next_service_km: e.target.value.replace(/[^0-9]/g, "") })} placeholder="e.g. 195000" /></Field></div><Button type="submit" className="mt-5 h-11 w-full rounded-xl bg-[#2f4638] text-sm font-bold text-white"><Save className="mr-2 h-4 w-4" />{editingTruckId ? "Save truck" : "Add truck"}</Button></div></form>}

<section className="paper-panel overflow-hidden rounded-2xl border border-[#d8d3c5]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfd9ca] px-5 py-5"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Manager report</p><h2 className="font-slab text-2xl font-bold">{companyName} — Complete inspection report</h2><p className="mt-1 text-xs text-[#718070]">Full checklist, driver, shift, opening kilometers, notes, and all seven evidence photos per fleet.</p></div><div className="flex gap-2"><Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="h-9 w-[145px]" /><Input value={fleetFilter} onChange={(e) => setFleetFilter(e.target.value)} placeholder="Filter fleet" className="h-9 w-[120px]" /><Button variant="outline" onClick={exportInspections} className="h-9 bg-[#fbf8ef] text-xs font-bold"><Download className="mr-2 h-3.5 w-3.5" />CSV</Button><Button onClick={() => void shareReport()} disabled={generatingPdf} className="h-9 bg-[#e9682a] text-xs font-bold text-white disabled:opacity-60"><Share2 className="mr-2 h-3.5 w-3.5" />{generatingPdf ? "Building report…" : "Share PDF"}</Button></div></div><div className="divide-y divide-[#e5dfd3]">{loading ? <div className="p-6 text-sm">Loading report…</div> : filteredReports.length === 0 ? <div className="p-6 text-sm text-[#7c887b]">No inspections recorded for {reportDate}{fleetFilter ? ` matching ${fleetFilter}` : ""}.</div> : filteredReports.map((row, index) => { const driverName = row.driver_name || "Unknown driver"; const photos = sortedPhotos(row.photos ?? []); const answers = sortedAnswers(row.answers ?? []); const isOpen = expandedReportIds.has(row.id); const failCount = answers.filter((a) => a.result !== "pass").length; let lastSection = ""; return <div key={row.id}><button type="button" onClick={() => toggleReportRow(row.id)} className="flex w-full flex-wrap items-start justify-between gap-3 px-5 py-6 text-left hover:bg-[#f5f1e7]"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#2f4638] text-sm font-bold text-[#f4a36f]">{index + 1}</span><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-base font-bold">Fleet {row.truck?.fleet_number || "Unknown"}</span><span className="font-mono text-xs font-bold text-[#e9682a]">{row.truck?.registration}</span></div><div className="text-sm font-semibold text-[#2e4335]">{driverName}</div><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6a7769]"><span>{shiftLabel(row.shift)}</span><span className={cn("font-bold", photos.length === 7 ? "text-[#2f8b5e]" : "text-[#b65323]")}>{photos.length}/7 photos</span>{failCount > 0 && <span className="font-bold text-[#b0402a]">{failCount} fail{failCount === 1 ? "" : "s"}</span>}</div></div></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-[#e8eee5] px-2.5 py-1 text-[10px] font-bold uppercase">{row.status.replaceAll("_", " ")}</span><ChevronDown className={cn("h-4 w-4 text-[#6a7769] transition-transform", isOpen && "rotate-180")} /></div></button>{isOpen && <div className="px-5 pb-6"><div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-[#4c5a4c] sm:grid-cols-4"><span><span className="font-bold text-[#2e4335]">Shift:</span> {shiftLabel(row.shift)}</span><span><span className="font-bold text-[#2e4335]">Opening Kilometers:</span> {row.opening_kilometers != null ? row.opening_kilometers : "—"}</span><span><span className="font-bold text-[#2e4335]">Submitted:</span> {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "Not submitted"}</span><span className={cn("font-bold", photos.length === 7 ? "text-[#2f8b5e]" : "text-[#b65323]")}>{photos.length}/7 evidence photos</span></div>{row.notes && <p className="mt-3 rounded-lg bg-[#fff6eb] px-3 py-2 text-xs text-[#6d4a2b]"><span className="font-bold">Notes: </span>{row.notes}</p>}<div className="mt-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6a7769]">Checklist</p><div className="mt-2 divide-y divide-[#eee9dc] rounded-xl border border-[#e5dfd3]">{answers.length === 0 ? <div className="px-3 py-2 text-xs text-[#7c887b]">No checklist answers recorded.</div> : answers.map((answer, answerIndex) => { const section = answer.checklist_item?.section_title || ""; const showSection = section && section !== lastSection; lastSection = section || lastSection; const pass = answer.result === "pass"; return <React.Fragment key={answerIndex}>{showSection && <div className="bg-[#f5f1e7] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#6a7769]">{section}</div>}<div className="flex items-center justify-between gap-3 px-3 py-2"><span className="text-xs text-[#2e4335]">{answer.checklist_item?.prompt || "Checklist item"}</span><span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", pass ? "bg-[#e6f3ea] text-[#2f8b5e]" : "bg-[#fce8e3] text-[#b0402a]")}>{pass ? "Pass" : "Fail"}</span></div></React.Fragment>; })}</div></div><div className="mt-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6a7769]">Evidence photos ({photos.length}/7)</p><div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">{PHOTO_ORDER.map((type) => { const photo = photos.find((p) => p.photo_type === type); return <button key={type} type="button" disabled={!photo} onClick={() => photo && setSelectedPhoto({ url: photo.url, photo_type: type, truck: row.truck?.fleet_number || "Unknown truck", driver: driverName, captured_at: photo.captured_at })} className="group overflow-hidden rounded-xl border border-[#d8d3c5] bg-[#f5f1e7] text-left disabled:opacity-50"><div className="aspect-square bg-[#e5e1d5]">{photo?.url ? <img src={photo.url} alt={`${row.truck?.fleet_number || "truck"} ${type}`} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="grid h-full place-items-center"><Camera className="h-4 w-4 text-[#889286]" /></div>}</div><div className="px-1.5 py-1"><div className="truncate text-[9px] font-bold uppercase tracking-[0.06em] text-[#718070]">{PHOTO_LABELS[type]}</div></div></button>; })}</div></div></div>}</div>; })}</div></section>
<AdminPhotoLibrary selectedCompanyId={selectedCompanyId} company={selectedCompany} fleetOptions={trucks.map((t) => ({ fleet_number: t.fleet_number, registration: t.registration }))} onRetentionSaved={loadCompanies} onAudit={logAudit} />
<section className="paper-panel overflow-hidden rounded-2xl border border-[#d8d3c5]"><button type="button" onClick={() => setOpenFleet(current => !current)} className="flex w-full items-center justify-between border-b border-[#dfd9ca] px-5 py-5 text-left"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Master fleet</p><h2 className="font-slab text-2xl font-bold">Fleet records</h2></div><span className="rounded-full bg-[#e8eee5] px-3 py-1 text-xs font-bold">{trucks.length} trucks</span><span className="text-xs font-bold uppercase tracking-[0.12em] text-[#e9682a]">{openFleet ? "Close" : "Open"}</span></button>{openFleet && <div className="divide-y divide-[#e5dfd3]">{loading ? <div className="p-6 text-sm">Loading fleet records…</div> : trucks.map((truck) => <div key={truck.id} role="button" tabIndex={0} onClick={() => startEdit(truck)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") startEdit(truck); }} className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-4 hover:bg-[#f5f1e7]"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#e8eee5]"><TruckIcon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="font-mono text-sm font-bold">{truck.fleet_number}</div><div className="font-mono text-xs font-bold text-[#e9682a]">{truck.registration}</div></div><span className="text-xs font-semibold">{truck.status.replaceAll("_", " ")}</span><div className="flex flex-wrap gap-1.5">{[["Disc", truck.license_disc_expiry], ["COF", truck.roadworthy_expiry], ["Insurance", truck.insurance_expiry]].map(([label, date]) => <ExpiryBadge key={label} label={label as string} date={date as string | null} />)}</div><Button variant="outline" onClick={(e) => { e.stopPropagation(); startEdit(truck); }} className="h-8 text-xs font-bold">Edit</Button><Button variant="outline" onClick={(e) => { e.stopPropagation(); void deleteTruck(truck); }} className="h-8 text-xs text-[#a44b2d]"><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}</section>
<section className="paper-panel overflow-hidden rounded-2xl border border-[#d8d3c5]"><button type="button" onClick={() => setOpenMissed((c) => !c)} className="flex w-full items-center justify-between border-b border-[#dfd9ca] px-5 py-5 text-left"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Compliance</p><h2 className="font-slab text-2xl font-bold">Missed inspections — {reportDate}</h2></div><span className={cn("rounded-full px-3 py-1 text-xs font-bold", missedTrucks.length > 0 ? "bg-[#fff0dc] text-[#a54d1f]" : "bg-[#e6f3ea] text-[#2f8b5e]")}>{missedTrucks.length} truck{missedTrucks.length === 1 ? "" : "s"}</span><span className="text-xs font-bold uppercase tracking-[0.12em] text-[#e9682a]">{openMissed ? "Close" : "Open"}</span></button>{openMissed && <div className="divide-y divide-[#e5dfd3]">{missedTrucks.length === 0 ? <div className="p-6 text-sm text-[#6a7769]">Every active truck has a report for this date.</div> : missedTrucks.map((truck) => <div key={truck.id} className="flex items-center gap-3 px-5 py-4"><AlertTriangle className="h-4 w-4 text-[#a54d1f]" /><div className="min-w-0 flex-1"><div className="font-mono text-sm font-bold">{truck.fleet_number}</div><div className="font-mono text-xs font-bold text-[#e9682a]">{truck.registration}</div></div><span className="text-xs font-semibold text-[#a54d1f]">No report on {reportDate}</span></div>)}</div>}</section>
<section className="paper-panel overflow-hidden rounded-2xl border border-[#d8d3c5] p-5"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Insights</p><h2 className="font-slab text-2xl font-bold">Analytics — {reportDate}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6a7769]">Top failing checklist items</p>{topFailingItems.length === 0 ? <p className="mt-3 text-sm text-[#7c887b]">No failures recorded for this date.</p> : <div className="mt-2 h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={topFailingItems} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}><XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="prompt" width={140} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#b0402a" radius={4} /></BarChart></ResponsiveContainer></div>}</div><div className="flex flex-col justify-center rounded-xl bg-[#f5f1e7] p-5"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6a7769]">Photo compliance</p><p className="mt-1 font-slab text-4xl font-bold text-[#14532D]">{photoComplianceRate}%</p><p className="mt-1 text-xs text-[#6a7769]">{fullPhotoCount} of {reports.length} report{reports.length === 1 ? "" : "s"} have all 7 evidence photos.</p></div></div></section>
<section className="paper-panel overflow-hidden rounded-2xl border border-[#d8d3c5]"><button type="button" onClick={() => setOpenDefects((c) => !c)} className="flex w-full items-center justify-between border-b border-[#dfd9ca] px-5 py-5 text-left"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Follow-up</p><h2 className="font-slab text-2xl font-bold">Defects</h2></div><span className={cn("rounded-full px-3 py-1 text-xs font-bold", openDefectCount > 0 ? "bg-[#fce8e3] text-[#b0402a]" : "bg-[#e6f3ea] text-[#2f8b5e]")}>{openDefectCount} open</span><span className="text-xs font-bold uppercase tracking-[0.12em] text-[#e9682a]">{openDefects ? "Close" : "Open"}</span></button>{openDefects && <div><div className="flex flex-wrap gap-2 border-b border-[#e5dfd3] px-5 py-3">{(["open", "in_progress", "resolved", "waived", "all"] as const).map((status) => <button key={status} type="button" onClick={() => setDefectStatusFilter(status)} className={cn("rounded-full px-3 py-1.5 text-xs font-bold", defectStatusFilter === status ? "bg-[#14532D] text-white" : "bg-[#f5f1e7] text-[#6a7769]")}>{status.replaceAll("_", " ")}</button>)}</div><div className="divide-y divide-[#e5dfd3]">{filteredDefects.length === 0 ? <div className="p-6 text-sm text-[#6a7769]">No defects in this view.</div> : filteredDefects.map((defect) => <div key={defect.id} className="flex flex-wrap items-center gap-3 px-5 py-4"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", defect.severity === "critical" || defect.severity === "high" ? "bg-[#fce8e3] text-[#b0402a]" : "bg-[#fff0dc] text-[#a54d1f]")}>{defect.severity}</span><div className="min-w-0 flex-1"><div className="text-sm font-bold">{defect.title}</div><div className="text-xs text-[#6a7769]">{defect.inspection?.truck?.fleet_number ?? "Unknown fleet"} · {defect.inspection?.driver_name ?? "Unknown driver"} · {defect.inspection?.inspection_date}</div></div><select value={defect.status} onChange={(e) => void updateDefectStatus(defect, e.target.value as AdminDefect["status"])} className="h-9 rounded-lg border border-[#d4cfc1] bg-white px-2 text-xs font-bold"><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="waived">Waived</option></select></div>)}</div></div>}</section>
<section className="paper-panel overflow-hidden rounded-2xl border border-[#d8d3c5]"><button type="button" onClick={() => setOpenAudit((c) => !c)} className="flex w-full items-center justify-between border-b border-[#dfd9ca] px-5 py-5 text-left"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Accountability</p><h2 className="font-slab text-2xl font-bold">Audit log</h2></div><span className="rounded-full bg-[#e8eee5] px-3 py-1 text-xs font-bold">{auditEvents.length} events</span><span className="text-xs font-bold uppercase tracking-[0.12em] text-[#e9682a]">{openAudit ? "Close" : "Open"}</span></button>{openAudit && <div className="divide-y divide-[#e5dfd3]">{auditEvents.length === 0 ? <div className="p-6 text-sm text-[#6a7769]">No recorded admin actions yet.</div> : auditEvents.map((event) => <div key={event.id} className="flex items-center gap-3 px-5 py-3"><History className="h-4 w-4 text-[#6a7769]" /><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{event.entity_type} · {event.action}</div><div className="text-xs text-[#7c887b]">{new Date(event.created_at).toLocaleString()}</div></div></div>)}</div>}</section>
{selectedPhoto && <div className="fixed inset-0 z-50 grid place-items-center bg-[#1f3529]/75 p-4" onClick={() => setSelectedPhoto(null)}><div className="max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-[#fbf8ef] shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between p-3"><div className="text-xs font-bold">{selectedPhoto.truck} · {selectedPhoto.photo_type}</div><Button variant="ghost" onClick={() => setSelectedPhoto(null)}><X className="h-4 w-4" /></Button></div>{selectedPhoto.url && <img src={selectedPhoto.url} alt="Inspection evidence" className="max-h-[78vh] w-full object-contain" />}<div className="px-4 py-3 text-xs text-[#718070]">Captured by {selectedPhoto.driver} on {new Date(selectedPhoto.captured_at).toLocaleString()}</div></div></div>}
<section className="paper-panel overflow-hidden rounded-2xl border border-[#d8d3c5]"><button type="button" onClick={() => setOpenAdmins(current => !current)} className="flex w-full items-center justify-between border-b border-[#dfd9ca] px-5 py-5 text-left"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7769]">Access control</p><h2 className="font-slab text-2xl font-bold">Company admins</h2></div><span className="text-xs font-bold">{admins.length} admins</span><span className="text-xs font-bold uppercase tracking-[0.12em] text-[#e9682a]">{openAdmins ? "Close" : "Open"}</span></button>{openAdmins && <div className="divide-y divide-[#e5dfd3]">{admins.length === 0 ? <div className="px-5 py-4 text-sm text-[#7c887b]">No admins added for this company yet.</div> : admins.map((admin) => <div key={admin.id} className="flex items-center gap-3 px-5 py-4"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#e9eee7] text-xs font-bold">{admin.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{admin.full_name}</div><div className="text-xs text-[#849083]">{admin.employee_number || "No employee number"}</div></div><Button variant="outline" onClick={() => void deleteAdmin(admin)} className="h-8 text-xs text-[#a44b2d]"><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}</section></div></main>;
}
function ActionCard({ icon: Icon, title, detail, open, onClick }: { icon: React.ElementType; title: string; detail: string; open: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={cn("paper-panel flex items-center gap-4 rounded-2xl border border-[#d8d3c5] p-5 text-left transition hover:border-[#e9682a]", open && "border-[#e9682a] bg-[#fff6eb]")}><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e8eee5] text-[#45664e]"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-slab text-xl font-bold">{title}</span><span className="text-xs text-[#718070]">{detail}</span></span><span className="text-xs font-bold uppercase tracking-[0.12em] text-[#e9682a]">{open ? "Close" : "Open"}</span></button>; }
