import { describe, expect, it } from "vitest";
import { isAllowedRole } from "./auth-flow.js";

describe("fleet authentication roles", () => {
  it("allows a user when no role restriction is supplied", () => {
    expect(isAllowedRole("driver")).toBe(true);
    expect(isAllowedRole("admin")).toBe(true);
  });

  it("allows only the requested role", () => {
    expect(isAllowedRole("admin", "admin")).toBe(true);
    expect(isAllowedRole("driver", "admin")).toBe(false);
    expect(isAllowedRole("admin", "driver")).toBe(false);
  });
});
