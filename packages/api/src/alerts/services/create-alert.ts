import { db } from "@crm-fran/db";
import { alerts, type AlertKind, type AlertSeverity } from "@crm-fran/db/schema/index";
import { ALERT_KIND_CONFIG } from "./config";

export type CreateAlertInput = {
	leadId: string;
	targetUserId?: string;
	kind: AlertKind;
	message?: string;
	severity?: AlertSeverity;
	intervalMinutes?: number;
	maxOccurrences?: number | null;
};

export async function createAlert(input: CreateAlertInput) {
	const config = ALERT_KIND_CONFIG[input.kind];
	const intervalMinutes = input.intervalMinutes ?? config.intervalMinutes;

	const [alert] = await db
		.insert(alerts)
		.values({
			id: crypto.randomUUID(),
			leadId: input.leadId,
			targetUserId: input.targetUserId,
			kind: input.kind,
			message: input.message ?? config.message,
			severity: input.severity ?? config.severity,
			intervalMinutes,
			maxOccurrences: input.maxOccurrences ?? config.maxOccurrences,
			nextShowAt: new Date(Date.now() + intervalMinutes * 60_000),
			occurrences: 0,
		})
		.returning();

	return alert;
}
