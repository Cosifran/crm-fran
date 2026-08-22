import { FEEDBACK_PROFILES } from "../../call-feedback";
import {
  classifyConversionLead,
  getConversionEventOutcome,
  type FunnelLead,
} from "../../dashboard/conversion-funnel";

export const DEFAULT_CALLER_RANKING_SAMPLE_SIZE = 10;

const PROFILE_VALUES = new Set(FEEDBACK_PROFILES.map(({ value }) => value));
const EXACT_SEGMENT_BASELINE_SIZE = 5;
const QUALITY_WEIGHTS = {
  appointment: 0.25,
  show: 0.3,
  sale: 0.45,
} as const;

type CallerQualityEvent = FunnelLead["events"][number];

export type CallerQualityLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "maestra" | "vsl";
  callerId: string;
  callerName: string | null;
  closerId?: string | null;
  closerName?: string | null;
  assignedAt: Date;
  assignmentEndedAt: Date | null;
  source: string | null;
  campaign: string | null;
  events: CallerQualityEvent[];
};

type EvaluatedLead = Omit<CallerQualityLead, "events"> & {
  profile: string | null;
  contacted: boolean;
  appointment: boolean;
  show: boolean;
  sale: boolean;
  firstContactMinutes: number | null;
  quality: number;
  expectedQuality: number;
};

type MetricLead = Pick<
  EvaluatedLead,
  "contacted" | "appointment" | "show" | "sale" | "firstContactMinutes"
>;

function percentage(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 1_000) / 10;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function readProfile(events: readonly CallerQualityEvent[]) {
  for (let eventIndex = events.length - 1; eventIndex >= 0; eventIndex -= 1) {
    const questions = events[eventIndex]?.metadata.questions;
    if (!Array.isArray(questions)) continue;
    for (let questionIndex = questions.length - 1; questionIndex >= 0; questionIndex -= 1) {
      const question = questions[questionIndex];
      if (
        question &&
        typeof question === "object" &&
        "questionKey" in question &&
        question.questionKey === "primaryProfile" &&
        "answer" in question &&
        typeof question.answer === "string" &&
        PROFILE_VALUES.has(question.answer)
      ) {
        return question.answer;
      }
    }
  }
  return null;
}

function eventsWithinAssignment(lead: CallerQualityLead) {
  return lead.events
    .filter(
      (event) =>
        event.occurredAt >= lead.assignedAt &&
        (!lead.assignmentEndedAt || event.occurredAt < lead.assignmentEndedAt),
    )
    .sort((first, second) => first.occurredAt.getTime() - second.occurredAt.getTime());
}

function evaluateLead(lead: CallerQualityLead) {
  const events = eventsWithinAssignment(lead);
  const classification = classifyConversionLead({
    ...lead,
    closerId: lead.closerId ?? null,
    closerName: lead.closerName ?? null,
    events,
  });
  const firstContact = events.find(
    (event) =>
      event.kind === "caller_feedback" &&
      getConversionEventOutcome(event) !== "Lead no contactado",
  );
  const firstContactMinutes = firstContact
    ? Math.max(0, Math.round((firstContact.occurredAt.getTime() - lead.assignedAt.getTime()) / 60_000))
    : null;
  const quality =
    Number(classification.appointment) * QUALITY_WEIGHTS.appointment +
    Number(classification.show) * QUALITY_WEIGHTS.show +
    Number(classification.sale) * QUALITY_WEIGHTS.sale;

  return {
    ...lead,
    events: undefined,
    profile: readProfile(events),
    ...classification,
    firstContactMinutes,
    quality,
    expectedQuality: 0,
  } satisfies EvaluatedLead & { events: undefined };
}

