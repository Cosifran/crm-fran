import { db, and, eq, isNull, lt, lte, or, sql } from "@crm-fran/db";
import { alerts } from "@crm-fran/db/schema/index";

export async function processRecurringAlerts(now: Date = new Date()) {
	return db.transaction(async (tx) => {
		const dueAlerts = await tx
			.select({ id: alerts.id })
			.from(alerts)
			.where(
				and(
					lte(alerts.nextShowAt, now),
					isNull(alerts.resolvedAt),
					or(
						isNull(alerts.maxOccurrences),
						lt(alerts.occurrences, alerts.maxOccurrences),
					),
				),
			)
			.for("update", { skipLocked: true });

		for (const { id } of dueAlerts) {
			await tx
				.update(alerts)
				.set({
					occurrences: sql`${alerts.occurrences} + 1`,
					nextShowAt: sql`${alerts.nextShowAt} + (${alerts.intervalMinutes} * interval '1 minute')`,
				})
				.where(eq(alerts.id, id));
		}

		return dueAlerts.length;
	});
}
