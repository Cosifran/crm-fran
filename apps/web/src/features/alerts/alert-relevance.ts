import { getAlertCountdownRemaining } from "./alert-countdown";
import { normalizeAlertSeverity } from "./alert-importance";

const HOUR_MS = 60 * 60 * 1000;

export type AlertRelevanceMode = "condition" | "time";
export type ConfigurableAlertKind =
  | "no_contact"
  | "follow_up"
  | "future_call"
  | "appointment"
  | "rescheduled";
export type AlertRelevanceSeverity = "info" | "warning" | "urgent";

export type AlertRelevancePreferences = {
  mode: AlertRelevanceMode;
  urgentThresholdHours: number;
  warningThresholdHours: number;
  conditionSeverities: Record<ConfigurableAlertKind, AlertRelevanceSeverity>;
};

export const DEFAULT_ALERT_RELEVANCE_PREFERENCES: AlertRelevancePreferences = {
  mode: "condition",
  urgentThresholdHours: 2,
  warningThresholdHours: 6,
  conditionSeverities: {
    no_contact: "urgent",
    follow_up: "info",
    future_call: "info",
    appointment: "info",
    rescheduled: "info",
  },
};

type AlertForRelevance = {
  kind: string;
  severity: string;
  createdAt: Date | string;
};

export function getEffectiveAlertSeverity(
  alert: AlertForRelevance,
  preferences: AlertRelevancePreferences,
  now = Date.now(),
) {
  if (preferences.mode === "condition") {
    if (alert.kind in preferences.conditionSeverities) {
      return preferences.conditionSeverities[alert.kind as ConfigurableAlertKind];
    }
    return normalizeAlertSeverity(alert.severity);
  }

  const remaining = getAlertCountdownRemaining(alert.createdAt, alert.kind, now);
  if (remaining <= preferences.urgentThresholdHours * HOUR_MS) return "urgent";
  if (remaining <= preferences.warningThresholdHours * HOUR_MS) return "warning";
  return "info";
}
