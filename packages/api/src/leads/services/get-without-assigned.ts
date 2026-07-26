import { and, isNull } from "@crm-fran/db";
import { leads } from "@crm-fran/db/schema/index";
import { selectLeadWithUsers } from "../queries/index";

export async function getWithoutAssigned() {
  return selectLeadWithUsers(and(isNull(leads.callerId), isNull(leads.closerId)));
}