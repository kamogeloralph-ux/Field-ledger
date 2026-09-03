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
