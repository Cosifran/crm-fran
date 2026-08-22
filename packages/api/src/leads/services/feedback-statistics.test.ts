import { describe, expect, it } from "vitest";

import { buildFeedbackStatistics } from "./feedback-statistics";

function feedback({
  outcome,
  profile,
  subProfile = "",
  angles = [],
}: {
  outcome: string;
  profile?: string;
  subProfile?: string;
  angles?: string[];
}) {
  return {
    actorId: "caller-1",
    actorName: "Caller 1",
    description: outcome,
    metadata: {
      questions: [
        ...(profile
          ? [{ questionKey: "primaryProfile", answer: profile }]
          : []),
        { questionKey: "subProfile", answer: subProfile },
        { questionKey: "motivationAngles", answer: JSON.stringify(angles) },
      ],
    },
  };
}

describe("feedback statistics", () => {
  it("groups every historical feedback by profile, subprofile, angle and reaction", () => {
    const result = buildFeedbackStatistics([
      feedback({
        outcome: "Agenda",
        profile: "latino_extranjero",
        subProfile: "parado_desempleado",
        angles: ["income_extra_to_primary"],
      }),
      feedback({
        outcome: "No interesado",
        profile: "latino_extranjero",
        subProfile: "mayor_edad_avanzada",
        angles: ["financial_stability"],
      }),
      feedback({
        outcome: "Llamar a futuro",
        profile: "mayor_edad_avanzada",
        angles: ["financial_stability"],
      }),
      feedback({ outcome: "No encaja" }),
    ]);

    expect(result.totalFeedbacks).toBe(4);
    expect(result.classifiedFeedbacks).toBe(3);
    expect(result.appointmentRate).toBeCloseTo(33.3, 1);
    expect(result.profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          profile: "latino_extranjero",
          total: 2,
          reactions: expect.objectContaining({
            appointment: 1,
            not_interested: 1,
          }),
          subProfiles: expect.arrayContaining([
            expect.objectContaining({ profile: "parado_desempleado", total: 1 }),
            expect.objectContaining({ profile: "mayor_edad_avanzada", total: 1 }),
          ]),
        }),
      ]),
    );
    expect(result.angles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ angle: "financial_stability", total: 2 }),
      ]),
    );
  });
});
