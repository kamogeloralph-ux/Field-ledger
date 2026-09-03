import { supabase, uploadInspectionPhoto } from "./supabase";

const DRAFT_STORE = "field-ledger-inspection-drafts";
const DRAFT_KEY = "current";

function browserStorage() {
  return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
}

function indexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window ? window.indexedDB : null;
}

function openDraftDb() {
  const dbFactory = indexedDb();
  if (!dbFactory) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = dbFactory.open(DRAFT_STORE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open offline draft storage."));
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, lastModified: file.lastModified, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error ?? new Error("Unable to preserve captured photo."));
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(photo) {
  const [header, body] = String(photo.dataUrl).split(",");
  const mime = photo.type || header.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], photo.name || "inspection-photo.jpg", { type: mime, lastModified: photo.lastModified || Date.now() });
}

async function serializeForStorage(draft) {
  const photoEntries = await Promise.all(Object.entries(draft.photoFiles ?? {}).map(async ([id, file]) => [id, await fileToDataUrl(file)]));
  return JSON.stringify({ ...draft, photoFiles: Object.fromEntries(photoEntries) });
}

function deserializeFromStorage(raw) {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return { ...parsed, photoFiles: Object.fromEntries(Object.entries(parsed.photoFiles ?? {}).map(([id, photo]) => [id, dataUrlToFile(photo)])) };
}

