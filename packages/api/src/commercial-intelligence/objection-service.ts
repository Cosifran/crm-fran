import { db, lte } from "@crm-fran/db";
import { leadActivityEvents, LEAD_ACTIVITY_KIND } from "@crm-fran/db/schema/index";
import { getAuthoritativeConversionMilestones } from "../dashboard/conversion-funnel";
import { buildObjectionMotivationIntelligence } from "./objection-intelligence";

export async function getObjectionMotivationIntelligence(input: { from: Date; to: Date; actorId: string | null }) {
  const activities = await db.select({ id: leadActivityEvents.id, leadId: leadActivityEvents.leadId, actorId: leadActivityEvents.actorId, kind: leadActivityEvents.kind, occurredAt: leadActivityEvents.occurredAt, metadata: leadActivityEvents.metadata, description: leadActivityEvents.description }).from(leadActivityEvents).where(lte(leadActivityEvents.occurredAt, input.to));
  const events = activities.map((event) => ({ ...event, description: event.description ?? null, metadata: event.metadata ?? {} }));
  const outcomes = events.flatMap((event) => getAuthoritativeConversionMilestones([event]).map((milestone) => ({
    leadId: event.leadId,
    kind: milestone.kind,
    occurredAt: milestone.occurredAt,
  })));
  return buildObjectionMotivationIntelligence({
    activities: events.filter((event) => event.kind === LEAD_ACTIVITY_KIND.LEAD_CREATED || event.kind === LEAD_ACTIVITY_KIND.LEAD_ATTRIBUTION_UPDATED || (event.kind === LEAD_ACTIVITY_KIND.CALLER_FEEDBACK && event.occurredAt >= input.from)),
    outcomes,
    actorId: input.actorId,
  });
}
