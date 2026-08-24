import { TRPCError } from "@trpc/server";

import { and, db, eq, gte, inArray, lte, sql } from "@crm-fran/db";
import {
  campaignSpendPeriods,
  leadActivityEvents,
  leads,
  LEAD_ACTIVITY_KIND,
  user,
  type LeadActivityMetadata,
  type LeadQASession,
} from "@crm-fran/db/schema/index";

import {
  buildProfitabilityAnalysis,
  type ProfitabilityLead,
} from "./analysis";

type Activity = {
  leadId: string;
  kind: string;
  description: string | null;
  metadata: LeadActivityMetadata;
  occurredAt: Date;
};

const profileFrom = (questions: LeadQASession) =>
  [...questions]
    .reverse()
    .find(
      (question) =>
        question.questionKey === "profile" ||
        question.questionKey === "subprofile",
    )?.answer ?? null;

const metadataString = (metadata: LeadActivityMetadata, key: string) => {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
};

function latestAssignment(
  events: readonly Activity[],
  kind: string,
  fallbackId: string | null,
) {
  const event = events
    .filter((item) => item.kind === kind)
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0];
  return event ? metadataString(event.metadata, "userId") ?? fallbackId : fallbackId;
}

function outcomeFlags(events: readonly Activity[]) {
  return {
    contacted: events.some(
      (event) =>
        event.kind === LEAD_ACTIVITY_KIND.CALLER_FEEDBACK &&
        event.description !== "Lead no contactado",
    ),
    appointment: events.some(
      (event) =>
        event.kind === LEAD_ACTIVITY_KIND.APPOINTMENT_SCHEDULED ||
        event.kind === LEAD_ACTIVITY_KIND.APPOINTMENT_RESCHEDULED,
    ),
    show: events.some(
      (event) =>
        event.kind === LEAD_ACTIVITY_KIND.CLOSER_FEEDBACK &&
        ["Agenda", "Reagenda", "Seguimiento"].includes(
          event.description ?? "",
        ),
    ),
    sale: events.some(
      (event) =>
        event.kind === LEAD_ACTIVITY_KIND.CLOSER_FEEDBACK &&
        event.description === "Venta",
    ),
  };
}

