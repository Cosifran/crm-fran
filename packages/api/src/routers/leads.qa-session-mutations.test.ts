import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { db, eq, inArray } from "@crm-fran/db";
import {
	alerts,
	leads,
	roles,
	user,
	LEAD_QA_ROLE,
	type LeadQASessionItem,
} from "@crm-fran/db/schema/index";
import { appRouter } from "./index";
import type { Context } from "../context";

const callerPermissions = ["leads:*", "users:read"];
const closerPermissions = ["leads:*", "alerts:*"];
const adminPermissions = ["*"];

describe("leads QA session mutations", () => {
	const created = {
		userIds: [] as string[],
		leadIds: [] as string[],
		alertIds: [] as string[],
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
		if (created.alertIds.length > 0) {
			await db.delete(alerts).where(inArray(alerts.id, created.alertIds));
		}
		if (created.leadIds.length > 0) {
			await db.delete(leads).where(inArray(leads.id, created.leadIds));
		}
		if (created.userIds.length > 0) {
			await db.delete(user).where(inArray(user.id, created.userIds));
		}
		created.alertIds = [];
		created.leadIds = [];
		created.userIds = [];
	});

	async function insertUser(input: { id: string; name: string; email: string; roleId: string }) {
		created.userIds.push(input.id);
		await db.insert(user).values(input);
		return input;
	}

	async function insertLead(input: { id: string; callerId?: string; closerId?: string }) {
		created.leadIds.push(input.id);
		await db.insert(leads).values({
			id: input.id,
			name: "Test Lead",
			email: `${input.id}@test.com`,
			phone: "123456789",
			callerId: input.callerId ?? null,
			closerId: input.closerId ?? null,
		});
		return input;
	}

	function createCaller(userId: string, roleId: string, permissions: string[]) {
		const ctx = {
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
		return appRouter.createCaller(ctx);
	}

	it("wires recordCloserAnswers and applies the row-level closer check", async () => {
		const callerId = crypto.randomUUID();
		const closerId = crypto.randomUUID();
		const leadId = crypto.randomUUID();

		await insertUser({ id: callerId, name: "Caller", email: `${callerId}@test.com`, roleId: "role-caller" });
		await insertUser({ id: closerId, name: "Closer", email: `${closerId}@test.com`, roleId: "role-closer" });
		await insertLead({ id: leadId, callerId, closerId });

		const items: LeadQASessionItem[] = [
			{ question: "LQ1", answer: "LA1", authorRole: LEAD_QA_ROLE.CLOSER, authorId: closerId },
		];

		const closer = createCaller(closerId, "role-closer", closerPermissions);
		const updated = await closer.leads.recordCloserAnswers({ leadId, items });

		expect(updated.closerId).toBe(closerId);
		expect(updated.questions).toEqual(items);
	});

	it("wires adminEditLeadQASession behind the wildcard permission", async () => {
		const adminId = crypto.randomUUID();
		const leadId = crypto.randomUUID();

		await insertUser({ id: adminId, name: "Admin", email: `${adminId}@test.com`, roleId: "role-admin" });
		await insertLead({ id: leadId });

		const items: LeadQASessionItem[] = [
			{ question: "Q1", answer: "A1", authorRole: LEAD_QA_ROLE.CALLER, authorId: "u1" },
		];

		const admin = createCaller(adminId, "role-admin", adminPermissions);
		const updated = await admin.leads.adminEditLeadQASession({ leadId, items });

		expect(updated.questions).toEqual(items);
	});

	it("rejects recordCloserAnswers at the procedure level for a caller", async () => {
		const callerId = crypto.randomUUID();
		const leadId = crypto.randomUUID();

		await insertUser({ id: callerId, name: "Caller", email: `${callerId}@test.com`, roleId: "role-caller" });
		await insertLead({ id: leadId });

		const caller = createCaller(callerId, "role-caller", callerPermissions);

		await expect(
			caller.leads.recordCloserAnswers({ leadId, items: [] }),
		).rejects.toBeInstanceOf(TRPCError);

		await expect(
			caller.leads.recordCloserAnswers({ leadId, items: [] }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});
