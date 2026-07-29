import { TRPCError } from "@trpc/server";
import { eq, db } from "@crm-fran/db";
import { leads } from "@crm-fran/db/schema/index";

import { hasUnworkedLead } from "./has-unworked-lead";

/**
 * Asigna un lead a un caller para que empiece a trabajarlo.
 *
 * Regla de negocio: un caller no puede tomar un nuevo lead si ya tiene
 * otro en estado "sin asignar" (asignado pero todavía no procesado).
 * Para tomar otro, primero debe avanzar ese lead a otro estado
 * (típicamente "Asignado" al closer, vía `assignLead`).
 */
export async function assignLeadToCaller({id, userId}: {id: string, userId: string}){
    const callerLeads = await db
        .select({ state: leads.state })
        .from(leads)
        .where(eq(leads.callerId, userId));

    if (hasUnworkedLead(callerLeads)) {
        throw new TRPCError({
            code: "CONFLICT",
            message: "Ya tenés un lead con el estado sin asignar",
        });
    }

    const [lead] = await db.update(leads).set({ callerId: userId }).where(eq(leads.id, id)).returning();
    return lead ?? null;
}
