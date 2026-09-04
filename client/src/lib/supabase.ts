/* Field Ledger direction: backend wiring stays explicit and reversible so the field workflow remains usable during setup. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://esbsguetydiqmaectoyu.supabase.co";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "sb_publishable_yQC3oOVE6IwXnexhTkQSXQ_5ZEC4BOi";

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
