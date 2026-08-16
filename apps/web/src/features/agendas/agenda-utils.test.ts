import { describe, expect, it } from "vitest";

import { filterAgendaLeads, type AgendaQuestion } from "./agenda-utils";

const lead = (questions: AgendaQuestion[]) => ({
  id: "lead-1",
  name: "Lead 1",
  caller: { id: "caller-1", name: "Caller 1" },
  closer: { id: "closer-1", name: "Closer 1" },
  questions,
});

describe("agenda lead helpers", () => {
  it("returns agenda leads with caller, closer, date, and time", () => {
    expect(
      filterAgendaLeads([
        lead([
          { questionKey: "callerOutcome", answer: "Agenda", authorRole: "caller" },
          { questionKey: "scheduledDate", answer: "2099-01-01", authorRole: "caller" },
          { questionKey: "scheduledTime", answer: "10:00", authorRole: "caller" },
        ]),
      ]),
    ).toMatchObject([
      { id: "lead-1", scheduledDate: "2099-01-01", scheduledTime: "10:00" },
    ]);
  });

  it("uses the latest schedule even when a closer performed the reschedule", () => {
    expect(
      filterAgendaLeads([
        lead([
          { questionKey: "callerOutcome", answer: "Agenda", authorRole: "caller" },
          { questionKey: "scheduledDate", answer: "2099-01-01", authorRole: "caller" },
          { questionKey: "scheduledTime", answer: "10:00", authorRole: "caller" },
          { questionKey: "scheduledDate", answer: "2099-01-02", authorRole: "closer" },
          { questionKey: "scheduledTime", answer: "11:00", authorRole: "closer" },
        ]),
      ]),
    ).toMatchObject([
      { scheduledDate: "2099-01-02", scheduledTime: "11:00" },
    ]);
  });

  it("excludes non-agenda outcomes and respects the latest caller outcome", () => {
    expect(
      filterAgendaLeads([
        lead([{ questionKey: "callerOutcome", answer: "No encaja", authorRole: "caller" }]),
        lead([
          { questionKey: "callerOutcome", answer: "Agenda", authorRole: "caller" },
          { questionKey: "callerOutcome", answer: "No interesado", authorRole: "caller" },
        ]),
      ]),
    ).toEqual([]);
  });
});
