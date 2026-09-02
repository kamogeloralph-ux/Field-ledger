import { supabase } from "./supabase";

/**
 * Sign in a driver, supervisor, or admin with Supabase Auth and load the
 * matching public.drivers profile. The publishable browser key is sufficient;
 * privileged keys must never be imported here.
 *
 * @param {{ email: string, password: string, expectedRole?: "driver" | "supervisor" | "admin" }} input
 * @returns {Promise<{ user: object, profile: object }>}
 */
export function isAllowedRole(actualRole, expectedRole) {
  return !expectedRole || actualRole === expectedRole;
}

export async function signInWithRole({ email, password, expectedRole }) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error("Authentication did not return a user.");

  const { data: profile, error: profileError } = await supabase
    .from("drivers")
    .select("id, auth_user_id, employee_number, full_name, phone, role, active")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();
    throw profileError;
  }
  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    throw new Error("Your account is not linked to an active fleet profile.");
  }
  if (!isAllowedRole(profile.role, expectedRole)) {
    await supabase.auth.signOut();
    throw new Error(`This login is restricted to ${expectedRole} accounts.`);
  }

  return { user: authData.user, profile };
}

export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentFleetSession() {
  if (!supabase) return { user: null, profile: null };

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user ?? null;
  if (!user) return { user: null, profile: null };

  const { data: profile, error: profileError } = await supabase
    .from("drivers")
    .select("id, auth_user_id, employee_number, full_name, phone, role, active")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return { user: null, profile: null };
  }

  return { user, profile };
}

export function subscribeToFleetAuth(onChange) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(() => {
    void getCurrentFleetSession().then(onChange).catch(() => onChange({ user: null, profile: null }));
  });
  return () => data.subscription.unsubscribe();
}
