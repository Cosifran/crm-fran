import { TRPCError } from "@trpc/server";
import { db, eq } from "@crm-fran/db";
import { leads, type LeadQASessionItem } from "@crm-fran/db/schema/index";

import { hasPermission } from "../../permissions";
import type { Context } from "../../context";

export type AdminEditLeadQASessionInput = {
  leadId: string;
  isContacted: "yes" | "no";
  scheduledDate?: string;
  scheduledTime?: string;
  questions?: Array<{ question: string; answer: string }>;
  extraNotes?: string;
};

export async function adminEditLeadQASession({
  ctx,
  input,
}: {
  ctx: Context;
  input: AdminEditLeadQASessionInput;
}) {
  return db.transaction(async (tx) => {
    if (!hasPermission(ctx.permissions, ["*"])) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin permission required",
      });
    }

    const { leadId, questions = [] } = input;

    const [lead] = await tx
      .select()
      .from(leads)
      .where(eq(leads.id, leadId));

    if (!lead) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Lead not found",
      });
    }

    const [updated] = await tx
      .update(leads)
      .set({
        questions: questions as LeadQASessionItem[],
      })
      .where(eq(leads.id, leadId))
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
