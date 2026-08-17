import { describe, expect, it } from "vitest";

import { leadActivityEvents } from "./lead-activity";

describe("lead activity schema", () => {
  it("stores immutable lead-scoped events with a stable dedupe key", () => {
    expect(leadActivityEvents.leadId).toBeDefined();
    expect(leadActivityEvents.kind).toBeDefined();
    expect(leadActivityEvents.actorId).toBeDefined();
    expect(leadActivityEvents.metadata).toBeDefined();
    expect(leadActivityEvents.dedupeKey).toBeDefined();
    expect(leadActivityEvents.occurredAt).toBeDefined();
  });
});
