import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { leads } from "./leads";

export const ALERT_KIND = {
	NO_CONTACT: "no_contact",
	FOLLOW_UP: "follow_up",
} as const;
export type AlertKind = (typeof ALERT_KIND)[keyof typeof ALERT_KIND];

export const ALERT_SEVERITY = {
	INFO: "info",
	WARNING: "warning",
	HIGH: "high",
	URGENT: "urgent",
} as const;
export type AlertSeverity = (typeof ALERT_SEVERITY)[keyof typeof ALERT_SEVERITY];

export const alerts = pgTable(
	"alerts",
	{
		id: text("id").primaryKey(),
		leadId: text("lead_id")
			.notNull()
			.references(() => leads.id, { onDelete: "cascade" }),
		targetUserId: text("target_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		kind: text("kind").$type<AlertKind>().notNull(),
		message: text("message").notNull(),
		severity: text("severity").$type<AlertSeverity>().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		dismissedAt: timestamp("dismissed_at"),
		dismissedBy: text("dismissed_by").references(() => user.id, {
			onDelete: "set null",
		}),
		resolvedAt: timestamp("resolved_at"),
		intervalMinutes: integer("interval_minutes").notNull(),
		nextShowAt: timestamp("next_show_at").notNull(),
		occurrences: integer("occurrences").default(0).notNull(),
		maxOccurrences: integer("max_occurrences"),
	},
	(table) => [
		index("alerts_targetUserId_idx").on(table.targetUserId),
		index("alerts_nextShowAt_idx").on(table.nextShowAt),
		index("alerts_resolvedAt_idx").on(table.resolvedAt),
	],
);

export const alertsRelations = relations(alerts, ({ one }) => ({
	lead: one(leads, { fields: [alerts.leadId], references: [leads.id] }),
	targetUser: one(user, {
		fields: [alerts.targetUserId],
		references: [user.id],
		relationName: "alertTarget",
	}),
	dismisser: one(user, {
		fields: [alerts.dismissedBy],
		references: [user.id],
		relationName: "alertDismisser",
	}),
}));
