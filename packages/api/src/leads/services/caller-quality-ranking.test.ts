import { describe, expect, it } from "vitest";

import {
  buildCallerQualityRanking,
  type CallerQualityLead,
} from "./caller-quality-ranking";

const start = new Date("2026-08-03T09:00:00.000Z");

function event(
  id: string,
  kind: string,
  minutesAfterAssignment: number,
  description: string | null,
  profile = "busca_ingreso_extra",
) {
  return {
    id,
    kind,
    description,
    occurredAt: new Date(start.getTime() + minutesAfterAssignment * 60_000),
    metadata: kind === "caller_feedback"
      ? {
          questions: [
            { questionKey: "primaryProfile", answer: profile },
          ],
        }
      : {},
  };
}

function lead(
  id: string,
  callerId: string,
  callerName: string,
  events: CallerQualityLead["events"],
): CallerQualityLead {
  return {
    id,
    name: `Lead ${id}`,
    email: `${id}@example.com`,
    phone: "600000000",
    type: "maestra",
    callerId,
    callerName,
    assignedAt: start,
    assignmentEndedAt: null,
    source: "Meta Ads",
    campaign: "Agosto",
    events,
  };
}

describe("buildCallerQualityRanking", () => {
  it("ranks callers against the expected result for the same lead mix", () => {
    const result = buildCallerQualityRanking([
      lead("a-sale", "caller-a", "Ana", [
        event("a1", "caller_feedback", 30, "Agenda"),
        event("a2", "appointment_scheduled", 31, null),
        event("a3", "closer_feedback", 120, "Venta"),
      ]),
      lead("a-appointment", "caller-a", "Ana", [
        event("a4", "caller_feedback", 60, "Agenda"),
        event("a5", "appointment_scheduled", 61, null),
      ]),
      lead("b-one", "caller-b", "Bruno", [
        event("b1", "caller_feedback", 10, "No interesado"),
      ]),
      lead("b-two", "caller-b", "Bruno", [
        event("b2", "caller_feedback", 20, "No interesado"),
      ]),
    ], 2);

    expect(result.minimumSampleSize).toBe(2);
    expect(result.ranked.map(({ callerId }) => callerId)).toEqual([
      "caller-a",
      "caller-b",
    ]);
    expect(result.ranked[0]).toMatchObject({
      rank: 1,
      callerName: "Ana",
      assigned: 2,
      contactedRate: 100,
      appointmentRate: 100,
      showRate: 50,
      saleRate: 50,
      averageFirstContactMinutes: 45,
    });
    expect(result.ranked[0]?.adjustedIndex).toBeGreaterThan(100);
    expect(result.ranked[1]?.adjustedIndex).toBeLessThan(100);
    expect(result.ranked[0]?.breakdowns.sources[0]).toMatchObject({
      value: "Meta Ads",
      assigned: 2,
      saleRate: 50,
    });
    expect(result.ranked[0]?.breakdowns.profiles[0]?.value).toBe("busca_ingreso_extra");
    expect(result.weekly[0]?.label).toBe("03 ago 2026");
    expect(result.monthly[0]?.label).toBe("ago 2026");
  });

  it("keeps callers below the minimum sample out of the ordered ranking", () => {
    const result = buildCallerQualityRanking([
      lead("one", "caller-a", "Ana", [
        event("a1", "caller_feedback", 30, "No interesado"),
      ]),
    ], 2);

    expect(result.ranked).toEqual([]);
    expect(result.insufficientSample).toMatchObject([
      { callerId: "caller-a", callerName: "Ana", assigned: 1 },
    ]);
  });

  it("does not attribute events that happened after the next assignment", () => {
    const reassignedAt = new Date(start.getTime() + 45 * 60_000);
    const result = buildCallerQualityRanking([
      {
        ...lead("reassigned", "caller-a", "Ana", [
          event("late", "caller_feedback", 60, "Agenda"),
          event("late-appointment", "appointment_scheduled", 61, null),
        ]),
        assignmentEndedAt: reassignedAt,
      },
    ], 1);

    expect(result.ranked[0]).toMatchObject({
      contactedRate: 0,
      appointmentRate: 0,
      averageFirstContactMinutes: null,
    });
  });
});