function segmentValue(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

function segmentKey(lead: Pick<EvaluatedLead, "profile" | "source" | "campaign">) {
  return [
    segmentValue(lead.profile, "Sin perfil"),
    segmentValue(lead.source, "Sin fuente"),
    segmentValue(lead.campaign, "Sin campaña"),
  ].join("\u0000");
}

function summarizeMetrics(leads: readonly MetricLead[]) {
  const firstContactValues = leads.flatMap(({ firstContactMinutes }) =>
    firstContactMinutes === null ? [] : [firstContactMinutes],
  );
  return {
    assigned: leads.length,
    contactedRate: percentage(leads.filter(({ contacted }) => contacted).length, leads.length),
    appointmentRate: percentage(leads.filter(({ appointment }) => appointment).length, leads.length),
    showRate: percentage(leads.filter(({ show }) => show).length, leads.length),
    saleRate: percentage(leads.filter(({ sale }) => sale).length, leads.length),
    averageFirstContactMinutes:
      firstContactValues.length === 0
        ? null
        : Math.round(
            firstContactValues.reduce((sum, value) => sum + value, 0) /
              firstContactValues.length,
          ),
  };
}

function buildBreakdown(
  leads: readonly EvaluatedLead[],
  selectValue: (lead: EvaluatedLead) => string,
) {
  const groups = new Map<string, EvaluatedLead[]>();
  for (const lead of leads) {
    const value = selectValue(lead);
    const group = groups.get(value) ?? [];
    group.push(lead);
    groups.set(value, group);
  }
  return [...groups]
    .map(([value, groupedLeads]) => ({ value, ...summarizeMetrics(groupedLeads) }))
    .sort((first, second) => second.assigned - first.assigned || first.value.localeCompare(second.value));
}

function weekStart(date: Date) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function periodKey(date: Date, period: "week" | "month") {
  if (period === "week") return weekStart(date).toISOString().slice(0, 10);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(key: string, period: "week" | "month") {
  const date = period === "week"
    ? new Date(`${key}T00:00:00.000Z`)
    : new Date(`${key}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat("es-ES", {
    ...(period === "week" ? { day: "2-digit" as const } : {}),
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date).replace(" de ", " ").replace(" de ", " ");
}

function buildTrends(leads: readonly EvaluatedLead[], period: "week" | "month") {
  const groups = new Map<string, EvaluatedLead[]>();
  for (const lead of leads) {
    const key = `${periodKey(lead.assignedAt, period)}\u0000${lead.callerId}`;
    const group = groups.get(key) ?? [];
    group.push(lead);
    groups.set(key, group);
  }
  return [...groups]
    .map(([key, groupedLeads]) => {
      const [bucket = "", callerId = ""] = key.split("\u0000");
      return {
        key: bucket,
        label: periodLabel(bucket, period),
        callerId,
        callerName: groupedLeads[0]?.callerName ?? "Sin nombre",
        ...summarizeMetrics(groupedLeads),
      };
    })
    .sort((first, second) => first.key.localeCompare(second.key) || first.callerName.localeCompare(second.callerName));
}

export function buildCallerQualityRanking(
  input: readonly CallerQualityLead[],
  minimumSampleSize = DEFAULT_CALLER_RANKING_SAMPLE_SIZE,
) {
  const evaluated = input.map(evaluateLead).map(({ events: _events, ...lead }) => lead);
  const globalExpected = evaluated.length === 0
    ? 0
    : evaluated.reduce((sum, lead) => sum + lead.quality, 0) / evaluated.length;
  const segments = new Map<string, EvaluatedLead[]>();
  for (const lead of evaluated) {
    const key = segmentKey(lead);
    const group = segments.get(key) ?? [];
    group.push(lead);
    segments.set(key, group);
  }
  const leadsWithExpected = evaluated.map((lead) => {
    const segment = segments.get(segmentKey(lead)) ?? [];
    const expectedQuality = segment.length >= EXACT_SEGMENT_BASELINE_SIZE
      ? segment.reduce((sum, item) => sum + item.quality, 0) / segment.length
      : globalExpected;
    return { ...lead, expectedQuality };
  });

  const callers = new Map<string, EvaluatedLead[]>();
  for (const lead of leadsWithExpected) {
    const group = callers.get(lead.callerId) ?? [];
    group.push(lead);
    callers.set(lead.callerId, group);
  }
  const rows = [...callers].map(([callerId, callerLeads]) => {
    const actual = callerLeads.reduce((sum, lead) => sum + lead.quality, 0) / callerLeads.length;
    const expected = callerLeads.reduce((sum, lead) => sum + lead.expectedQuality, 0) / callerLeads.length;
    return {
      callerId,
      callerName: callerLeads[0]?.callerName ?? "Sin nombre",
      ...summarizeMetrics(callerLeads),
      adjustedIndex: round(Math.max(0, Math.min(200, 100 + (actual - expected) * 100))),
      breakdowns: {
        profiles: buildBreakdown(callerLeads, (lead) => segmentValue(lead.profile, "Sin perfil")),
        sources: buildBreakdown(callerLeads, (lead) => segmentValue(lead.source, "Sin fuente")),
        campaigns: buildBreakdown(callerLeads, (lead) => segmentValue(lead.campaign, "Sin campaña")),
      },
      leads: callerLeads.map(({ expectedQuality: _expectedQuality, quality: _quality, ...lead }) => lead),
    };
  });
  const eligible = rows
    .filter(({ assigned }) => assigned >= minimumSampleSize)
    .sort((first, second) => second.adjustedIndex - first.adjustedIndex || second.saleRate - first.saleRate);

  return {
    minimumSampleSize,
    methodology: "Índice 100 = resultado esperado según la mezcla de perfil, fuente y campaña. Solo se ordenan callers con muestra suficiente.",
    ranked: eligible.map((row, index) => ({ ...row, rank: index + 1 })),
    insufficientSample: rows
      .filter(({ assigned }) => assigned < minimumSampleSize)
      .sort((first, second) => second.assigned - first.assigned),
    weekly: buildTrends(leadsWithExpected, "week"),
    monthly: buildTrends(leadsWithExpected, "month"),
  };
}
