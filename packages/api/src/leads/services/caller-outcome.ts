export type CallerOutcome =
  | "future_call"
  | "not_fit"
  | "not_interested"
  | "appointment";

export type CallerOutcomeInput = {
  outcome: CallerOutcome;
  closerId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  alertSeverity?: "urgent" | "warning" | "info";
};

export const OUTCOME_LABELS: Record<CallerOutcome, string> = {
  future_call: "Llamar a futuro",
  not_fit: "No encaja",
  not_interested: "No interesado",
  appointment: "Agenda",
};

export function getScheduledAt(
  scheduledDate: string,
  scheduledTime: string,
): Date {
  return new Date(`${scheduledDate}T${scheduledTime}`);
}

export function validateCallerOutcomeInput(
  input: CallerOutcomeInput,
): Record<string, string> | undefined {
  const errors: Record<string, string> = {};

  if (input.outcome === "future_call" || input.outcome === "appointment") {
    if (!input.scheduledDate) errors.scheduledDate = "Required";
    if (!input.scheduledTime) errors.scheduledTime = "Required";

    if (input.scheduledDate && input.scheduledTime) {
      const scheduledAt = getScheduledAt(
        input.scheduledDate,
        input.scheduledTime,
      );
      if (Number.isNaN(scheduledAt.getTime())) {
        errors.scheduledDate = "Invalid date or time";
      } else if (scheduledAt.getTime() <= Date.now()) {
        errors.scheduledDate = "Must be in the future";
      }
    }
  }

  if (input.outcome === "future_call") {
    if (!input.alertSeverity) errors.alertSeverity = "Required";
  }

  if (input.outcome === "appointment" && !input.closerId) {
    errors.closerId = "Required";
  }

  return Object.keys(errors).length > 0 ? errors : undefined;
}
