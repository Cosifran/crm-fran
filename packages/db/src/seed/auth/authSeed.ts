import dotenv from "dotenv";
dotenv.config({ path: "../../apps/web/.env" });

const { db } = await import("../..");
const { roles } = await import("../../schema");

await db.insert(roles).values([
    {
        id: "role-caller",
        name: "Caller",
        permissions: ["leads:read", "leads:write", "leads:delete", "leads:*"]
    },
    {
        id: "role-closer",
        name: "Closer",
        permissions: ["leads:read", "leads:write", "leads:delete", "leads:*"]
    },
    {
        id: "role-admin",
        name: "Admin",
        permissions: ["*"]
    }
]).onConflictDoNothing()