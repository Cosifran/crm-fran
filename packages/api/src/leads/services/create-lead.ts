import { TRPCError } from "@trpc/server";

import { db } from "@crm-fran/db";
import {
  leads,
  LEAD_ACTIVITY_KIND,
  type LeadType,
} from "@crm-fran/db/schema/index";
import { appendLeadActivity } from "./lead-activity";

export type CreateLeadInput = {
  name: string;
  email: string;
  phone: string;
  source?: string;
  campaign?: string;
  type: LeadType;
};

export async function createLead(input: CreateLeadInput) {
  return db.transaction(async (tx) => {
    const [lead] = await tx
      .insert(leads)
      .values({ id: crypto.randomUUID(), ...input })
      .returning();

    if (!lead) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create lead",
      });
    }

    await appendLeadActivity(tx, {
      leadId: lead.id,
      kind: LEAD_ACTIVITY_KIND.LEAD_CREATED,
      title: "Lead creado",
      description: `Lead ${lead.name} incorporado al CRM`,
	      metadata: {
	        type: lead.type,
	        source: lead.source,
	        campaign: lead.campaign,
	      },
      dedupeKey: `lead_created:${lead.id}`,
      occurredAt: lead.createdAt,
    });

    return lead;
  });
}
