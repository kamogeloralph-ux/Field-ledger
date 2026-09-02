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

export type SupabaseInspectionPhoto = {
  id: string;
  inspection_id: string;
  photo_type: string;
  storage_path: string;
  captured_at: string;
};

export async function uploadInspectionPhoto(file: File, inspectionId: string, photoType: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured yet.") };
  }

  const extension = file.name.split(".").pop() || "jpg";
  const storagePath = `${inspectionId}/${photoType}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("inspection-photos").upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  return { data: { storagePath }, error };
}
