import { describe, expect, it } from "vitest";
import { isAllowedRole } from "./auth-flow.js";

describe("fleet authentication roles", () => {
  it("allows a user when no role restriction is supplied", () => {
    expect(isAllowedRole("admin")).toBe(true);
    expect(isAllowedRole("super_admin")).toBe(true);
  });

  it("allows only the requested role", () => {
    expect(isAllowedRole("admin", "admin")).toBe(true);
    expect(isAllowedRole("unauthorized", "admin")).toBe(false);
  });

  it("lets a super_admin satisfy an admin-only gate", () => {
    expect(isAllowedRole("super_admin", "admin")).toBe(true);
  });
});
