import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminGate } from "./Admin";

let activeRole: "driver" | "supervisor" | "admin" = "supervisor";

vi.mock("@/contexts/FleetAuthContext", () => ({
  useFleetAuth: () => ({
    loading: false,
    profile: { full_name: "Test user", role: activeRole },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase", () => ({ supabase: null }));

describe("AdminGate", () => {
  it("blocks drivers and supervisors from admin controls", () => {
    activeRole = "driver";
    expect(renderToStaticMarkup(React.createElement(AdminGate, { children: React.createElement("div", null, "Admin controls") }))).toContain("Admin access required");

    activeRole = "supervisor";
    expect(renderToStaticMarkup(React.createElement(AdminGate, { children: React.createElement("div", null, "Admin controls") }))).toContain("Admin access required");
  });

  it("allows an admin through to the actual management controls", () => {
    activeRole = "admin";
    const markup = renderToStaticMarkup(React.createElement(AdminGate, { children: React.createElement("div", null, "Admin controls") }));
    expect(markup).toContain("Admin controls");
    expect(markup).not.toContain("Admin access required");
  });
});
