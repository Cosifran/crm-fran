import { TRPCError } from "@trpc/server";

import { db } from "@crm-fran/db";
import { leads, type LeadType } from "@crm-fran/db/schema/index";

export type CreateLeadInput = {
  name: string;
  email: string;
  phone: string;
  type: LeadType;
};

export async function createLead(input: CreateLeadInput) {
  const [lead] = await db
    .insert(leads)
    .values({ id: crypto.randomUUID(), ...input })
    .returning();

  if (!lead) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create lead",
    });
  }

  return lead;
}
