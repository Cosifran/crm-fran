import { relations, sql } from "drizzle-orm";
import { check, index, integer, json, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { commercialExperiments } from "./commercial-experiments";

export const COMMERCIAL_LIBRARY_STATUS = { DRAFT: "draft", PUBLISHED: "published", ARCHIVED: "archived" } as const;
export const COMMERCIAL_LIBRARY_TYPE = { SCRIPT: "script", OBJECTION_RESPONSE: "objection_response", PLAYBOOK: "playbook", CASE_STUDY: "case_study" } as const;
export type CommercialLibraryStatus = typeof COMMERCIAL_LIBRARY_STATUS[keyof typeof COMMERCIAL_LIBRARY_STATUS];
export type CommercialLibraryTargeting = { profile?: string | null; objections?: string[]; motivations?: string[]; source?: string | null; campaign?: string | null; ad?: string | null; creative?: string | null; acquisitionAngle?: string | null };
export type CommercialLibraryEvidence = { sampleSize?: number; conversionRate?: number; references?: { feedbackEventId: string; leadId: string }[]; evidenceLabel?: "observational" | "causal" };

export const commercialLibraryVersions = pgTable("commercial_library_versions", {
  id: text("id").primaryKey(), lineageKey: text("lineage_key").notNull(), version: integer("version").notNull(),
  status: text("status").$type<CommercialLibraryStatus>().notNull(), type: text("type").notNull(), title: text("title").notNull(), content: text("content").notNull(),
  targeting: json("targeting").$type<CommercialLibraryTargeting>().default({}).notNull(), evidence: json("evidence").$type<CommercialLibraryEvidence>().default({}).notNull(),
  actorId: text("actor_id").notNull().references(() => user.id, { onDelete: "restrict" }), approvedById: text("approved_by_id").references(() => user.id, { onDelete: "restrict" }), approvedAt: timestamp("approved_at"),
  originExperimentId: text("origin_experiment_id").references(() => commercialExperiments.id, { onDelete: "restrict" }), createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("commercial_library_lineage_version_uidx").on(table.lineageKey, table.version), index("commercial_library_status_type_idx").on(table.status, table.type), check("commercial_library_status_check", sql`${table.status} IN ('draft','published','archived')`), check("commercial_library_type_check", sql`${table.type} IN ('script','objection_response','playbook','case_study')`), check("commercial_library_version_check", sql`${table.version} >= 1`)]);

export const commercialLibraryVersionsRelations = relations(commercialLibraryVersions, ({ one }) => ({ actor: one(user, { fields: [commercialLibraryVersions.actorId], references: [user.id], relationName: "libraryActor" }), approvedBy: one(user, { fields: [commercialLibraryVersions.approvedById], references: [user.id], relationName: "libraryApprover" }), originExperiment: one(commercialExperiments, { fields: [commercialLibraryVersions.originExperimentId], references: [commercialExperiments.id] }) }));
