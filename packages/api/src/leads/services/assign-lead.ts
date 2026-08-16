import { TRPCError } from "@trpc/server";
import { and, db, eq, inArray, isNull } from "@crm-fran/db";
import {
	alerts,
	leads,
	user,
	LEAD_STATE,
	ALERT_KIND,
	LEAD_QA_ROLE,
	type LeadQASessionItem,
} from "@crm-fran/db/schema/index";
import type { Permission } from "@crm-fran/db/schema/auth";
import { ALERT_KIND_CONFIG } from "../../alerts/services/config";
import { hasPermission } from "../../permissions";
import {
  buildAppointmentTrackingQuestions,
  getScheduledAt,
  OUTCOME_LABELS,
  type CallerOutcomeInput,
  validateCallerOutcomeInput,
} from "./caller-outcome";

type LegacyAssignLeadInput = {
	leadId: string;
	sourceAlertId?: string;
	isContacted: "Si" | "No";
	closerId?: string;
	scheduledDate?: string;
	scheduledTime?: string;
	questions?: Array<{ questionKey: string; question: string; answer: string }>;
	extraNotes?: string;
};

type OutcomeAssignLeadInput = { leadId: string; sourceAlertId?: string; isContacted: "Si" } & CallerOutcomeInput & {
  questions?: Array<{ questionKey: string; question: string; answer: string }>;
};

export type AssignLeadInput =
  | OutcomeAssignLeadInput
  | LegacyAssignLeadInput;

