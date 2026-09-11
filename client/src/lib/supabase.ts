/* Field Ledger direction: backend wiring stays explicit and reversible so the field workflow remains usable during setup. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://esbsguetydiqmaectoyu.supabase.co";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "sb_publishable_yQC3oOVE6IwXnexhTkQSXQ_5ZEC4BOi";
const r2ApiUrl = ((import.meta.env.VITE_R2_API_URL as string | undefined) ?? "https://rovaya-api.kamogeloralph.workers.dev").replace(/\/$/, "");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

// The driver workflow is public and must always use the anon role. It must not
// restore a cached admin session from the same browser origin.
export const driverSupabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;

export type SupabaseInspectionPhoto = {
  id: string;
  inspection_id: string;
  photo_type: string;
  storage_path: string;
  captured_at: string;
};

// A driver picks their company once (via an access code) and stays scoped to it on this device.
const COMPANY_STORAGE_KEY = "field-ledger-company";
export type StoredCompany = { code: string; companyId: string; companyName: string };

export function getStoredCompany(): StoredCompany | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COMPANY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredCompany) : null;
  } catch {
    return null;
  }
}

export function setStoredCompany(company: StoredCompany | null) {
  if (typeof window === "undefined") return;
  if (company) window.localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(company));
  else window.localStorage.removeItem(COMPANY_STORAGE_KEY);
}

export async function resolveCompanyCode(code: string): Promise<{ data: StoredCompany | null; error: Error | null }> {
  if (!driverSupabase) return { data: null, error: new Error("Supabase is not configured.") };
  const trimmed = code.trim();
  if (!trimmed) return { data: null, error: new Error("Enter your company access code.") };
  const { data, error } = await driverSupabase.rpc("resolve_company_code", { p_code: trimmed });
  if (error) return { data: null, error };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { data: null, error: new Error("That access code was not recognized.") };
  return { data: { code: trimmed, companyId: row.company_id as string, companyName: row.company_name as string }, error: null };
}

export async function uploadInspectionPhoto(file: File, inspectionId: string, photoType: string, client: SupabaseClient | null = supabase) {
  if (!client) {
    return { data: null, error: new Error("Supabase is not configured yet.") };
  }

  const extension = file.name.split(".").pop() || "jpg";
  const storagePath = `${inspectionId}/${photoType}-${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from("inspection-photos").upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  return { data: { storagePath }, error };
}

// Cloudflare R2 upload path. The object key is decided server-side by the
// get-r2-upload-url Edge Function (not here) — see that function for why:
// letting the client pick the key would let anyone with the public anon key
// request a presigned URL for an arbitrary path in the bucket.
export async function uploadInspectionPhotoToR2(file: File, inspectionId: string, photoType: string, client: SupabaseClient | null = supabase) {
  if (!client) {
    return { data: null, error: new Error("Supabase is not configured yet.") };
  }

  const contentType = file.type || "image/jpeg";
  const { data: presign, error: presignError } = await client.functions.invoke("get-r2-upload-url", {
    body: { inspectionId, photoType, contentType },
  });
  if (presignError || !presign?.uploadUrl) {
    // supabase-js's default error message ("Edge Function returned a non-2xx status code")
    // hides the actual reason. FunctionsHttpError carries the real response on .context —
    // unwrap it so failures are diagnosable from the toast instead of only from the
    // Supabase dashboard's function logs.
    let detail = "Could not get an upload URL for this photo.";
    const context = (presignError as { context?: Response })?.context;
    if (context && typeof context.json === "function") {
      try {
        const body = await context.json();
        if (body?.error) detail = body.error;
      } catch { /* response body wasn't JSON — keep the generic message */ }
    }
    return { data: null, error: new Error(detail) };
  }

  const uploadRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!uploadRes.ok) {
    return { data: null, error: new Error(`Photo upload to storage failed (${uploadRes.status}).`) };
  }

  return { data: { storagePath: presign.objectKey as string }, error: null };
}

export async function deleteR2InspectionPhoto(photoId: string, storagePath: string, client: SupabaseClient | null = supabase) {
  if (!client) return { error: new Error("Supabase is not configured yet.") };
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) return { error: sessionError };
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { error: new Error("Your admin session has expired. Please sign in again.") };
  try {
    const response = await fetch(`${r2ApiUrl}/api/r2/photo/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ photoId, storagePath }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { error: new Error(body.error || `R2 deletion failed (${response.status}).`) };
    return { error: null };
  } catch {
    return { error: new Error("Could not reach the Cloudflare storage service.") };
  }
}
