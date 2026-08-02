import { db, and, eq, isNull } from "@crm-fran/db";
import { alerts } from "@crm-fran/db/schema/index";
import type { Permission } from "@crm-fran/db/schema/auth";

interface CountAlertsInput {
	actorId: string;
	permissions: Permission[];
}

export async function countAlerts(input: CountAlertsInput): Promise<number> {
	const isAdmin =
		input.permissions.includes("*") ||
		input.permissions.includes("alerts:*") ||
		input.permissions.includes("users:read");

	const rows = await db.query.alerts.findMany({
		where: (_fields, { and }) =>
			and(
				...[
					isNull(alerts.dismissedAt),
					isNull(alerts.resolvedAt),
					...(!isAdmin ? [eq(alerts.targetUserId, input.actorId)] : []),
				],
			),
		columns: { id: true },
	});

	return rows.length;
}