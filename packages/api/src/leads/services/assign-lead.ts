import { TRPCError } from "@trpc/server";
import { db, eq } from "@crm-fran/db";
import {
	alerts,
	leads,
	user,
	LEAD_STATE,
	ALERT_KIND,
	LEAD_QA_ROLE,
	type LeadQASessionItem,
} from "@crm-fran/db/schema/index";
import { ALERT_KIND_CONFIG } from "../../alerts/services/config";
import {
  getScheduledAt,
  OUTCOME_LABELS,
  type CallerOutcomeInput,
  validateCallerOutcomeInput,
} from "./caller-outcome";

type LegacyAssignLeadInput = {
	leadId: string;
	isContacted: "Si" | "No";
	closerId?: string;
	scheduledDate?: string;
	scheduledTime?: string;
	questions?: Array<{ questionKey: string; question: string; answer: string }>;
	extraNotes?: string;
};

type OutcomeAssignLeadInput = { leadId: string; isContacted: "Si" } & CallerOutcomeInput & {
  questions?: Array<{ questionKey: string; question: string; answer: string }>;
};

export type AssignLeadInput =
  | OutcomeAssignLeadInput
  | LegacyAssignLeadInput;

export async function assignLead({
	input,
	callerId,
}: {
	input: AssignLeadInput;
	callerId: string;
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
						item.authorRole === LEAD_QA_ROLE.CALLER &&
						item.authorId === callerId
					),
			);
			const outcomeQuestions: LeadQASessionItem[] = [
				{
					questionKey: "callerOutcome",
					question: "¿Qué ha sucedido?",
					answer: OUTCOME_LABELS[input.outcome],
					authorRole: LEAD_QA_ROLE.CALLER,
					authorId: callerId,
				},
			];
			const submittedQuestions = input.questions ?? [];
			outcomeQuestions.push(
				...submittedQuestions
					.filter((question) => question.answer.trim() !== "")
					.map((question) => ({
						...question,
						authorRole: LEAD_QA_ROLE.CALLER,
						authorId: callerId,
					})),
			);

			if (isFutureCall) {
				outcomeQuestions.push(
					{
						questionKey: "scheduledDate",
						question: "Fecha de llamada futura",
						answer: input.scheduledDate,
						authorRole: LEAD_QA_ROLE.CALLER,
						authorId: callerId,
					},
					{
						questionKey: "scheduledTime",
						question: "Hora de llamada futura",
						answer: input.scheduledTime,
						authorRole: LEAD_QA_ROLE.CALLER,
						authorId: callerId,
					},
					{
						questionKey: "alertSeverity",
						question: "Importancia de la alerta",
						answer: input.alertSeverity,
						authorRole: LEAD_QA_ROLE.CALLER,
						authorId: callerId,
					},
				);
			}

			if (isAppointment) {
				outcomeQuestions.push(
					{
						questionKey: "closerId",
						question: "Closer asignado",
						answer: input.closerId,
						authorRole: LEAD_QA_ROLE.CALLER,
						authorId: callerId,
					},
					{
						questionKey: "scheduledDate",
						question: "Fecha de agenda",
						answer: input.scheduledDate,
						authorRole: LEAD_QA_ROLE.CALLER,
						authorId: callerId,
					},
					{
						questionKey: "scheduledTime",
						question: "Hora de agenda",
						answer: input.scheduledTime,
						authorRole: LEAD_QA_ROLE.CALLER,
						authorId: callerId,
					},
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
						item.authorRole === LEAD_QA_ROLE.CALLER &&
						item.authorId === callerId
					),
			);
			const newCallerItems: LeadQASessionItem[] = questions.map((q) => ({
				...q,
				authorRole: LEAD_QA_ROLE.CALLER,
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
						item.authorRole === LEAD_QA_ROLE.CALLER &&
						item.authorId === callerId
					),
			);
			updatedQuestions = [
				...preservedItems,
				{
					questionKey: "isContacted",
					question: existingIsContacted?.question ?? "¿Fué contactado?",
					answer: "No",
					authorRole: LEAD_QA_ROLE.CALLER,
					authorId: callerId,
				},
			];
		}

		const [updated] = await tx
			.update(leads)
			.set({
				state: LEAD_STATE.ASIGNADO,
				callerId,
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

		if (isFutureCall) {
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
					kind: ALERT_KIND.NO_CONTACT,
					message: "Llamar a futuro",
					severity: input.alertSeverity,
					intervalMinutes,
					maxOccurrences: 1,
					nextShowAt: scheduledAt,
					occurrences: 0,
				})
				.returning({ id: alerts.id });

			alertId = alert?.id;
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

		return { leadId: updated.id, alertId };
	});
}
