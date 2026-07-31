import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  json,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { LEAD_STATE, type LeadState } from "./state";

export const LEAD_QA_ROLE = {
  CALLER: "caller",
  CLOSER: "closer",
} as const;

export type LeadQARole = (typeof LEAD_QA_ROLE)[keyof typeof LEAD_QA_ROLE];

export type LeadQASessionItem = {
  question: string;
  answer: string;
  authorRole: LeadQARole;
  authorId: string | null;
};

export type LeadQASession = LeadQASessionItem[];

export const leads = pgTable("leads", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull(),
    questions: json("questions")
      .$type<LeadQASession>()
      .default([])
      .notNull(),
    state: text("state")
      .default(LEAD_STATE.SIN_ASIGNAR)
      .$type<LeadState>()
      .notNull(),
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
    