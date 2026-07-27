import { z } from "zod";
import { router } from "../index";
import { permittedProcedure } from "@crm-fran/api/trpc/trpc";
import {
	createAlert,
	dismissAlert,
	listAlerts,
	resolveAlert,
} from "../alerts/services/index";
import { ALERT_KIND, ALERT_SEVERITY } from "@crm-fran/db/schema/index";

const createAlertInput = z.object({
	leadId: z.string().min(1),
	targetUserId: z.string().min(1).optional(),
	kind: z.nativeEnum(ALERT_KIND),
	message: z.string().min(1).optional(),
	severity: z.nativeEnum(ALERT_SEVERITY).optional(),
	intervalMinutes: z.number().int().positive().optional(),
	maxOccurrences: z.number().int().positive().nullish(),
});

const listAlertsInput = z
	.object({
		leadId: z.string().min(1).optional(),
		targetUserId: z.string().min(1).optional(),
		includeDismissed: z.boolean().default(false),
		includeResolved: z.boolean().default(false),
		limit: z.number().int().positive().max(100).optional(),
		offset: z.number().int().nonnegative().optional(),
	})
	.optional();

const alertIdInput = z.object({
	id: z.string().min(1),
});

export const alertsRouter = router({
	createAlert: permittedProcedure(["alerts:write"])
		.input(createAlertInput)
		.mutation(async ({ ctx, input }) => {
			return await createAlert(input);
		}),

	listAlerts: permittedProcedure(["alerts:read"])
		.input(listAlertsInput)
		.query(async ({ ctx, input }) => {
			return await listAlerts({
				actorId: ctx.session.user.id,
				permissions: ctx.permissions,
				leadId: input?.leadId,
				targetUserId: input?.targetUserId,
				includeDismissed: input?.includeDismissed,
				includeResolved: input?.includeResolved,
				limit: input?.limit,
				offset: input?.offset,
			});
		}),

	dismissAlert: permittedProcedure(["alerts:write"])
		.input(alertIdInput)
		.mutation(async ({ ctx, input }) => {
			return await dismissAlert({
				id: input.id,
				actorId: ctx.session.user.id,
				permissions: ctx.permissions,
			});
		}),

	resolveAlert: permittedProcedure(["alerts:write"])
		.input(alertIdInput)
		.mutation(async ({ ctx, input }) => {
			return await resolveAlert({
				id: input.id,
				actorId: ctx.session.user.id,
				permissions: ctx.permissions,
			});
		}),
});
