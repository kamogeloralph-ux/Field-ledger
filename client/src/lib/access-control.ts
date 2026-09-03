import type { FleetRole } from "@/contexts/FleetAuthContext";

export type WorkspaceView = "overview" | "inspection" | "fleet" | "defects";

const allowedViews: Record<FleetRole, WorkspaceView[]> = {
  driver: ["inspection"],
  admin: ["overview", "fleet", "defects"],
};

export function canAccessView(role: FleetRole | null, view: WorkspaceView) {
  return Boolean(role && allowedViews[role].includes(view));
}

export function defaultViewForRole(role: FleetRole | null): WorkspaceView {
  if (role === "driver") return "inspection";
  return "overview";
}

export function viewsForRole(role: FleetRole | null) {
  return role ? allowedViews[role] : [];
}
