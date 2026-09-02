import { describe, expect, it, vi } from "vitest";
import {
  buildInspectionDraft,
  flattenChecklistItems,
  submitInspection,
} from "./inspection-sync.js";

vi.mock("./supabase", () => ({
  supabase: null,
  uploadInspectionPhoto: vi.fn(),
}));

describe("inspection-sync", () => {
  it("flattens checklist sections in display order", () => {
    expect(
      flattenChecklistItems([
        { items: [{ id: "a" }, { id: "b" }] },
        { items: [{ id: "c" }] },
      ]),
    ).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
  });

  it("builds a serializable draft with the current inspection state", () => {
    const draft = buildInspectionDraft({
      selectedFleet: "7100796",
      checks: { lights: true },
      notes: "Mirror needs attention",
      photoFiles: {},
    });

    expect(draft).toMatchObject({
      selectedFleet: "7100796",
      checks: { lights: true },
      notes: "Mirror needs attention",
      photoFiles: {},
    });
    expect(typeof draft.savedAt).toBe("string");
  });

  it("marks an offline submission as queued while preserving both Yes and No answers", () => {
    const draft = buildInspectionDraft({
      selectedFleet: "7100796",
      checks: { lights: true, brakes: false },
      notes: "Brake response recorded as No",
      photoFiles: {},
      queued: true,
    });

    expect(draft.queued).toBe(true);
    expect(draft.checks).toEqual({ lights: true, brakes: false });
  });

  it("queues an inspection when Supabase is unavailable", async () => {
    const result = await submitInspection({
      profile: { id: "driver-1", full_name: "Driver One" },
      selectedFleet: "7100796",
      checks: {},
      notes: "",
      photoFiles: {},
      checklistSections: [],
    });

    expect(result).toEqual({ queued: true });
  });
});