export async function assignLead({
	input,
	callerId,
	authorRole = LEAD_QA_ROLE.CALLER,
	permissions = [],
}: {
	input: AssignLeadInput;
	callerId: string;
	authorRole?: "caller" | "closer";
	permissions?: Permission[];
}) {
  const leadId = input.leadId;
  const isOutcomeInput = "outcome" in input;
  const isLegacyInput = !isOutcomeInput;
  const isAppointment = isOutcomeInput && input.outcome === "appointment";
  const isFutureCall = isOutcomeInput && input.outcome === "future_call";

  if (isOutcomeInput) {
    const validationErrors = validateCallerOutcomeInput(input);
    if (validationErrors) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: Object.entries(validationErrors)
          .map(([field, error]) => `${field}: ${error}`)
          .join(", "),
      });
    }
  }

	return db.transaction(async (tx) => {
		let sourceAlertTargetUserId: string | null | undefined;

		if (input.sourceAlertId) {
			const [sourceAlert] = await tx
				.select()
				.from(alerts)
				.where(eq(alerts.id, input.sourceAlertId));

			if (!sourceAlert || sourceAlert.leadId !== leadId) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
			}
			sourceAlertTargetUserId = sourceAlert.targetUserId;

			if (sourceAlert.resolvedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Alert is already resolved",
				});
			}
		}

		const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId));

		if (!lead) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Lead not found",
			});
		}

    const closerId = isLegacyInput
      ? input.closerId
      : isAppointment
        ? input.closerId
        : undefined;

    if (closerId) {
			const [closer] = await tx
				.select({ id: user.id })
				.from(user)
				.where(eq(user.id, closerId));

			if (!closer) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Closer does not exist",
				});
			}
		}

		let updatedQuestions: LeadQASessionItem[];

		if (isOutcomeInput) {
			const existingItems = (lead.questions as LeadQASessionItem[]) ?? [];
			const preservedItems = existingItems.filter(
				(item) =>
					!(
						item.authorRole === authorRole &&
						item.authorId === callerId
					),
			);
			const outcomeQuestions: LeadQASessionItem[] = [
				{
					questionKey: "callerOutcome",
					question: "¿Qué ha sucedido?",
					answer: OUTCOME_LABELS[input.outcome],
					authorRole: authorRole,
					authorId: callerId,
				},
			];
			const submittedQuestions = input.questions ?? [];
			outcomeQuestions.push(
				...submittedQuestions
					.filter((question) => question.answer.trim() !== "")
					.map((question) => ({
						...question,
						authorRole: authorRole,
						authorId: callerId,
					})),
			);

			if (
				isFutureCall &&
				input.scheduledDate &&
				input.scheduledTime &&
				input.alertSeverity
			) {
				outcomeQuestions.push(
					{
						questionKey: "scheduledDate",
						question: "Fecha de llamada futura",
						answer: input.scheduledDate,
						authorRole: authorRole,
						authorId: callerId,
					},
					{
						questionKey: "scheduledTime",
						question: "Hora de llamada futura",
						answer: input.scheduledTime,
						authorRole: authorRole,
						authorId: callerId,
					},
					{
						questionKey: "alertSeverity",
						question: "Importancia de la alerta",
						answer: input.alertSeverity,
						authorRole: authorRole,
						authorId: callerId,
					},
				);
			}

			if (
				isAppointment &&
				input.scheduledDate &&
				input.scheduledTime &&
				input.closerId
			) {
					const trackingQuestions = buildAppointmentTrackingQuestions({
						existingQuestions: existingItems,
						callerId,
						scheduledDate: input.scheduledDate,
						scheduledTime: input.scheduledTime,
						changedAt: new Date().toISOString(),
					});
					outcomeQuestions.push(
					{
						questionKey: "closerId",
						question: "Closer asignado",
						answer: input.closerId,
						authorRole: authorRole,
						authorId: callerId,
					},
					{
						questionKey: "scheduledDate",
						question: "Fecha de agenda",
						answer: input.scheduledDate,
						authorRole: authorRole,
						authorId: callerId,
					},
					{
						questionKey: "scheduledTime",
						question: "Hora de agenda",
						answer: input.scheduledTime,
						authorRole: authorRole,
						authorId: callerId,
						},
						...trackingQuestions.map((question) => ({
							...question,
							authorRole: authorRole,
							authorId: callerId,
						})),
					);
			}

			updatedQuestions = [...preservedItems, ...outcomeQuestions];
		} else if (input.isContacted === "Si") {
			const questions = input.questions ?? [];
			// Partition-preserving upsert: remove only current caller's items, keep closer + other callers
			const existingItems = (lead.questions as LeadQASessionItem[]) ?? [];
			const preservedItems = existingItems.filter(
				(item) =>
					!(
						item.authorRole === authorRole &&
						item.authorId === callerId
					),
			);
			const newCallerItems: LeadQASessionItem[] = questions.map((q) => ({
				...q,
				authorRole: authorRole,
				authorId: callerId,
			}));
			updatedQuestions = [...preservedItems, ...newCallerItems];
		} else {
			const existingItems = (lead.questions as LeadQASessionItem[]) ?? [];
			const existingIsContacted = existingItems.find(
				(item) => item.questionKey === "isContacted",
			);
			const preservedItems = existingItems.filter(
				(item) =>
					!(
						item.questionKey === "isContacted" &&
						item.authorRole === authorRole &&
						item.authorId === callerId
					),
			);
			updatedQuestions = [
				...preservedItems,
				{
					questionKey: "isContacted",
					question: existingIsContacted?.question ?? "¿Fué contactado?",
					answer: "No",
					authorRole: authorRole,
					authorId: callerId,
				},
			];
		}

		if (
			input.sourceAlertId &&
			!hasPermission(permissions, ["*"]) &&
			sourceAlertTargetUserId !== callerId &&
			lead.callerId !== callerId
		) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You do not have permission to resolve this alert",
			});
		}

		const [updated] = await tx
			.update(leads)
			.set({
				state: LEAD_STATE.ASIGNADO,
				callerId:
					authorRole === LEAD_QA_ROLE.CLOSER ? lead.callerId : callerId,
				closerId: closerId ?? lead.closerId,
				questions: updatedQuestions,
			})
			.where(eq(leads.id, leadId))
			.returning();

		if (!updated) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to update lead",
			});
		}

		let alertId: string | undefined;

		if (
			isFutureCall &&
			input.scheduledDate &&
			input.scheduledTime &&
			input.alertSeverity
		) {
			const scheduledAt = getScheduledAt(input.scheduledDate, input.scheduledTime);
			const intervalMinutes = Math.max(
				1,
				Math.ceil((scheduledAt.getTime() - Date.now()) / 60_000),
			);
			const [alert] = await tx
				.insert(alerts)
				.values({
					id: crypto.randomUUID(),
					leadId,
					targetUserId: callerId,
					kind: ALERT_KIND.FUTURE_CALL,
					message: "Llamar a futuro",
					severity: input.alertSeverity,
					intervalMinutes,
					maxOccurrences: 1,
					nextShowAt: scheduledAt,
					occurrences: 0,
				})
				.returning({ id: alerts.id });

			alertId = alert?.id;
		} else if (
			isAppointment &&
			input.scheduledDate &&
			input.scheduledTime &&
			input.closerId
		) {
				const scheduledAt = getScheduledAt(input.scheduledDate, input.scheduledTime);
				const intervalMinutes = Math.max(
					1,
					Math.ceil((scheduledAt.getTime() - Date.now()) / 60_000),
				);
				const isRescheduled = updatedQuestions.some(
					(question) =>
						question.questionKey === "appointmentRescheduled" &&
						question.authorRole === authorRole &&
						question.authorId === callerId &&
						question.answer === "Si",
				);
				const kind = isRescheduled
					? ALERT_KIND.RESCHEDULED
					: ALERT_KIND.APPOINTMENT;
				const config = ALERT_KIND_CONFIG[kind];
				const [existingAlert] = await tx
					.select({ id: alerts.id })
					.from(alerts)
					.where(
						and(
							eq(alerts.leadId, leadId),
							inArray(alerts.kind, [
								ALERT_KIND.APPOINTMENT,
								ALERT_KIND.RESCHEDULED,
							]),
							isNull(alerts.dismissedAt),
							isNull(alerts.resolvedAt),
						),
					)
					.limit(1);

				if (existingAlert) {
					await tx
						.update(alerts)
						.set({
							targetUserId: input.closerId,
							kind,
							message: config.message,
							severity: config.severity,
							intervalMinutes,
							maxOccurrences: 1,
							nextShowAt: scheduledAt,
							occurrences: 0,
						})
						.where(eq(alerts.id, existingAlert.id));
					alertId = existingAlert.id;
				} else {
					const [alert] = await tx
						.insert(alerts)
						.values({
							id: crypto.randomUUID(),
							leadId,
							targetUserId: input.closerId,
							kind,
							message: config.message,
							severity: config.severity,
							intervalMinutes,
							maxOccurrences: 1,
							nextShowAt: scheduledAt,
							occurrences: 0,
						})
						.returning({ id: alerts.id });
					alertId = alert?.id;
				}
		} else if (isLegacyInput && input.isContacted === "No") {
			const config = ALERT_KIND_CONFIG[ALERT_KIND.NO_CONTACT];
			const [alert] = await tx
				.insert(alerts)
				.values({
					id: crypto.randomUUID(),
					leadId,
					targetUserId: callerId,
					kind: ALERT_KIND.NO_CONTACT,
					message: config.message,
					severity: config.severity,
					intervalMinutes: config.intervalMinutes,
					maxOccurrences: config.maxOccurrences,
					nextShowAt: new Date(Date.now() + config.intervalMinutes * 60_000),
					occurrences: 0,
				})
				.returning({ id: alerts.id });

			alertId = alert?.id;
		} else if (isLegacyInput && input.isContacted === "Si" && closerId) {
			const config = ALERT_KIND_CONFIG[ALERT_KIND.FOLLOW_UP];
			await tx.insert(alerts).values({
				id: crypto.randomUUID(),
				leadId,
				targetUserId: closerId,
				kind: ALERT_KIND.FOLLOW_UP,
				message: config.message,
				severity: config.severity,
				intervalMinutes: config.intervalMinutes,
				maxOccurrences: config.maxOccurrences,
				nextShowAt: new Date(Date.now() + config.intervalMinutes * 60_000),
				occurrences: 0,
			});
		}

		if (input.sourceAlertId && alertId !== input.sourceAlertId) {
			await tx
				.update(alerts)
				.set({ resolvedAt: new Date() })
				.where(eq(alerts.id, input.sourceAlertId));
		}

		return { leadId: updated.id, alertId };
	});
}
