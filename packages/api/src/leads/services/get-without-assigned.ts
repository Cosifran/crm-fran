import { db, and, isNull } from "@crm-fran/db";
import { leads } from "@crm-fran/db/schema/index";

export async function getWithoutAssigned() {
  return db
    .select()
    .from(leads)
    .where(and(isNull(leads.callerId), isNull(leads.closerId)));
}