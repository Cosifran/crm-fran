import { describe, expect, it } from "vitest";

import { getLeadPoolProgress, isAssignableLeadPool } from "./lead-pool";

describe("lead pool presentation", () => {
  it("shows the current recovery impact", () => {
    expect(getLeadPoolProgress(1)).toBe("Impacto 1 de 3");
    expect(getLeadPoolProgress(3)).toBe("Impacto 3 de 3");
  });

  it("keeps discarded leads read-only", () => {
    expect(isAssignableLeadPool("new")).toBe(true);
    expect(isAssignableLeadPool("recovered")).toBe(true);
    expect(isAssignableLeadPool("discarded")).toBe(false);
  });
});
