import { describe, expect, it } from "vitest";

import {
  aggregateLeadConditions,
  aggregateCloserConditions,
  CLOSER_CONDITION_LABELS,
  classifyCloserCondition,
  classifyLeadCondition,
} from "./personal-statistics";

const question = (questionKey: string, answer: string) => ({
  questionKey,
  question: questionKey,
  answer,
  authorRole: "caller" as const,
  authorId: "caller-1",
});

const closerQuestion = (questionKey: string, answer: string) => ({
  questionKey,
  question: questionKey,
  answer,
  authorRole: "closer" as const,
  authorId: "closer-1",
});

describe("personal lead statistics", () => {
  it.each([
    ["sin asignar", [], "unassigned"],
    ["Asignado", [], "assigned"],
    ["número erróneo", [], "wrong_number"],
    ["Asignado", [question("isContacted", "No")], "no_contact"],
    ["Asignado", [question("callerOutcome", "Llamar a futuro")], "future_call"],
    ["Asignado", [question("callerOutcome", "No encaja")], "not_fit"],
    ["Asignado", [question("callerOutcome", "No interesado")], "not_interested"],
    ["Asignado", [question("callerOutcome", "Agenda")], "appointment"],
    [
      "Asignado",
      [
        question("callerOutcome", "Agenda"),
        question("appointmentRescheduled", "Si"),
      ],
      "rescheduled",
    ],
  ])("classifies %s as %s", (state, questions, expected) => {
    expect(classifyLeadCondition({ state, questions })).toBe(expected);
  });

  it("uses the latest contact event instead of a stale outcome", () => {
    expect(
      classifyLeadCondition({
        state: "Asignado",
        questions: [
          question("callerOutcome", "Agenda"),
          question("isContacted", "No"),
        ],
      }),
    ).toBe("no_contact");
  });

  it("counts discarded leads as terminal negative outcomes", () => {
    const result = aggregateLeadConditions([
      { state: "número erróneo", questions: [] },
      {
        state: "Asignado",
        questions: [question("callerOutcome", "No encaja")],
      },
      {
        state: "Asignado",
        questions: [question("callerOutcome", "No interesado")],
      },
      { state: "Asignado", questions: [] },
    ]);

    expect(result.total).toBe(4);
    expect(result.discarded).toBe(3);
    expect(result.counts.assigned).toBe(1);
  });

  it.each([
    [
      [question("callerOutcome", "Agenda")],
      "appointment",
    ],
    [
      [
        question("callerOutcome", "Agenda"),
        question("appointmentRescheduled", "Si"),
      ],
      "rescheduled",
    ],
    [
      [
        question("callerOutcome", "Agenda"),
        closerQuestion("closerOutcome", "Seguimiento"),
      ],
      "follow_up",
    ],
    [
      [
        question("callerOutcome", "Agenda"),
        closerQuestion("closerOutcome", "Venta"),
      ],
      "sale",
    ],
    [
      [
        question("callerOutcome", "Agenda"),
        closerQuestion("closerOutcome", "No interesado"),
      ],
      "not_interested",
    ],
    [
      [
        question("callerOutcome", "Agenda"),
        closerQuestion("closerOutcome", "No-show"),
      ],
      "no_show",
    ],
    [
      [
        question("callerOutcome", "Agenda"),
        closerQuestion("isContacted", "No"),
      ],
      "no_show",
    ],
  ])("classifies closer agenda outcome as %s", (questions, expected) => {
    expect(classifyCloserCondition({ state: "Asignado", questions })).toBe(
      expected,
    );
  });

  it("aggregates the closer-specific metrics", () => {
    const result = aggregateCloserConditions([
      {
        state: "Asignado",
        questions: [question("callerOutcome", "Agenda")],
      },
      {
        state: "Asignado",
        questions: [
          question("callerOutcome", "Agenda"),
          closerQuestion("closerOutcome", "Venta"),
        ],
      },
      {
        state: "Asignado",
        questions: [
          question("callerOutcome", "Agenda"),
          closerQuestion("closerOutcome", "No interesado"),
        ],
      },
    ]);

    expect(result.total).toBe(3);
    expect(result.counts).toEqual({
      appointment: 1,
      rescheduled: 0,
      follow_up: 0,
      sale: 1,
      not_interested: 1,
      no_show: 0,
    });
  });

  it("uses No interesado as the only negative sale outcome", () => {
    expect(Object.values(CLOSER_CONDITION_LABELS)).not.toContain("No venta");
    expect(Object.values(CLOSER_CONDITION_LABELS)).toContain("No interesado");
    expect(Object.values(CLOSER_CONDITION_LABELS)).toContain("No-show");
  });
});
