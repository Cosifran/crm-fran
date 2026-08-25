import { describe, expect, it } from "vitest";

import { leadCreatedAttributionMetadata } from "./create-lead";

describe("lead creation attribution metadata", () => {
  it("snapshots all incoming acquisition fields separately from motivation", () => {
    expect(leadCreatedAttributionMetadata({
      source: "Meta",
      campaign: "Agosto",
      ad: "Vídeo 1",
      creative: "UGC",
      acquisitionAngle: "Libertad",
    })).toEqual({
      source: "Meta",
      campaign: "Agosto",
      ad: "Vídeo 1",
      creative: "UGC",
      acquisitionAngle: "Libertad",
    });
  });

  it("keeps legacy callers compatible", () => {
    expect(leadCreatedAttributionMetadata({})).toEqual({
      source: null,
      campaign: null,
      ad: null,
      creative: null,
      acquisitionAngle: null,
    });
  });
});
