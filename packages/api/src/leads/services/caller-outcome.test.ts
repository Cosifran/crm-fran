import { describe, expect, it } from "vitest";

import { validateCallerOutcomeInput } from "./caller-outcome";

describe("caller outcome validation", () => {
  it("accepts outcomes without additional fields", () => {
    expect(validateCallerOutcomeInput({ outcome: "not_fit" })).toBeUndefined();
    expect(
      validateCallerOutcomeInput({ outcome: "not_interested" }),
    ).toBeUndefined();
  });

  it("requires date, time, and severity for future calls", () => {
    expect(validateCallerOutcomeInput({ outcome: "future_call" })).toEqual({
      scheduledDate: "Required",
      scheduledTime: "Required",
      alertSeverity: "Required",
    });
  });

  it("requires closer, date, and time for appointments", () => {
    expect(validateCallerOutcomeInput({ outcome: "appointment" })).toEqual({
      closerId: "Required",
      scheduledDate: "Required",
      scheduledTime: "Required",
    });
  });

  it("rejects scheduled values in the past", () => {
    expect(
      validateCallerOutcomeInput({
        outcome: "future_call",
        scheduledDate: "2020-01-01",
        scheduledTime: "10:00",
        alertSeverity: "warning",
      }),
    ).toEqual({ scheduledDate: "Must be in the future" });
  });
});
