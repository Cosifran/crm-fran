import { db, and, asc, eq, isNull, type SQL } from "@crm-fran/db";
import { alerts } from "@crm-fran/db/schema/index";
import type { Permission } from "@crm-fran/db/schema/auth";

export type ListAlertsInput = {
	actorId: string;
	permissions: Permission[];
	leadId?: string;
	targetUserId?: string;
	includeDismissed?: boolean;
	includeResolved?: boolean;
	limit?: number;
	offset?: number;
};

export async function listAlerts(input: ListAlertsInput) {
	const limit = Math.min(input.limit ?? 50, 100);
	const offset = input.offset ?? 0;
	const isAdmin =
		input.permissions.includes("*") ||
		input.permissions.includes("alerts:*") ||
		input.permissions.includes("users:read");

	const conditions: SQL<unknown>[] = [];

	if (input.leadId) {
		conditions.push(eq(alerts.leadId, input.leadId));
	}

	if (input.targetUserId) {
		conditions.push(eq(alerts.targetUserId, input.targetUserId));
	}

	if (!isAdmin) {
		conditions.push(eq(alerts.targetUserId, input.actorId));
	}

	if (!input.includeDismissed) {
		conditions.push(isNull(alerts.dismissedAt));
	}

	if (!input.includeResolved) {
		conditions.push(isNull(alerts.resolvedAt));
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	return db
		.select()
		.from(alerts)
		.where(where)
		.orderBy(asc(alerts.nextShowAt))
		.limit(limit)
		.offset(offset);
}
