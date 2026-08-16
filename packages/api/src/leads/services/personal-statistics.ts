import type { LeadQASessionItem } from "@crm-fran/db/schema/index";

import { selectLeadWithUsers } from "../queries/index";

export const LEAD_CONDITION_LABELS = {
  unassigned: "Sin asignar",
  assigned: "Asignado",
  wrong_number: "Número erróneo",
  no_contact: "No contactado",
  future_call: "Llamar futuro",
  not_fit: "No encaja",
  not_interested: "No interesado",
  appointment: "Agenda",
  rescheduled: "Reagenda",
} as const;

export type LeadCondition = keyof typeof LEAD_CONDITION_LABELS;

export const CLOSER_CONDITION_LABELS = {
  appointment: "Agenda",
  rescheduled: "Reagenda",
  follow_up: "Seguimiento",
  sale: "Venta",
  not_interested: "No interesado",
  no_show: "No-show",
} as const;

export type CloserCondition = keyof typeof CLOSER_CONDITION_LABELS;

type LeadForStatistics = {
  state: string;
  questions: readonly LeadQASessionItem[];
};

export type PersonalStatisticsInput = {
  callerId?: string;
  closerId?: string;
  from?: string;
  to?: string;
};

const OUTCOME_CONDITIONS: Record<string, LeadCondition> = {
  "Llamar a futuro": "future_call",
  "No encaja": "not_fit",
  "No interesado": "not_interested",
  Agenda: "appointment",
};

const CLOSER_OUTCOME_CONDITIONS: Record<string, CloserCondition> = {
  Agenda: "appointment",
  Reagenda: "rescheduled",
  Seguimiento: "follow_up",
  Venta: "sale",
  "No interesado": "not_interested",
  "No-show": "no_show",
};

const DISCARDED_CONDITIONS = new Set<LeadCondition>([
  "wrong_number",
  "not_fit",
  "not_interested",
]);

function getLatestQuestionIndex(
  questions: readonly LeadQASessionItem[],
  questionKey: string,
): number {
  for (let index = questions.length - 1; index >= 0; index -= 1) {
    if (questions[index]?.questionKey === questionKey) return index;
  }
  return -1;
}

export function classifyLeadCondition(
  lead: LeadForStatistics,
): LeadCondition {
  if (lead.state === "número erróneo") return "wrong_number";

  const contactIndex = getLatestQuestionIndex(lead.questions, "isContacted");
  const outcomeIndex = getLatestQuestionIndex(lead.questions, "callerOutcome");
  const contactAnswer = lead.questions[contactIndex]?.answer;

  if (contactAnswer === "No" && contactIndex > outcomeIndex) {
    return "no_contact";
  }

  const outcomeAnswer = lead.questions[outcomeIndex]?.answer;
  const outcomeCondition = outcomeAnswer
    ? OUTCOME_CONDITIONS[outcomeAnswer]
    : undefined;

  if (outcomeCondition === "appointment") {
    const rescheduledIndex = getLatestQuestionIndex(
      lead.questions,
      "appointmentRescheduled",
    );
    return lead.questions[rescheduledIndex]?.answer === "Si"
      ? "rescheduled"
      : "appointment";
  }

  if (outcomeCondition) return outcomeCondition;
  if (contactAnswer === "No") return "no_contact";
  return lead.state === "sin asignar" ? "unassigned" : "assigned";
}

export function classifyCloserCondition(
  lead: LeadForStatistics,
): CloserCondition | undefined {
  const outcomeIndex = getLatestQuestionIndex(
    lead.questions,
    "closerOutcome",
  );
  const callerOutcomeIndex = getLatestQuestionIndex(
    lead.questions,
    "callerOutcome",
  );
  const rescheduledIndex = getLatestQuestionIndex(
    lead.questions,
    "appointmentRescheduled",
  );
  const latestSchedulingIndex = Math.max(callerOutcomeIndex, rescheduledIndex);
  const contactedIndex = getLatestQuestionIndex(
    lead.questions,
    "isContacted",
  );
  const contactedQuestion = lead.questions[contactedIndex];
  if (
    contactedQuestion?.authorRole === "closer" &&
    contactedQuestion.answer === "No" &&
    contactedIndex > latestSchedulingIndex
  ) {
    return "no_show";
  }
  const outcomeAnswer = lead.questions[outcomeIndex]?.answer;
  const closerCondition = outcomeAnswer
    ? CLOSER_OUTCOME_CONDITIONS[outcomeAnswer]
    : undefined;

  if (closerCondition && outcomeIndex > latestSchedulingIndex) {
    return closerCondition;
  }

  if (lead.questions[callerOutcomeIndex]?.answer !== "Agenda") {
    return undefined;
  }

  return lead.questions[rescheduledIndex]?.answer === "Si"
    ? "rescheduled"
    : "appointment";
}

export function aggregateLeadConditions(
  leads: readonly LeadForStatistics[],
) {
  const counts = Object.fromEntries(
    Object.keys(LEAD_CONDITION_LABELS).map((condition) => [condition, 0]),
  ) as Record<LeadCondition, number>;

  for (const lead of leads) {
    counts[classifyLeadCondition(lead)] += 1;
  }

  return {
    total: leads.length,
    discarded: [...DISCARDED_CONDITIONS].reduce(
      (total, condition) => total + counts[condition],
      0,
    ),
    counts,
  };
}

export function aggregateCloserConditions(
  leads: readonly LeadForStatistics[],
) {
  const counts = Object.fromEntries(
    Object.keys(CLOSER_CONDITION_LABELS).map((condition) => [condition, 0]),
  ) as Record<CloserCondition, number>;

  for (const lead of leads) {
    const condition = classifyCloserCondition(lead);
    if (condition) counts[condition] += 1;
  }

  return {
    total: leads.length,
    counts,
  };
}

function startOfDay(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function endOfDay(value: string): Date {
  const date = startOfDay(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function getPersonalStatistics(input: PersonalStatisticsInput) {
  const rows = await selectLeadWithUsers();
  const from = input.from ? startOfDay(input.from) : undefined;
  const to = input.to ? endOfDay(input.to) : undefined;
  const filteredRows = rows.filter((lead) => {
    if (input.callerId && lead.callerId !== input.callerId) return false;
    if (input.closerId && lead.closerId !== input.closerId) return false;
    if (from && lead.updatedAt < from) return false;
    if (to && lead.updatedAt > to) return false;
    return true;
  });
  const callers = new Map<string, string>();
  const closers = new Map<string, string>();

  for (const lead of rows) {
    if (lead.caller?.id && lead.caller.name) {
      callers.set(lead.caller.id, lead.caller.name);
    }
    if (lead.closer?.id && lead.closer.name) {
      closers.set(lead.closer.id, lead.closer.name);
    }
  }

  const mode = input.closerId ? "closer" : "caller";
  const aggregate =
    mode === "closer"
      ? aggregateCloserConditions(filteredRows)
      : aggregateLeadConditions(filteredRows);

  return {
    ...aggregate,
    mode,
    conditions:
      mode === "closer" ? CLOSER_CONDITION_LABELS : LEAD_CONDITION_LABELS,
    callers: [...callers].map(([id, name]) => ({ id, name })),
    closers: [...closers].map(([id, name]) => ({ id, name })),
  };
}
