import { TRPCError } from "@trpc/server";
import { db, eq } from "@crm-fran/db";
import {
  alerts,
  leads,
  ALERT_KIND,
  LEAD_QA_ROLE,
  type LeadQASessionItem,
} from "@crm-fran/db/schema/index";
import { ALERT_KIND_CONFIG } from "../../alerts/services/config";

import type { Context } from "../../context";
import { isCloserOf } from "./is-closer-of";
import { hasPermission } from "../../permissions";

export type RecordCloserAnswersInput = {
  leadId: string;
  isContacted: "Si" | "No";
  scheduledDate?: string;
  scheduledTime?: string;
  questions?: Array<{ questionKey: string; question: string; answer: string }>;
  extraNotes?: string;
};

export async function recordCloserAnswers({
  ctx,
  input,
}: {
  ctx: Context;
  input: RecordCloserAnswersInput;
}) {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const { leadId, isContacted, questions = [] } = input;

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

    if (
      !isCloserOf(lead, ctx.session.user.id) &&
      !hasPermission(ctx.permissions, ["*"])
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the assigned closer can record answers",
      });
    }

    const allItems = (lead.questions ?? []) as LeadQASessionItem[];

    const preservedItems = allItems.filter(
      (item) =>
        !(
          item.authorRole === LEAD_QA_ROLE.CLOSER &&
          item.authorId === ctx.session.user.id
        ),
    );

    const updatedQuestions: LeadQASessionItem[] = questions.map((q) => ({
      ...q,
      authorRole: LEAD_QA_ROLE.CLOSER,
      authorId: ctx.session.user.id,
    }));

    const [updated] = await tx
      .update(leads)
      .set({
        questions: [...preservedItems, ...updatedQuestions],
      })
      .where(eq(leads.id, input.leadId))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update lead",
      });
    }

    let alertId: string | undefined;

    if (isContacted === "No") {
      const config = ALERT_KIND_CONFIG[ALERT_KIND.NO_CONTACT];
      const [alert] = await tx
        .insert(alerts)
        .values({
          id: crypto.randomUUID(),
          leadId,
          targetUserId: ctx.session.user.id,
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
    }

    return { leadId: updated.id, alertId };
  });
}
