import React, { type ReactNode } from "react";
import type { FleetRole } from "@/contexts/FleetAuthContext";
import { canAccessView, type WorkspaceView } from "@/lib/access-control";

export function RoleVisibleAction({
  role,
  view,
  children,
}: {
  role: FleetRole | null;
  view: WorkspaceView;
  children: ReactNode;
}) {
  if (!canAccessView(role, view)) return null;
  return <>{children}</>;
}
