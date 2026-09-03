import { describe, expect, it } from "vitest";
import { canAccessView, defaultViewForRole, viewsForRole } from "./access-control";

describe("workspace role access", () => {
  it("limits drivers to inspection work", () => {
    expect(defaultViewForRole("driver")).toBe("inspection");
    expect(viewsForRole("driver")).toEqual(["inspection"]);
    expect(canAccessView("driver", "fleet")).toBe(false);
    expect(canAccessView("driver", "inspection")).toBe(true);
  });

  it("keeps admins as the only management role", () => {
    expect(viewsForRole("admin")).toEqual(["overview", "fleet", "defects"]);
    expect(canAccessView("admin", "fleet")).toBe(true);
    expect(canAccessView("admin", "defects")).toBe(true);
  });

  it("allows admins to access the fleet register", () => {
    expect(canAccessView("admin", "fleet")).toBe(true);
    expect(canAccessView(null, "overview")).toBe(false);
  });
});
