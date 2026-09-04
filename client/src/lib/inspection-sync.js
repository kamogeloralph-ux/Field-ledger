import { driverSupabase, uploadInspectionPhoto } from "./supabase";

const DRAFT_STORE = "field-ledger-inspection-drafts";
const DRAFT_KEY = "current";

function browserStorage() { return typeof window !== "undefined" && window.localStorage ? window.localStorage : null; }
function indexedDb() { return typeof window !== "undefined" && "indexedDB" in window ? window.indexedDB : null; }
function openDraftDb() { const factory = indexedDb(); if (!factory) return Promise.resolve(null); return new Promise((resolve, reject) => { const request = factory.open(DRAFT_STORE, 1); request.onupgradeneeded = () => request.result.createObjectStore("drafts"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("Unable to open offline storage.")); }); }
function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, type: file.type, lastModified: file.lastModified, dataUrl: reader.result }); reader.onerror = () => reject(reader.error ?? new Error("Unable to preserve captured image.")); reader.readAsDataURL(file); }); }
function dataUrlToFile(photo) { const [header, body] = String(photo.dataUrl).split(","); const mime = photo.type || header.match(/data:(.*?);/)?.[1] || "image/jpeg"; const binary = atob(body); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i); return new File([bytes], photo.name || "inspection-photo.jpg", { type: mime, lastModified: photo.lastModified || Date.now() }); }
async function serializeForStorage(draft) { const photos = await Promise.all(Object.entries(draft.photoFiles ?? {}).map(async ([id, file]) => [id, await fileToDataUrl(file)])); const selfieFile = draft.selfieFile ? await fileToDataUrl(draft.selfieFile) : null; return JSON.stringify({ ...draft, photoFiles: Object.fromEntries(photos), selfieFile }); }
function deserializeFromStorage(raw) { if (!raw) return null; const parsed = JSON.parse(raw); return { ...parsed, selfieFile: parsed.selfieFile ? dataUrlToFile(parsed.selfieFile) : undefined, photoFiles: Object.fromEntries(Object.entries(parsed.photoFiles ?? {}).map(([id, photo]) => [id, dataUrlToFile(photo)])) }; }
async function putDraft(value) { const db = await openDraftDb().catch(() => null); if (db) { await new Promise((resolve, reject) => { const request = db.transaction("drafts", "readwrite").objectStore("drafts").put(value, DRAFT_KEY); request.onsuccess = resolve; request.onerror = () => reject(request.error ?? new Error("Unable to save offline inspection.")); }); db.close(); return true; } return false; }
export async function saveInspectionDraft(draft) { const serialized = await serializeForStorage(draft); if (await putDraft(serialized)) return; const storage = browserStorage(); if (storage) storage.setItem(`${DRAFT_STORE}:${DRAFT_KEY}`, serialized); }
export async function loadInspectionDraft() { const db = await openDraftDb().catch(() => null); if (db) { const stored = await new Promise((resolve, reject) => { const request = db.transaction("drafts", "readonly").objectStore("drafts").get(DRAFT_KEY); request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(request.error); }); db.close(); return typeof stored === "string" ? deserializeFromStorage(stored) : stored; } return deserializeFromStorage(browserStorage()?.getItem(`${DRAFT_STORE}:${DRAFT_KEY}`)); }
export async function clearInspectionDraft() { const db = await openDraftDb().catch(() => null); if (db) { await new Promise((resolve, reject) => { const request = db.transaction("drafts", "readwrite").objectStore("drafts").delete(DRAFT_KEY); request.onsuccess = resolve; request.onerror = () => reject(request.error); }); db.close(); } browserStorage()?.removeItem(`${DRAFT_STORE}:${DRAFT_KEY}`); }
export function flattenChecklistItems(sections) { return sections.flatMap((section) => section.items); }
function readableError(error) { if (error instanceof Error) return error.message; if (error && typeof error === "object") { const message = error.message || error.details || error.hint; if (message) return String(message); } return "Unable to submit this inspection."; }
function retryableError(error) { if (typeof navigator !== "undefined" && !navigator.onLine) return true; const status = Number(error?.status || error?.statusCode || 0); if ([408, 429].includes(status) || status >= 500) return true; return error instanceof TypeError || /fetch|network|failed to fetch|timeout|temporar/i.test(readableError(error)); }
export function buildInspectionDraft({ step, fullName, selectedFleet, openingKilometers, shift, checks, notes, selfieFile, photoFiles, queued = false }) { return { step, fullName, selectedFleet, openingKilometers, shift, checks, notes, selfieFile, photoFiles, queued, savedAt: new Date().toISOString() }; }

