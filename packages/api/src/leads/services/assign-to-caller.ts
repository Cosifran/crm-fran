import { eq, db } from "@crm-fran/db";
import { leads } from "@crm-fran/db/schema/index";

export async function assignLeadToCaller({id, userId}: {id: string, userId: string}){
    const [lead] = await db.update(leads).set({ callerId: userId }).where(eq(leads.id, id)).returning();
    return lead ?? null;
}