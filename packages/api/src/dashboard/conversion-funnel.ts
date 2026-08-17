export const CONVERSION_STAGE = {
  ASSIGNED: "assigned",
  CONTACTED: "contacted",
  APPOINTMENT: "appointment",
  SHOW: "show",
  SALE: "sale",
} as const;

export type ConversionStage =
  (typeof CONVERSION_STAGE)[keyof typeof CONVERSION_STAGE];

type FunnelEvent = {
  id: string;
  kind: string;
  description: string | null;
  occurredAt: Date;
  metadata: Record<string, unknown>;
};

export type FunnelLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "maestra" | "vsl";
  callerId: string;
  callerName: string | null;
  closerId: string | null;
  closerName: string | null;
  assignedAt: Date;
  events: FunnelEvent[];
};

export type ConversionCohortFilters = {
  from: Date;
  to: Date;
  callerId?: string;
  closerId?: string;
  type?: FunnelLead["type"];
};

const ATTENDED_OUTCOMES = new Set([
  "Agenda",
  "Reagenda",
  "Seguimiento",
  "Venta",
  "No interesado",
]);

const STAGE_LABELS: Record<ConversionStage, string> = {
  assigned: "Asignados",
  contacted: "Contactados",
  appointment: "Agenda",
  show: "Show",
  sale: "Venta",
};

function roundPercentage(value: number) {
  return Math.round(value * 10) / 10;
}

function eventOutcome(event: FunnelEvent) {
  if (event.description) return event.description;
  const questions = event.metadata.questions;
  if (!Array.isArray(questions)) return undefined;
  const outcome = [...questions]
    .reverse()
    .find(
      (question): question is { questionKey: string; answer: string } =>
        typeof question === "object" &&
        question !== null &&
        "questionKey" in question &&
        (question.questionKey === "callerOutcome" ||
          question.questionKey === "closerOutcome") &&
        "answer" in question &&
        typeof question.answer === "string",
    );
  return outcome?.answer;
}

export function selectConversionCohort(
  leads: readonly FunnelLead[],
  filters: ConversionCohortFilters,
) {
  return leads.filter(
    (lead) =>
      lead.assignedAt >= filters.from &&
      lead.assignedAt <= filters.to &&
      (!filters.callerId || lead.callerId === filters.callerId) &&
      (!filters.closerId || lead.closerId === filters.closerId) &&
      (!filters.type || lead.type === filters.type),
  );
}

export function buildConversionFunnel(input: readonly FunnelLead[]) {
  const leadsById = new Map<string, FunnelLead>();
  for (const lead of input) {
    const existing = leadsById.get(lead.id);
    if (!existing) {
      leadsById.set(lead.id, { ...lead, events: [...lead.events] });
      continue;
    }
    const events = new Map(existing.events.map((event) => [event.id, event]));
    for (const event of lead.events) events.set(event.id, event);
    leadsById.set(lead.id, {
      ...(lead.assignedAt < existing.assignedAt ? lead : existing),
      events: [...events.values()],
    });
  }

  const stageLeads: Record<ConversionStage, FunnelLead[]> = {
    assigned: [],
    contacted: [],
    appointment: [],
    show: [],
    sale: [],
  };
  const exits = { noShow: 0, notInterested: 0, followUp: 0 };

  for (const lead of leadsById.values()) {
    const events = lead.events
      .filter((event) => event.occurredAt >= lead.assignedAt)
      .sort((first, second) => first.occurredAt.getTime() - second.occurredAt.getTime());
    const callerFeedback = events.filter((event) => event.kind === "caller_feedback");
    const closerFeedback = events.filter((event) => event.kind === "closer_feedback");
    const callerOutcomes = callerFeedback.map(eventOutcome);
    const closerOutcomes = closerFeedback.map(eventOutcome);
    const latestCloserOutcome = closerOutcomes.at(-1);

    const contacted = callerFeedback.some(
      (event) => eventOutcome(event) !== "Lead no contactado",
    );
    const appointment =
      contacted &&
      events.some(
        (event) =>
          event.kind === "appointment_scheduled" ||
          event.kind === "appointment_rescheduled",
      );
    const show =
      appointment && closerOutcomes.some((outcome) => ATTENDED_OUTCOMES.has(outcome ?? ""));
    const sale = show && closerOutcomes.includes("Venta");

    stageLeads.assigned.push(lead);
    if (contacted) stageLeads.contacted.push(lead);
    if (appointment) stageLeads.appointment.push(lead);
    if (show) stageLeads.show.push(lead);
    if (sale) stageLeads.sale.push(lead);

    if (appointment && closerOutcomes.includes("No-show")) exits.noShow += 1;
    if (
      callerOutcomes.includes("No interesado") ||
      closerOutcomes.includes("No interesado")
    ) {
      exits.notInterested += 1;
    }
    if (latestCloserOutcome === "Seguimiento") exits.followUp += 1;
  }

  const order = Object.values(CONVERSION_STAGE);
  const stages = order.map((key, index) => {
    const previousKey = order[index - 1];
    const previousCount = previousKey
      ? stageLeads[previousKey].length
      : stageLeads.assigned.length;
    const count = stageLeads[key].length;
    return {
      key,
      label: STAGE_LABELS[key],
      count,
      previousConversion:
        index === 0
          ? 100
          : previousCount === 0
            ? 0
            : roundPercentage((count / previousCount) * 100),
      leads: stageLeads[key].map(({ events: _events, ...lead }) => lead),
    };
  });
  const assigned = stageLeads.assigned.length;

  return {
    stages,
    exits,
    totalConversion:
      assigned === 0
        ? 0
        : roundPercentage((stageLeads.sale.length / assigned) * 100),
  };
}