async function submitOnline({ fullName, selectedFleet, openingKilometers, shift, checks, notes, selfieFile, photoFiles, companyId, companyCode }) {
  if (!driverSupabase) throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  if (!fullName?.trim()) throw new Error("Full names and surnames are required.");
  if (!companyId || !companyCode) throw new Error("No company selected. Please enter your company access code again.");
  const { data: truck, error: truckError } = await driverSupabase.from("trucks").select("id, fleet_number").eq("fleet_number", selectedFleet).eq("company_id", companyId).maybeSingle();
  if (truckError) throw truckError;
  if (!truck) throw new Error("The selected fleet number was not found for this company.");
  const { data: template, error: templateError } = await driverSupabase.from("checklist_templates").select("id, version").eq("company_id", companyId).eq("active", true).order("version", { ascending: false }).limit(1).maybeSingle();
  if (templateError) throw templateError;
  if (!template) throw new Error("No active checklist template exists for this company.");
  const { data: dbItems, error: itemError } = await driverSupabase.from("checklist_items").select("id, sort_order").eq("template_id", template.id).order("sort_order");
  if (itemError) throw itemError;
  if (!dbItems || dbItems.length === 0) throw new Error("This company's checklist has no items configured.");
  if (dbItems.some((item) => checks[item.id] === undefined)) throw new Error("The checklist has changed since you started. Please refresh and try again.");
  const inspectionDate = new Date().toISOString().slice(0, 10);
  const inspectionId = crypto.randomUUID();
  const payload = { id: inspectionId, driver_id: null, driver_name: fullName.trim(), truck_id: truck.id, opening_kilometers: openingKilometers === "" || openingKilometers == null ? null : Number(openingKilometers), shift, checklist_template_id: template.id, inspection_date: inspectionDate, started_at: new Date().toISOString(), submitted_at: new Date().toISOString(), status: "completed", notes: notes?.trim() || null, signature_name: fullName.trim(), company_id: companyId, company_access_code: companyCode };
  const { error: inspectionError } = await driverSupabase.from("daily_inspections").insert(payload);
  if (inspectionError) throw inspectionError;
  const answers = dbItems.map((item) => ({ inspection_id: inspectionId, checklist_item_id: item.id, result: checks[item.id] ? "pass" : "fail" }));
  const { error: answerError } = await driverSupabase.from("inspection_answers").insert(answers);
  if (answerError) throw answerError;
  if (!(selfieFile instanceof File) || selfieFile.size === 0) throw new Error("The selfie image is missing. Please capture the selfie again.");
  const selfieUpload = await uploadInspectionPhoto(selfieFile, inspectionId, "selfie", driverSupabase);
  if (selfieUpload.error) throw selfieUpload.error;
  const { error: selfieError } = await driverSupabase.from("inspection_photos").insert({ inspection_id: inspectionId, photo_type: "selfie", storage_path: selfieUpload.data.storagePath, captured_at: new Date().toISOString() });
  if (selfieError) throw selfieError;
  for (const [photoType, file] of Object.entries(photoFiles ?? {})) { const upload = await uploadInspectionPhoto(file, inspectionId, photoType, driverSupabase); if (upload.error) throw upload.error; const { error } = await driverSupabase.from("inspection_photos").insert({ inspection_id: inspectionId, photo_type: photoType, storage_path: upload.data.storagePath, captured_at: new Date().toISOString() }); if (error) throw error; }
  return { queued: false, inspectionId };
}
export async function submitInspection({ allowQueue = true, ...draft }) { const queuedDraft = buildInspectionDraft({ ...draft, queued: true }); const offline = !driverSupabase || (typeof navigator !== "undefined" && !navigator.onLine); if (offline) { if (!allowQueue) throw new Error("The connection is still offline."); await saveInspectionDraft(queuedDraft); return { queued: true }; } try { return await submitOnline(draft); } catch (error) { if (allowQueue && retryableError(error)) { await saveInspectionDraft(queuedDraft); return { queued: true }; } throw new Error(readableError(error)); } }
export async function syncQueuedInspection({ checklistSections }) { if (!driverSupabase || (typeof navigator !== "undefined" && !navigator.onLine)) return null; const draft = await loadInspectionDraft(); if (!draft?.queued) return null; return submitInspection({ ...draft, checklistSections, allowQueue: false }); }
