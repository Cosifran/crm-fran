import { db, alias, eq } from "@crm-fran/db";
import { leads, user } from "@crm-fran/db/schema/index";

export async function getAll() {
  const caller = alias(user, "caller");
  const closer = alias(user, "closer");

  return db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      state: leads.state,
      response: leads.response,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      caller: { id: caller.id, name: caller.name, email: caller.email },
      closer: { id: closer.id, name: closer.name, email: closer.email },
    })
    .from(leads)
    .leftJoin(caller, eq(caller.id, leads.callerId))
    .leftJoin(closer, eq(closer.id, leads.closerId));
}