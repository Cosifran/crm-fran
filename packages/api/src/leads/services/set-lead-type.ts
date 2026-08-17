import { TRPCError } from "@trpc/server";

import { db, eq } from "@crm-fran/db";
import { leads, type LeadType } from "@crm-fran/db/schema/index";

export async function setLeadType({
  id,
  type,
}: {
  id: string;
  type: LeadType;
}) {
  const [lead] = await db
    .update(leads)
    .set({ type })
    .where(eq(leads.id, id))
    .returning();

  if (!lead) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  }

  return lead;
}
