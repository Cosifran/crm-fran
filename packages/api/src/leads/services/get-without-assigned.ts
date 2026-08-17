import { and, eq, isNull } from "@crm-fran/db";
import { leads, type LeadType } from "@crm-fran/db/schema/index";
import { selectLeadWithUsers } from "../queries/index";

export async function getWithoutAssigned({ type }: { type: LeadType }) {
  return selectLeadWithUsers(
    and(
      isNull(leads.callerId),
      isNull(leads.closerId),
      eq(leads.type, type),
    ),
  );
}
