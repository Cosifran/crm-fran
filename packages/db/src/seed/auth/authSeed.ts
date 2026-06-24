import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../apps/web/.env") });

const { db } = await import("../..");
const { roles } = await import("../../schema");

await db
  .insert(roles)
  .values([
    {
      id: "role-caller",
      name: "Caller",
      permissions: ["leads:*"],
    },
    {
      id: "role-closer",
      name: "Closer",
      permissions: ["leads:*", "alerts:*"],
    },
    {
      id: "role-admin",
      name: "Admin",
      permissions: ["*"],
    },
  ])
  .onConflictDoNothing();
