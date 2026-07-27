import { ALERT_SEVERITY, ALERT_KIND } from "@crm-fran/db/schema/index";

export const ALERT_KIND_CONFIG = {
	[ALERT_KIND.NO_CONTACT]: {
		intervalMinutes: 1440,
		maxOccurrences: null as number | null,
		severity: ALERT_SEVERITY.HIGH,
		message: "No se pudo contactar al lead",
	},
	[ALERT_KIND.FOLLOW_UP]: {
		intervalMinutes: 60,
		maxOccurrences: null as number | null,
		severity: ALERT_SEVERITY.INFO,
		message: "Seguimiento de lead asignado",
	},
} as const;

export type AlertKind = keyof typeof ALERT_KIND_CONFIG;
