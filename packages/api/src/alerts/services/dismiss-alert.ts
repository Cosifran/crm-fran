import { TRPCError } from "@trpc/server";
import { db, eq } from "@crm-fran/db";
import { alerts } from "@crm-fran/db/schema/index";
import type { Permission } from "@crm-fran/db/schema/auth";

export type DismissAlertInput = {
	id: string;
	actorId: string;
	permissions: Permission[];
};

function isAdmin(permissions: Permission[]) {
	return permissions.includes("alerts:*") || permissions.includes("users:read");
}

export async function dismissAlert(input: DismissAlertInput) {
	const alert = await db.query.alerts.findFirst({
		where: (table, { eq }) => eq(table.id, input.id),
	});

	if (!alert) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Alert not found",
		});
	}

	if (!isAdmin(input.permissions) && alert.targetUserId !== input.actorId) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You do not have permission to dismiss this alert",
		});
	}

	if (alert.resolvedAt) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Alert is already resolved",
		});
	}

	const [updated] = await db
		.update(alerts)
		.set({
			dismissedAt: new Date(),
			dismissedBy: input.actorId,
		})
		.where(eq(alerts.id, input.id))
		.returning();

	return updated;
}
