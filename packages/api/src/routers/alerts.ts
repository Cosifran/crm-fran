import { z } from "zod";
import { router, protectedProcedure } from "../index";
import { permittedProcedure } from "@crm-fran/api/trpc/trpc";
import {
	createAlert,
	countAlerts,
	dismissAlert,
	listAlerts,
	resolveAlert,
	processRecurringAlerts,
	getAlertPreferences,
	updateAlertPreferences,
} from "../alerts/services/index";
import {
	ALERT_KIND,
	ALERT_RELEVANCE_MODE,
	ALERT_SEVERITY,
} from "@crm-fran/db/schema/index";

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

export const alertPreferencesInput = z
	.object({
		relevanceMode: z.nativeEnum(ALERT_RELEVANCE_MODE),
		urgentThresholdHours: z.number().int().min(0).max(720),
		warningThresholdHours: z.number().int().min(1).max(720),
		noContactSeverity: z.nativeEnum(ALERT_SEVERITY),
		followUpSeverity: z.nativeEnum(ALERT_SEVERITY),
		futureCallSeverity: z.nativeEnum(ALERT_SEVERITY),
		appointmentSeverity: z.nativeEnum(ALERT_SEVERITY),
		rescheduledSeverity: z.nativeEnum(ALERT_SEVERITY),
	})
	.refine(
		(value) => value.warningThresholdHours > value.urgentThresholdHours,
		{
			message: "Warning threshold must be greater than urgent threshold",
			path: ["warningThresholdHours"],
		},
	);

export const alertsRouter = router({
	getPreferences: protectedProcedure.query(async ({ ctx }) => {
		return await getAlertPreferences(ctx.session.user.id);
	}),

	updatePreferences: protectedProcedure
		.input(alertPreferencesInput)
		.mutation(async ({ ctx, input }) => {
			return await updateAlertPreferences(ctx.session.user.id, input);
		}),

	createAlert: permittedProcedure(["alerts:write"])
		.input(createAlertInput)
		.mutation(async ({ input }) => {
			return await createAlert(input);
		}),

	countAlerts: permittedProcedure(["alerts:read"]).query(async ({ ctx }) => {
		return await countAlerts({
			actorId: ctx.session.user.id,
			permissions: ctx.permissions,
		});
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

	advanceRecurringAlerts: protectedProcedure.query(async ({ ctx }) => {
		return await processRecurringAlerts(new Date(), ctx.session.user.id);
	}),
});
