import { TRPCError } from "@trpc/server";
import { db, eq } from "@crm-fran/db";
import {
	leads,
	LEAD_QA_ROLE,
	type LeadQASessionItem,
} from "@crm-fran/db/schema/index";

import type { Context } from "../../context";
import { isCloserOf } from "./is-closer-of";
import { partitionQASession } from "./partition-qa-session";

type Lead = typeof leads.$inferSelect;

export type RecordCloserAnswersInput = {
	leadId: string;
	items: LeadQASessionItem[];
};

export async function recordCloserAnswers({
	ctx,
	input,
}: {
	ctx: Context;
	input: RecordCloserAnswersInput;
}): Promise<Lead> {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
	}

	return db.transaction(async (tx) => {
		const [lead] = await tx
			.select()
			.from(leads)
			.where(eq(leads.id, input.leadId));

		if (!lead) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Lead not found",
			});
		}

		if (!isCloserOf(lead, ctx.session.user.id)) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only the assigned closer can record answers",
			});
		}

		const allItems = (lead.questions ?? []) as LeadQASessionItem[];

		// Per SH-LEADQA-002: only items where authorRole === "closer" AND authorId === current user
		// are replaced. Caller items are immutable. Other closers' items (forward-compat) are preserved.
		const preservedItems = allItems.filter(
			(item) =>
				!(
					item.authorRole === LEAD_QA_ROLE.CLOSER &&
					item.authorId === ctx.session.user.id
				),
		);

		const closerItems: LeadQASessionItem[] = input.items.map((item) => ({
			...item,
			authorRole: LEAD_QA_ROLE.CLOSER,
			authorId: ctx.session.user.id,
		}));

		const [updated] = await tx
			.update(leads)
			.set({
				questions: [...preservedItems, ...closerItems],
			})
			.where(eq(leads.id, input.leadId))
			.returning();

		if (!updated) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to update lead",
			});
		}

		return updated;
	});
}
