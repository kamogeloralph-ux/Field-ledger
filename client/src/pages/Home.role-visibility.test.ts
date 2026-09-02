import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Home from "./Home";

const profiles = {
  driver: { id: "d1", auth_user_id: "u1", employee_number: "D-001", full_name: "Driver One", phone: null, role: "driver" as const, active: true },
  supervisor: { id: "s1", auth_user_id: "u2", employee_number: "S-001", full_name: "Supervisor One", phone: null, role: "supervisor" as const, active: true },
  admin: { id: "a1", auth_user_id: "u3", employee_number: "A-001", full_name: "Admin One", phone: null, role: "admin" as const, active: true },
};

let activeProfile = profiles.driver;

vi.mock("@/contexts/FleetAuthContext", () => ({
  useFleetAuth: () => ({ role: activeProfile.role, profile: activeProfile, user: {}, signOut: vi.fn() }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

describe("Home role visibility", () => {
  it("renders the driver navigation without management views", () => {
    activeProfile = profiles.driver;
    const markup = renderToStaticMarkup(React.createElement(Home));
    expect(markup).toContain("Start inspection");
    expect(markup).not.toContain("Fleet register");
    expect(markup).not.toContain("Defect queue");
  });

  it("renders supervisor review navigation without inspection actions", () => {
    activeProfile = profiles.supervisor;
    const markup = renderToStaticMarkup(React.createElement(Home));
    expect(markup).toContain("Review defect queue");
    expect(markup).not.toContain("Start inspection");
    expect(markup).not.toContain("Capture today’s evidence");
  });

  it("renders admin fleet navigation without driver-only actions", () => {
    activeProfile = profiles.admin;
    const markup = renderToStaticMarkup(React.createElement(Home));
    expect(markup).toContain("Fleet register");
    expect(markup).not.toContain("Start inspection");
    expect(markup).not.toContain("Open driver view");
  });
});