export async function saveInspectionDraft(draft) {
  const db = await openDraftDb().catch(() => null);
  if (db) {
    await new Promise((resolve, reject) => {
      const request = db.transaction("drafts", "readwrite").objectStore("drafts").put(draft, DRAFT_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Unable to save offline draft."));
    });
    db.close();
    return;
  }
  const storage = browserStorage();
  if (storage) storage.setItem(`${DRAFT_STORE}:${DRAFT_KEY}`, await serializeForStorage(draft));
}

export async function loadInspectionDraft() {
  const db = await openDraftDb().catch(() => null);
  if (db) {
    const draft = await new Promise((resolve, reject) => {
      const request = db.transaction("drafts", "readonly").objectStore("drafts").get(DRAFT_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Unable to load offline draft."));
    });
    db.close();
    return draft;
  }
  return deserializeFromStorage(browserStorage()?.getItem(`${DRAFT_STORE}:${DRAFT_KEY}`));
}

export async function clearInspectionDraft() {
  const db = await openDraftDb().catch(() => null);
  if (db) {
    await new Promise((resolve, reject) => {
      const request = db.transaction("drafts", "readwrite").objectStore("drafts").delete(DRAFT_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Unable to clear offline draft."));
    });
    db.close();
  }
  browserStorage()?.removeItem(`${DRAFT_STORE}:${DRAFT_KEY}`);
}

export function flattenChecklistItems(checklistSections) {
  return checklistSections.flatMap((section) => section.items);
}

export function buildInspectionDraft({ selectedFleet, checks, notes, photoFiles, queued = false }) {
  return { selectedFleet, checks, notes, photoFiles, queued, savedAt: new Date().toISOString() };
}

async function submitOnline({ profile, selectedFleet, checks, notes, photoFiles, checklistSections }) {
  if (!profile?.id) throw new Error("Your fleet profile is not available.");
  const { data: truck, error: truckError } = await supabase.from("trucks").select("id, fleet_number").eq("fleet_number", selectedFleet).maybeSingle();
  if (truckError) throw truckError;
  if (!truck) throw new Error("The selected fleet number was not found in Supabase.");
  const { data: template, error: templateError } = await supabase.from("checklist_templates").select("id, version").eq("active", true).order("version", { ascending: false }).limit(1).maybeSingle();
  if (templateError) throw templateError;
  if (!template) throw new Error("No active checklist template exists. Run the checklist seed SQL first.");
  const { data: dbItems, error: itemError } = await supabase.from("checklist_items").select("id, sort_order").eq("template_id", template.id).order("sort_order");
  if (itemError) throw itemError;
  const appItems = flattenChecklistItems(checklistSections);
  if (!dbItems || dbItems.length !== appItems.length) throw new Error("The app checklist and Supabase checklist template do not match.");
  const inspectionDate = new Date().toISOString().slice(0, 10);
  const { data: assignment, error: assignmentError } = await supabase.from("truck_assignments").select("id").eq("driver_id", profile.id).eq("truck_id", truck.id).eq("assignment_date", inspectionDate).maybeSingle();
  if (assignmentError) throw assignmentError;
  const inspectionPayload = { driver_id: profile.id, truck_id: truck.id, assignment_id: assignment?.id ?? null, checklist_template_id: template.id, inspection_date: inspectionDate, started_at: new Date().toISOString(), submitted_at: new Date().toISOString(), status: "completed", notes: notes?.trim() || null, signature_name: profile.full_name };
  const { data: existingInspection, error: existingInspectionError } = await supabase.from("daily_inspections").select("id").eq("driver_id", profile.id).eq("truck_id", truck.id).eq("inspection_date", inspectionDate).maybeSingle();
  if (existingInspectionError) throw existingInspectionError;
  let inspection;
  if (existingInspection?.id) {
    const { data: updatedInspection, error: updateError } = await supabase.from("daily_inspections").update(inspectionPayload).eq("id", existingInspection.id).select("id").single();
    if (updateError) throw updateError;
    inspection = updatedInspection;
  } else {
    const { data: insertedInspection, error: inspectionError } = await supabase.from("daily_inspections").insert(inspectionPayload).select("id").single();
    if (inspectionError) throw inspectionError;
    inspection = insertedInspection;
  }
  const answers = appItems.map((item, index) => ({ inspection_id: inspection.id, checklist_item_id: dbItems[index].id, result: checks[item.id] ? "pass" : "fail" }));
  const { error: answerError } = await supabase.from("inspection_answers").upsert(answers, { onConflict: "inspection_id,checklist_item_id" });
  if (answerError) throw answerError;
  const { data: existingDefects, error: existingDefectsError } = await supabase.from("defects").select("title").eq("inspection_id", inspection.id);
  if (existingDefectsError) throw existingDefectsError;
  const existingTitles = new Set((existingDefects ?? []).map((defect) => defect.title));
  const failedItems = checklistSections.flatMap((section) => section.items.filter((item) => checks[item.id] === false).map((item) => ({
    inspection_id: inspection.id,
    category: section.title || "general",
    severity: "high",
    title: item.label,
    description: `Failed checklist item in ${section.title || "the inspection"}.`,
    reported_by: profile.id,
  }))).filter((defect) => !existingTitles.has(defect.title));
  if (failedItems.length) {
    const { error: defectError } = await supabase.from("defects").insert(failedItems);
    if (defectError) throw defectError;
  }
  for (const [photoType, file] of Object.entries(photoFiles ?? {})) {
    const upload = await uploadInspectionPhoto(file, inspection.id, photoType);
    if (upload.error) throw upload.error;
    const { error: photoError } = await supabase.from("inspection_photos").insert({ inspection_id: inspection.id, photo_type: photoType, storage_path: upload.data.storagePath, captured_at: new Date().toISOString() });
    if (photoError) throw photoError;
  }
  await clearInspectionDraft();
  return { queued: false, inspectionId: inspection.id };
}

export async function submitInspection({ profile, selectedFleet, checks, notes, photoFiles, checklistSections, allowQueue = true }) {
  const draft = buildInspectionDraft({ selectedFleet, checks, notes, photoFiles, queued: true });
  const isOffline = !supabase || (typeof navigator !== "undefined" && !navigator.onLine);
  if (isOffline) {
    if (!allowQueue) throw new Error("The connection is still offline.");
    await saveInspectionDraft(draft);
    return { queued: true };
  }
  return submitOnline({ profile, selectedFleet, checks, notes, photoFiles, checklistSections });
}

export async function syncQueuedInspection({ profile, checklistSections }) {
  if (!supabase || (typeof navigator !== "undefined" && !navigator.onLine)) return null;
  const draft = await loadInspectionDraft();
  if (!draft?.queued) return null;
  return submitInspection({ ...draft, profile, checklistSections, allowQueue: false });
}
