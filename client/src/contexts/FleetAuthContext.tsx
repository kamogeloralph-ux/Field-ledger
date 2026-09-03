import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getCurrentFleetSession,
  signInWithRole,
  signOutUser,
  subscribeToFleetAuth,
} from "@/lib/auth-flow.js";

export type FleetRole = "driver" | "admin";

export type FleetProfile = {
  id: string;
  auth_user_id: string;
  employee_number: string | null;
  full_name: string;
  phone: string | null;
  role: FleetRole;
  active: boolean;
};

type FleetSession = { user: Record<string, unknown> | null; profile: FleetProfile | null };

type FleetAuthContextValue = {
  loading: boolean;
  user: Record<string, unknown> | null;
  profile: FleetProfile | null;
  role: FleetRole | null;
  error: string | null;
  signIn: (email: string, password: string, expectedRole?: FleetRole) => Promise<FleetProfile>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const FleetAuthContext = createContext<FleetAuthContextValue | null>(null);

export function FleetAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [profile, setProfile] = useState<FleetProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const session = await getCurrentFleetSession();
      setUser(session.user as Record<string, unknown> | null);
      setProfile(session.profile as FleetProfile | null);
      setError(null);
    } catch (err) {
      setUser(null);
      setProfile(null);
      setError(err instanceof Error ? err.message : "Unable to restore your session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    return subscribeToFleetAuth((session: FleetSession) => {
      setUser(session.user as Record<string, unknown> | null);
      setProfile(session.profile as FleetProfile | null);
      setError(null);
      setLoading(false);
    });
  }, []);

  const value = useMemo<FleetAuthContextValue>(() => ({
    loading,
    user,
    profile,
    role: profile?.role ?? null,
    error,
    signIn: async (email, password, expectedRole) => {
      setLoading(true);
      setError(null);
      try {
        const result = await signInWithRole({ email, password, expectedRole });
        const nextProfile = result.profile as FleetProfile;
        setUser(result.user as unknown as Record<string, unknown>);
        setProfile(nextProfile);
        return nextProfile;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to sign in.";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    signOut: async () => {
      await signOutUser();
      setUser(null);
      setProfile(null);
      setError(null);
    },
    refresh,
  }), [error, loading, profile, user]);

  return <FleetAuthContext.Provider value={value}>{children}</FleetAuthContext.Provider>;
}

export function useFleetAuth() {
  const context = useContext(FleetAuthContext);
  if (!context) throw new Error("useFleetAuth must be used inside FleetAuthProvider");
  return context;
}
