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

export type AssignLeadInput = {
	leadId: string;
	isContacted: "yes" | "no";
	closerId?: string;
	scheduledDate?: string;
	scheduledTime?: string;
	questions?: Array<{ question: string; answer: string }>;
	extraNotes?: string;
};

export async function assignLead({
	input,
	callerId,
}: {
	input: AssignLeadInput;
	callerId: string;
}) {
	const { leadId, isContacted, closerId, questions = [] } = input;

	return db.transaction(async (tx) => {
		const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId));

		if (!lead) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Lead not found",
			});
		}

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

		const updatedQuestions: LeadQASessionItem[] =
			isContacted === "yes"
				? questions.map((q) => ({
						...q,
						authorRole: LEAD_QA_ROLE.CALLER,
						authorId: callerId,
					}))
				: (lead.questions as LeadQASessionItem[]) ?? [];

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

		if (isContacted === "no") {
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
		} else if (isContacted === "yes" && closerId) {
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
