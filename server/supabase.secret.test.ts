import { describe, expect, it } from "vitest";

const SUPABASE_URL = "https://esbsguetydiqmaectoyu.supabase.co";

describe("Supabase server credential", () => {
  it("can reach the project API with the configured server key", async () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(key, "SUPABASE_SERVICE_ROLE_KEY must be configured").toBeTruthy();

    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key!}`,
      },
    });

    expect(response.ok).toBe(true);
  }, 15_000);
});
