import { db, isNull } from "@crm-fran/db";
import { alerts } from "@crm-fran/db/schema/index";
import type { Permission } from "@crm-fran/db/schema/auth";

interface CountAlertsInput {
	actorId: string;
	permissions: Permission[];
}

export async function countAlerts(_input: CountAlertsInput): Promise<number> {
	const rows = await db.query.alerts.findMany({
		where: (_fields, { and }) =>
			and(
				...[
					isNull(alerts.dismissedAt),
					isNull(alerts.resolvedAt),
				],
			),
		columns: { id: true },
	});

	return rows.length;
}
