import { TRPCError } from "@trpc/server";
import { db, eq } from "@crm-fran/db";
import { leads, type LeadQASessionItem } from "@crm-fran/db/schema/index";

import type { Context } from "../../context";

type Lead = typeof leads.$inferSelect;

export type AdminEditLeadQASessionInput = {
	leadId: string;
	items: LeadQASessionItem[];
};

export async function adminEditLeadQASession({
	ctx,
	input,
}: {
	ctx: Context;
	input: AdminEditLeadQASessionInput;
}): Promise<Lead> {
	return db.transaction(async (tx) => {
		if (!ctx.permissions.includes("*")) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Admin permission required",
			});
		}

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

		const [updated] = await tx
			.update(leads)
			.set({
				questions: input.items,
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
