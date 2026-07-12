import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";


export const leads = pgTable("leads", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull(),
    state: text("state").default("sin asignar").notNull(),
    callerId: text("caller_id").references(() => user.id, { onDelete: "set null" }),
    closerId: text("closer_id").references(() => user.id, { onDelete: "set null" }),
    response: text("response").default("sin asignar").notNull(),
    feedback: text("feedback").default("sin asignar").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
})

export const leadsRelations = relations(leads, ({ one }) => ({
    caller: one(user, {
        fields: [leads.callerId],
        references: [user.id],
        relationName: "caller"
    }),
    closer: one(user, {
        fields: [leads.closerId],
        references: [user.id],
        relationName: "closer"
    }),
}))
    