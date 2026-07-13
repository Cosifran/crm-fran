import { db, or, isNull } from "@crm-fran/db";
import { leads } from "@crm-fran/db/schema/index";

export async function getWithoutAssigned() {
  return db.select().from(leads).where(or(isNull(leads.callerId), isNull(leads.closerId)));
}