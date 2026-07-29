import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { db, inArray } from "@crm-fran/db";
import { leads, roles, user, type LeadQASessionItem, LEAD_QA_ROLE } from "@crm-fran/db/schema/index";
import type { Context } from "../../context";

import { recordCloserAnswers } from "./record-closer-answers";

const callerPermissions = ["leads:*", "users:read"];
const closerPermissions = ["leads:*", "alerts:*"];
const adminPermissions = ["*"];

describe("recordCloserAnswers", () => {
	const created = {
		userIds: [] as string[],
		leadIds: [] as string[],
	};

	beforeAll(async () => {
		await db
			.insert(roles)
			.values([
				{ id: "role-caller", name: "Caller", permissions: callerPermissions },
				{ id: "role-closer", name: "Closer", permissions: closerPermissions },
				{ id: "role-admin", name: "Admin", permissions: adminPermissions },
			])
			.onConflictDoNothing();
	});

	afterEach(async () => {
		if (created.leadIds.length > 0) {
			await db.delete(leads).where(inArray(leads.id, created.leadIds));
		}
		if (created.userIds.length > 0) {
			await db.delete(user).where(inArray(user.id, created.userIds));
		}
		created.leadIds = [];
		created.userIds = [];
	});

	async function insertUser(input: { id: string; name: string; email: string; roleId: string }) {
		created.userIds.push(input.id);
		await db.insert(user).values(input);
		return input;
	}

	async function insertLead(input: { id: string; callerId?: string; closerId?: string; questions?: LeadQASessionItem[] }) {
		created.leadIds.push(input.id);
		await db.insert(leads).values({
			id: input.id,
			name: "Test Lead",
			email: `${input.id}@test.com`,
			phone: "123456789",
			callerId: input.callerId ?? null,
			closerId: input.closerId ?? null,
			questions: input.questions ?? [],
		});
		return input;
	}

	function buildContext(userId: string, roleId: string, permissions: string[]) {
		return {
			session: {
				user: {
					id: userId,
					roleId,
					name: "Test",
					email: "test@example.com",
					emailVerified: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			},
			role: { id: roleId, name: roleId, permissions },
			permissions,
		} as Context;
	}

	it("adds the first closer session for the assigned closer", async () => {
		const callerId = crypto.randomUUID();
		const closerId = crypto.randomUUID();
		const leadId = crypto.randomUUID();

		await insertUser({ id: callerId, name: "Caller", email: `${callerId}@test.com`, roleId: "role-caller" });
		await insertUser({ id: closerId, name: "Closer", email: `${closerId}@test.com`, roleId: "role-closer" });
		await insertLead({ id: leadId, callerId, closerId });

		const items: LeadQASessionItem[] = [
			{ question: "LQ1", answer: "LA1", authorRole: LEAD_QA_ROLE.CLOSER, authorId: closerId },
		];

		const updated = await recordCloserAnswers({
			ctx: buildContext(closerId, "role-closer", closerPermissions),
			input: { leadId, items },
		});

		expect(updated.closerId).toBe(closerId);
		expect(updated.questions).toEqual(items);
	});

	it("replaces only closer items while preserving caller items", async () => {
		const callerId = crypto.randomUUID();
		const closerId = crypto.randomUUID();
		const leadId = crypto.randomUUID();

		await insertUser({ id: callerId, name: "Caller", email: `${callerId}@test.com`, roleId: "role-caller" });
		await insertUser({ id: closerId, name: "Closer", email: `${closerId}@test.com`, roleId: "role-closer" });
		await insertLead({
			id: leadId,
			callerId,
			closerId,
			questions: [
				{ question: "CQ1", answer: "CA1", authorRole: LEAD_QA_ROLE.CALLER, authorId: callerId },
				{ question: "LQ1", answer: "Old answer", authorRole: LEAD_QA_ROLE.CLOSER, authorId: closerId },
			],
		});

		const newItems: LeadQASessionItem[] = [
			{ question: "LQ1", answer: "New answer", authorRole: LEAD_QA_ROLE.CLOSER, authorId: closerId },
			{ question: "LQ2", answer: "LA2", authorRole: LEAD_QA_ROLE.CLOSER, authorId: closerId },
		];

		const updated = await recordCloserAnswers({
			ctx: buildContext(closerId, "role-closer", closerPermissions),
			input: { leadId, items: newItems },
		});

		expect(updated.questions).toHaveLength(3);
		expect(updated.questions).toContainEqual({
			question: "CQ1",
			answer: "CA1",
			authorRole: LEAD_QA_ROLE.CALLER,
			authorId: callerId,
		});
		expect(updated.questions).toContainEqual(newItems[0]);
		expect(updated.questions).toContainEqual(newItems[1]);
	});

	it("rejects a caller and leaves the lead unchanged", async () => {
		const callerId = crypto.randomUUID();
		const closerId = crypto.randomUUID();
		const leadId = crypto.randomUUID();

		await insertUser({ id: callerId, name: "Caller", email: `${callerId}@test.com`, roleId: "role-caller" });
		await insertUser({ id: closerId, name: "Closer", email: `${closerId}@test.com`, roleId: "role-closer" });
		await insertLead({ id: leadId, callerId, closerId });

		await expect(
			recordCloserAnswers({
				ctx: buildContext(callerId, "role-caller", callerPermissions),
				input: { leadId, items: [] },
			}),
		).rejects.toBeInstanceOf(TRPCError);

		await expect(
			recordCloserAnswers({
				ctx: buildContext(callerId, "role-caller", callerPermissions),
				input: { leadId, items: [] },
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });

		const unchanged = await db.query.leads.findFirst({
			where: (table, { eq }) => eq(table.id, leadId),
		});
		expect(unchanged?.questions).toEqual([]);
	});

	it("rejects a closer assigned to a different lead", async () => {
		const callerId = crypto.randomUUID();
		const closerId = crypto.randomUUID();
		const otherCloserId = crypto.randomUUID();
		const leadId = crypto.randomUUID();

		await insertUser({ id: callerId, name: "Caller", email: `${callerId}@test.com`, roleId: "role-caller" });
		await insertUser({ id: closerId, name: "Closer", email: `${closerId}@test.com`, roleId: "role-closer" });
		await insertUser({ id: otherCloserId, name: "Other Closer", email: `${otherCloserId}@test.com`, roleId: "role-closer" });
		await insertLead({ id: leadId, callerId, closerId });

		await expect(
			recordCloserAnswers({
				ctx: buildContext(otherCloserId, "role-closer", closerPermissions),
				input: { leadId, items: [] },
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });

		const unchanged = await db.query.leads.findFirst({
			where: (table, { eq }) => eq(table.id, leadId),
		});
		expect(unchanged?.questions).toEqual([]);
	});

	it("preserves closer items authored by a different user (forward-compat)", async () => {
		// Per SH-LEADQA-002: only items matching authorRole === "closer" AND authorId === current
		// user are replaced. Items authored by a different closer (legacy/backfilled) are preserved.
		const callerId = crypto.randomUUID();
		const closerId = crypto.randomUUID();
		const legacyCloserId = crypto.randomUUID();
		const leadId = crypto.randomUUID();

		await insertUser({ id: callerId, name: "Caller", email: `${callerId}@test.com`, roleId: "role-caller" });
		await insertUser({ id: closerId, name: "Closer", email: `${closerId}@test.com`, roleId: "role-closer" });
		await insertLead({
			id: leadId,
			callerId,
			closerId,
			questions: [
				{ question: "CQ1", answer: "CA1", authorRole: LEAD_QA_ROLE.CALLER, authorId: callerId },
				// Legacy item from a previous closer (impossible via normal flow, possible via import).
				{ question: "LQ0", answer: "Legacy", authorRole: LEAD_QA_ROLE.CLOSER, authorId: legacyCloserId },
				// Current closer's existing item.
				{ question: "LQ1", answer: "Old", authorRole: LEAD_QA_ROLE.CLOSER, authorId: closerId },
			],
		});

		const newItems: LeadQASessionItem[] = [
			{ question: "LQ1", answer: "New", authorRole: LEAD_QA_ROLE.CLOSER, authorId: closerId },
		];

		const updated = await recordCloserAnswers({
			ctx: buildContext(closerId, "role-closer", closerPermissions),
			input: { leadId, items: newItems },
		});

		// Caller item preserved.
		expect(updated.questions).toContainEqual({
			question: "CQ1",
			answer: "CA1",
			authorRole: LEAD_QA_ROLE.CALLER,
			authorId: callerId,
		});
		// Legacy closer item preserved (not matched by current user's authorId).
		expect(updated.questions).toContainEqual({
			question: "LQ0",
			answer: "Legacy",
			authorRole: LEAD_QA_ROLE.CLOSER,
			authorId: legacyCloserId,
		});
		// Current closer's old item replaced; new item present.
		expect(updated.questions).toContainEqual(newItems[0]);
		expect(updated.questions).not.toContainEqual({
			question: "LQ1",
			answer: "Old",
			authorRole: LEAD_QA_ROLE.CLOSER,
			authorId: closerId,
		});
		expect(updated.questions).toHaveLength(3);
	});
});
