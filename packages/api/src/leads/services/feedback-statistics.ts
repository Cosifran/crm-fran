import { and, asc, db, eq, gte, lte } from "@crm-fran/db";
import { leadActivityEvents, user } from "@crm-fran/db/schema/index";

import type { FeedbackProfile, MotivationAngle } from "../../call-feedback";
import { FEEDBACK_PROFILES, MOTIVATION_ANGLES } from "../../call-feedback";

export type FeedbackReaction = "appointment" | "future_call" | "not_interested" | "not_fit" | "unknown";

type FeedbackRow = {
  actorId: string | null;
  actorName: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
};

type FeedbackStatisticsInput = { callerId?: string; from?: string; to?: string };

const REACTION_BY_OUTCOME: Record<string, FeedbackReaction> = {
  Agenda: "appointment",
  "Llamar a futuro": "future_call",
  "No interesado": "not_interested",
  "No encaja": "not_fit",
};
const profileValues = new Set<string>(FEEDBACK_PROFILES.map(({ value }) => value));
const angleValues = new Set<string>(MOTIVATION_ANGLES.map(({ value }) => value));

function emptyReactions(): Record<FeedbackReaction, number> {
  return { appointment: 0, future_call: 0, not_interested: 0, not_fit: 0, unknown: 0 };
}

function readAnswers(metadata: Record<string, unknown>) {
  const questions = Array.isArray(metadata.questions) ? metadata.questions : [];
  return new Map(
    questions.flatMap((question) => {
      if (!question || typeof question !== "object") return [];
      const { questionKey, answer } = question as Record<string, unknown>;
      return typeof questionKey === "string" && typeof answer === "string"
        ? [[questionKey, answer] as const]
        : [];
    }),
  );
}

function readAngles(answer: string | undefined): MotivationAngle[] {
  if (!answer) return [];
  try {
    const values: unknown = JSON.parse(answer);
    return Array.isArray(values)
      ? values.filter((value): value is MotivationAngle => typeof value === "string" && angleValues.has(value))
      : [];
  } catch {
    return [];
  }
}

export function buildFeedbackStatistics(rows: readonly FeedbackRow[]) {
  const profiles = new Map<FeedbackProfile, {
    profile: FeedbackProfile;
    total: number;
    reactions: Record<FeedbackReaction, number>;
    subProfiles: Map<FeedbackProfile, { profile: FeedbackProfile; total: number }>;
  }>();
  const angles = new Map<MotivationAngle, {
    angle: MotivationAngle;
    total: number;
    reactions: Record<FeedbackReaction, number>;
  }>();
  const callers = new Map<string, { id: string; name: string; total: number }>();
  let classifiedFeedbacks = 0;
  let classifiedAppointments = 0;

  for (const row of rows) {
    const reaction = REACTION_BY_OUTCOME[row.description ?? ""] ?? "unknown";
    const answers = readAnswers(row.metadata);
    const profileAnswer = answers.get("primaryProfile");
    const profile = profileAnswer && profileValues.has(profileAnswer)
      ? (profileAnswer as FeedbackProfile)
      : undefined;

    if (profile) {
      classifiedFeedbacks += 1;
      if (reaction === "appointment") classifiedAppointments += 1;
      const entry = profiles.get(profile) ?? {
        profile,
        total: 0,
        reactions: emptyReactions(),
        subProfiles: new Map(),
      };
      entry.total += 1;
      entry.reactions[reaction] += 1;
      const subProfileAnswer = answers.get("subProfile");
      if (subProfileAnswer && profileValues.has(subProfileAnswer)) {
        const subProfile = subProfileAnswer as FeedbackProfile;
        const subEntry = entry.subProfiles.get(subProfile) ?? { profile: subProfile, total: 0 };
        subEntry.total += 1;
        entry.subProfiles.set(subProfile, subEntry);
      }
      profiles.set(profile, entry);
    }

    for (const angle of readAngles(answers.get("motivationAngles"))) {
      const entry = angles.get(angle) ?? { angle, total: 0, reactions: emptyReactions() };
      entry.total += 1;
      entry.reactions[reaction] += 1;
      angles.set(angle, entry);
    }

    if (row.actorId) {
      const caller = callers.get(row.actorId) ?? { id: row.actorId, name: row.actorName ?? "Sin nombre", total: 0 };
      caller.total += 1;
      callers.set(row.actorId, caller);
    }
  }

  return {
    totalFeedbacks: rows.length,
    classifiedFeedbacks,
    appointmentRate: classifiedFeedbacks === 0 ? 0 : Math.round((classifiedAppointments / classifiedFeedbacks) * 1_000) / 10,
    profiles: [...profiles.values()]
      .map(({ subProfiles, ...entry }) => ({ ...entry, subProfiles: [...subProfiles.values()].sort((a, b) => b.total - a.total) }))
      .sort((a, b) => b.total - a.total),
    angles: [...angles.values()].sort((a, b) => b.total - a.total),
    callers: [...callers.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function startOfDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function endOfDay(value: string) {
  const date = startOfDay(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function getFeedbackStatistics(input: FeedbackStatisticsInput) {
  const rows = await db
    .select({ actorId: leadActivityEvents.actorId, actorName: user.name, description: leadActivityEvents.description, metadata: leadActivityEvents.metadata })
    .from(leadActivityEvents)
    .leftJoin(user, eq(leadActivityEvents.actorId, user.id))
    .where(and(
      eq(leadActivityEvents.kind, "caller_feedback"),
      input.from ? gte(leadActivityEvents.occurredAt, startOfDay(input.from)) : undefined,
      input.to ? lte(leadActivityEvents.occurredAt, endOfDay(input.to)) : undefined,
    ))
    .orderBy(asc(leadActivityEvents.occurredAt));

  const allStatistics = buildFeedbackStatistics(rows);
  const filteredStatistics = buildFeedbackStatistics(
    input.callerId
      ? rows.filter((row) => row.actorId === input.callerId)
      : rows,
  );

  return { ...filteredStatistics, callers: allStatistics.callers };
}