export const profitabilityService = {
  async overview(input: { from: Date; to: Date }) {
    const spendPeriods = await db
      .select()
      .from(campaignSpendPeriods)
      .where(
        and(
          gte(campaignSpendPeriods.periodStart, input.from),
          lte(campaignSpendPeriods.periodEnd, input.to),
        ),
      );
    const leadRows = await db
      .select({
        id: leads.id,
        profileQuestions: leads.questions,
        source: leads.source,
        campaign: leads.campaign,
        createdAt: leads.createdAt,
        callerId: leads.callerId,
        closerId: leads.closerId,
      })
      .from(leads)
      .where(and(gte(leads.createdAt, input.from), lte(leads.createdAt, input.to)));
    const leadIds = leadRows.map((lead) => lead.id);
    const activities =
      leadIds.length === 0
        ? []
        : await db
            .select({
              leadId: leadActivityEvents.leadId,
              kind: leadActivityEvents.kind,
              description: leadActivityEvents.description,
              metadata: leadActivityEvents.metadata,
              occurredAt: leadActivityEvents.occurredAt,
            })
            .from(leadActivityEvents)
            .where(
              and(
                inArray(leadActivityEvents.leadId, leadIds),
                lte(leadActivityEvents.occurredAt, input.to),
              ),
            );
    const userIds = new Set<string>();
    for (const lead of leadRows) {
      if (lead.callerId) userIds.add(lead.callerId);
      if (lead.closerId) userIds.add(lead.closerId);
    }
    for (const event of activities) {
      const assignmentId = metadataString(event.metadata, "userId");
      if (assignmentId) userIds.add(assignmentId);
    }
    const people =
      userIds.size === 0
        ? []
        : await db
            .select({ id: user.id, name: user.name })
            .from(user)
            .where(inArray(user.id, [...userIds]));
    const names = new Map(people.map((person) => [person.id, person.name]));
    const eventsByLead = new Map<string, Activity[]>();
    for (const event of activities) {
      const current = eventsByLead.get(event.leadId) ?? [];
      current.push(event);
      eventsByLead.set(event.leadId, current);
    }
    const analysisLeads: ProfitabilityLead[] = leadRows.map((lead) => {
      const events = eventsByLead.get(lead.id) ?? [];
      const firstSaleAt = events
        .filter(
          (event) =>
            event.kind === LEAD_ACTIVITY_KIND.CLOSER_FEEDBACK &&
            event.description === "Venta",
        )
        .sort(
          (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
        )[0]?.occurredAt;
      const assignmentEvents = firstSaleAt
        ? events.filter((event) => event.occurredAt <= firstSaleAt)
        : events;
      const callerId = latestAssignment(
        assignmentEvents,
        LEAD_ACTIVITY_KIND.CALLER_ASSIGNED,
        lead.callerId,
      );
      const closerId = latestAssignment(
        assignmentEvents,
        LEAD_ACTIVITY_KIND.CLOSER_ASSIGNED,
        lead.closerId,
      );
      return {
        id: lead.id,
        profile: profileFrom(lead.profileQuestions),
        source: lead.source,
        campaign: lead.campaign,
        createdAt: lead.createdAt,
        callerId,
        callerName: callerId ? names.get(callerId) ?? callerId : null,
        closerId,
        closerName: closerId ? names.get(closerId) ?? closerId : null,
        ...outcomeFlags(events),
      };
    });
    const campaignOptions = [
      ...new Map(
        leadRows
          .filter(
            (lead): lead is typeof lead & { source: string; campaign: string } =>
              Boolean(lead.source && lead.campaign),
          )
          .map((lead) => [
            `${lead.source}\u0000${lead.campaign}`,
            { source: lead.source, campaign: lead.campaign },
          ]),
      ).values(),
    ].sort(
      (left, right) =>
        left.source.localeCompare(right.source) ||
        left.campaign.localeCompare(right.campaign),
    );

    return {
      ...buildProfitabilityAnalysis({
        from: input.from,
        to: input.to,
        spendPeriods,
        leads: analysisLeads,
      }),
      spendPeriods,
      campaignOptions,
    };
  },

  async saveSpend(input: {
    id?: string;
    source: string;
    campaign: string;
    periodStart: Date;
    periodEnd: Date;
    spendCents: number;
    referenceSaleValueCents: number;
    actorId: string;
  }) {
    return db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${input.source}), hashtext(${input.campaign}))`,
      );
      const overlaps = await transaction
        .select({ id: campaignSpendPeriods.id })
        .from(campaignSpendPeriods)
        .where(
          and(
            eq(campaignSpendPeriods.source, input.source),
            eq(campaignSpendPeriods.campaign, input.campaign),
            lte(campaignSpendPeriods.periodStart, input.periodEnd),
            gte(campaignSpendPeriods.periodEnd, input.periodStart),
          ),
        );
      if (overlaps.some((period) => period.id !== input.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Ya existe un gasto solapado para esta fuente y campaña.",
        });
      }
      const values = {
        source: input.source,
        campaign: input.campaign,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        spendCents: input.spendCents,
        referenceSaleValueCents: input.referenceSaleValueCents,
        updatedAt: new Date(),
      };
      if (input.id) {
        const [updated] = await transaction
          .update(campaignSpendPeriods)
          .set(values)
          .where(eq(campaignSpendPeriods.id, input.id))
          .returning();
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Gasto publicitario no encontrado.",
          });
        }
        return updated;
      }
      const [created] = await transaction
        .insert(campaignSpendPeriods)
        .values({
          id: crypto.randomUUID(),
          ...values,
          createdById: input.actorId,
        })
        .returning();
      return created!;
    });
  },

  async deleteSpend(id: string) {
    const deleted = await db
      .delete(campaignSpendPeriods)
      .where(eq(campaignSpendPeriods.id, id))
      .returning({ id: campaignSpendPeriods.id });
    return { deleted: deleted.length > 0 };
  },
};
