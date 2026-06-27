import { db } from "@crm-fran/db";
import { auth } from "@crm-fran/auth";
import type { NextRequest } from "next/server";
import type { Permission } from "@crm-fran/db/schema/auth";

export async function createContext(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  const obj = {
    auth: null,
    session: null,
    permissions: null,
  };

  if (!session) {
    return obj;
  }

  if (!session.user.roleId) {
    return {
      ...obj,
    };
  }

  const permissions = (
    await db.query.roles.findFirst({
      where: (roles, { eq }) => eq(roles.id, session.user.roleId),
    })
  )?.permissions as Permission[];

  return {
    ...obj,
    session,
    permissions,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
