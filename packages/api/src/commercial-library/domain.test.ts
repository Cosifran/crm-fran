import { describe, expect, it } from "vitest";
import { experimentEvidenceLabel, latestLibraryVersions, latestVisibleLibraryVersions, planLibraryTransition } from "./domain";

describe("commercial library domain", () => {
  it("enforces draft, publish and archive transitions", () => {
    expect(planLibraryTransition([], "create_draft", "script")).toEqual({ version: 1, status: "draft", type: "script" });
    expect(planLibraryTransition([{ version: 1, status: "draft", type: "script" }], "publish")).toEqual({ version: 2, status: "published", type: "script" });
    expect(planLibraryTransition([{ version: 2, status: "published", type: "script" }], "archive")).toEqual({ version: 3, status: "archived", type: "script" });
    expect(() => planLibraryTransition([], "publish", "script")).toThrow("start as a draft");
    expect(() => planLibraryTransition([{ version: 3, status: "archived", type: "script" }], "publish")).toThrow("Invalid library transition");
    expect(() => planLibraryTransition([{ version: 1, status: "draft", type: "script" }], "create_draft", "playbook")).toThrow("type is immutable");
  });

  it("selects latest lineage before applying caller visibility", () => {
    const current = latestLibraryVersions([
      { lineageKey: "active", version: 1, status: "draft" as const },
      { lineageKey: "active", version: 2, status: "published" as const },
      { lineageKey: "revoked", version: 2, status: "published" as const },
      { lineageKey: "revoked", version: 3, status: "archived" as const },
    ]);
    expect(current).toEqual(expect.arrayContaining([
      expect.objectContaining({ lineageKey: "active", version: 2 }),
      expect.objectContaining({ lineageKey: "revoked", version: 3 }),
    ]));
    expect(latestVisibleLibraryVersions(current).map((row) => row.lineageKey)).toEqual(["active"]);
  });

  it("labels experiment origin causal only after completion and human approval", () => {
    expect(experimentEvidenceLabel({ status: "completed", finalDecision: "approved", approvedById: "admin" })).toBe("causal");
    expect(experimentEvidenceLabel({ status: "active", finalDecision: null, approvedById: "admin" })).toBe("observational");
  });
});
