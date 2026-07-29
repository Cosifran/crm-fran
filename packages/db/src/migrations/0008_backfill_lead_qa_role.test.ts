import { describe, it, expect, afterEach } from "vitest";
import { sql, db, inArray } from "@crm-fran/db";
import { leads, user, LEAD_QA_ROLE, type LeadQASessionItem } from "@crm-fran/db/schema/index";

const MIGRATION = sql`
  UPDATE leads l
  SET questions = (
    SELECT jsonb_agg(
      elem || jsonb_build_object(
        'authorRole', 'caller',
        'authorId', l.caller_id
      )
    )
    FROM jsonb_array_elements(l.questions::jsonb) AS elem
    WHERE NOT (elem ? 'authorRole')
  )
  WHERE l.questions::jsonb <> '[]'::jsonb
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(l.questions::jsonb) elem
      WHERE NOT (elem ? 'authorRole')
    );
`;

describe("0008_backfill_lead_qa_role migration", () => {
	const created = {
		userIds: [] as string[],
		leadIds: [] as string[],
	};

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

	it("backfills legacy questions with caller attribution", async () => {
		const callerId = crypto.randomUUID();
		const leadId = crypto.randomUUID();

		created.userIds.push(callerId);
		created.leadIds.push(leadId);

		await db.insert(user).values({
			id: callerId,
			name: "Caller",
			email: `${callerId}@test.com`,
			roleId: "role-caller",
		});

		await db.insert(leads).values({
			id: leadId,
			name: "Legacy Lead",
			email: `${leadId}@test.com`,
			phone: "123456789",
			callerId,
			questions: [{ question: "Q", answer: "A" }] as LeadQASessionItem[],
		});

		await db.execute(MIGRATION);

		const updated = await db.query.leads.findFirst({
			where: (table, { eq }) => eq(table.id, leadId),
		});

		expect(updated?.questions).toEqual([
			{ question: "Q", answer: "A", authorRole: "caller", authorId: callerId },
		]);
	});

	it("is idempotent when items already carry authorRole", async () => {
		const callerId = crypto.randomUUID();
		const leadId = crypto.randomUUID();

		created.userIds.push(callerId);
		created.leadIds.push(leadId);

		const initialQuestions: LeadQASessionItem[] = [
			{
				question: "Q1",
				answer: "A1",
				authorRole: LEAD_QA_ROLE.CALLER,
				authorId: callerId,
			},
		];

		await db.insert(user).values({
			id: callerId,
			name: "Caller",
			email: `${callerId}@test.com`,
			roleId: "role-caller",
		});

		await db.insert(leads).values({
			id: leadId,
			name: "Tagged Lead",
			email: `${leadId}@test.com`,
			phone: "123456789",
			callerId,
			questions: initialQuestions,
		});

		await db.execute(MIGRATION);

		const updated = await db.query.leads.findFirst({
			where: (table, { eq }) => eq(table.id, leadId),
		});

		expect(updated?.questions).toEqual(initialQuestions);
	});
});
