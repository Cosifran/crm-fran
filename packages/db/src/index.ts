import { env } from "@crm-fran/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export { alias } from "drizzle-orm/pg-core";
export { eq, and, or, isNull, isNotNull, sql, type SQL } from "drizzle-orm";

export function createDb() {
  return drizzle(env.DATABASE_URL, { schema });
}

export const db = createDb();
