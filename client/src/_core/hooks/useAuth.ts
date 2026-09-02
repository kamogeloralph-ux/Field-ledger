import { useCallback } from "react";
import { useFleetAuth } from "@/contexts/FleetAuthContext";

export function useAuth() {
  const { loading, user, signOut } = useFleetAuth();
  const logout = useCallback(() => void signOut(), [signOut]);
  return {
    loading,
    user: user
      ? {
          id: String(user.id ?? ""),
          name: typeof user.name === "string" ? user.name : undefined,
          email: typeof user.email === "string" ? user.email : undefined,
        }
      : null,
    logout,
  };
}
