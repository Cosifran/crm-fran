import { describe, expect, it, beforeAll, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { db, eq, inArray } from "@crm-fran/db";
import { alerts, leads, roles, user } from "@crm-fran/db/schema/index";
import { LEAD_STATE } from "@crm-fran/db/schema/state";
import { LEAD_QA_ROLE, type LeadQASessionItem } from "@crm-fran/db/schema/index";
import { assignLead } from "../leads/services/assign-lead";
import { assignLeadInput } from "./leads";

describe("assignLead service", () => {
  const created = {
    userIds: [] as string[],
    leadIds: [] as string[],
    alertIds: [] as string[],
  };

  beforeAll(async () => {
    await db
      .insert(roles)
      .values([
        { id: "role-caller", name: "Caller", permissions: ["leads:*", "users:read"] },
        { id: "role-closer", name: "Closer", permissions: ["leads:*", "alerts:*"] },
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

  async function insertLead(input: { id: string; state?: string }) {
    created.leadIds.push(input.id);
    await db.insert(leads).values({
      id: input.id,
      name: "Test Lead",
      email: `lead-${input.id}@test.com`,
      phone: "123456789",
      state: (input.state ?? LEAD_STATE.SIN_ASIGNAR) as never,
    });
    return input;
  }

  it("assigns a lead and persists Q&A when isContacted is Si", async () => {
    const callerId = crypto.randomUUID();
    const closerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();

    await insertUser({ id: callerId, name: "Caller", email: "caller@test.com", roleId: "role-caller" });
    await insertUser({ id: closerId, name: "Closer", email: "closer@test.com", roleId: "role-closer" });
    await insertLead({ id: leadId });

    const questions = [
      { questionKey: "isDecisionMaker", question: "Is decision maker?", answer: "yes" },
      { questionKey: "decisionMakerName", question: "Decision maker name", answer: "John Doe" },
    ];

    const expectedQuestions: LeadQASessionItem[] = questions.map((q) => ({
      ...q,
      authorRole: LEAD_QA_ROLE.CALLER,
      authorId: callerId,
    }));

    const result = await assignLead({
      callerId,
      input: {
        leadId,
        isContacted: "Si",
        closerId,
        scheduledDate: "2026-07-26",
        scheduledTime: "10:00",
        questions,
        extraNotes: "Notes",
      },
    });

    expect(result.leadId).toBe(leadId);

    const updated = await db.query.leads.findFirst({ where: (table, { eq }) => eq(table.id, leadId) });
    expect(updated?.state).toBe(LEAD_STATE.ASIGNADO);
    expect(updated?.callerId).toBe(callerId);
    expect(updated?.closerId).toBe(closerId);
    expect(updated?.questions).toEqual(expectedQuestions);

    const alertRows = await db.select().from(alerts).where(eq(alerts.leadId, leadId));
    expect(alertRows).toHaveLength(1);

    const followUpAlert = alertRows[0];
    created.alertIds.push(followUpAlert?.id ?? "");
    expect(followUpAlert?.kind).toBe("follow_up");
    expect(followUpAlert?.targetUserId).toBe(closerId);
    expect(followUpAlert?.nextShowAt).toBeInstanceOf(Date);
  });

  it("creates a no_contact alert when isContacted is No", async () => {
    const callerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();

    await insertUser({ id: callerId, name: "Caller", email: "caller2@test.com", roleId: "role-caller" });
    await insertLead({ id: leadId });

    const result = await assignLead({
      callerId,
      input: { leadId, isContacted: "No" },
    });

    expect(result.leadId).toBe(leadId);

    const updated = await db.query.leads.findFirst({ where: (table, { eq }) => eq(table.id, leadId) });
    expect(updated?.state).toBe(LEAD_STATE.ASIGNADO);
    expect(updated?.callerId).toBe(callerId);
    expect(updated?.questions).toEqual([]);

    const alertRows = await db.select().from(alerts).where(eq(alerts.leadId, leadId));
    expect(alertRows).toHaveLength(1);

    const alert = alertRows[0];
    created.alertIds.push(alert?.id ?? "");
    expect(alert?.kind).toBe("no_contact");
    expect(alert?.severity).toBe("high");
    expect(alert?.intervalMinutes).toBe(1440);
    expect(alert?.targetUserId).toBe(callerId);
    expect(alert?.nextShowAt).toBeInstanceOf(Date);
  });

  it("preserves existing questions when isContacted is No", async () => {
    const callerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();

    await insertUser({ id: callerId, name: "Caller", email: "caller5@test.com", roleId: "role-caller" });

    const existingQuestions: LeadQASessionItem[] = [
      { questionKey: "isContacted", question: "Q1", answer: "A1", authorRole: LEAD_QA_ROLE.CALLER, authorId: callerId },
      { questionKey: "budget", question: "Budget?", answer: "1000", authorRole: LEAD_QA_ROLE.CLOSER, authorId: "closer-1" },
    ];

    await insertLead({ id: leadId });
    await db
      .update(leads)
      .set({ questions: existingQuestions })
      .where(eq(leads.id, leadId));

    const result = await assignLead({
      callerId,
      input: { leadId, isContacted: "No" },
    });

    expect(result.leadId).toBe(leadId);

    const updated = await db.query.leads.findFirst({ where: (table, { eq }) => eq(table.id, leadId) });
    expect(updated?.questions).toEqual(existingQuestions);
  });

  it("preserves closer items when caller resubmits with Si", async () => {
    const callerId = crypto.randomUUID();
    const closerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();

    await insertUser({ id: callerId, name: "Caller", email: "caller-partition@test.com", roleId: "role-caller" });
    await insertUser({ id: closerId, name: "Closer", email: "closer-partition@test.com", roleId: "role-closer" });

    const existingQuestions: LeadQASessionItem[] = [
      { questionKey: "isContacted", question: "Contacted?", answer: "Si", authorRole: LEAD_QA_ROLE.CALLER, authorId: callerId },
      { questionKey: "budget", question: "Budget?", answer: "1000", authorRole: LEAD_QA_ROLE.CLOSER, authorId: closerId },
    ];

    await insertLead({ id: leadId });
    await db.update(leads).set({ questions: existingQuestions, closerId }).where(eq(leads.id, leadId));

    await assignLead({
      callerId,
      input: {
        leadId,
        isContacted: "Si",
        closerId,
        questions: [
          { questionKey: "isContacted", question: "Contacted?", answer: "Si" },
          { questionKey: "budget", question: "Budget?", answer: "2000" },
        ],
      },
    });

    const updated = await db.query.leads.findFirst({ where: (table, { eq }) => eq(table.id, leadId) });
    const updatedQuestions = updated?.questions as LeadQASessionItem[];

    // Closer items preserved
    const closerItems = updatedQuestions.filter((q) => q.authorRole === LEAD_QA_ROLE.CLOSER);
    expect(closerItems).toHaveLength(1);
    expect(closerItems[0]?.authorId).toBe(closerId);
    expect(closerItems[0]?.answer).toBe("1000");

    // Caller items replaced with new ones
    const callerItems = updatedQuestions.filter((q) => q.authorRole === LEAD_QA_ROLE.CALLER);
    expect(callerItems).toHaveLength(2);
    expect(callerItems[0]?.answer).toBe("Si");
    expect(callerItems[1]?.answer).toBe("2000");
    expect(callerItems[0]?.authorId).toBe(callerId);
  });

  it("preserves other-caller items when one caller resubmits with Si", async () => {
    const callerA = crypto.randomUUID();
    const callerB = crypto.randomUUID();
    const closerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();

    await insertUser({ id: callerA, name: "Caller A", email: "callerA@test.com", roleId: "role-caller" });
    await insertUser({ id: callerB, name: "Caller B", email: "callerB@test.com", roleId: "role-caller" });
    await insertUser({ id: closerId, name: "Closer", email: "closer-other@test.com", roleId: "role-closer" });

    const existingQuestions: LeadQASessionItem[] = [
      { questionKey: "isContacted", question: "Contacted?", answer: "Si", authorRole: LEAD_QA_ROLE.CALLER, authorId: callerA },
      { questionKey: "isContacted", question: "Contacted?", answer: "No", authorRole: LEAD_QA_ROLE.CALLER, authorId: callerB },
      { questionKey: "budget", question: "Budget?", answer: "500", authorRole: LEAD_QA_ROLE.CLOSER, authorId: closerId },
    ];

    await insertLead({ id: leadId });
    await db.update(leads).set({ questions: existingQuestions, closerId }).where(eq(leads.id, leadId));

    // Caller A resubmits
    await assignLead({
      callerId: callerA,
      input: {
        leadId,
        isContacted: "Si",
        closerId,
        questions: [{ questionKey: "isContacted", question: "Contacted?", answer: "Si" }],
      },
    });

    const updated = await db.query.leads.findFirst({ where: (table, { eq }) => eq(table.id, leadId) });
    const updatedQuestions = updated?.questions as LeadQASessionItem[];

    // Caller B items preserved
    const callerBItems = updatedQuestions.filter(
      (q) => q.authorRole === LEAD_QA_ROLE.CALLER && q.authorId === callerB,
    );
    expect(callerBItems).toHaveLength(1);
    expect(callerBItems[0]?.answer).toBe("No");

    // Closer items preserved
    const closerItems = updatedQuestions.filter((q) => q.authorRole === LEAD_QA_ROLE.CLOSER);
    expect(closerItems).toHaveLength(1);
    expect(closerItems[0]?.answer).toBe("500");

    // Caller A items replaced
    const callerAItems = updatedQuestions.filter(
      (q) => q.authorRole === LEAD_QA_ROLE.CALLER && q.authorId === callerA,
    );
    expect(callerAItems).toHaveLength(1);
    expect(callerAItems[0]?.answer).toBe("Si");
  });

  it("rejects old yes/no encoding via Zod schema", () => {
    const resultSi = assignLeadInput.safeParse({
      leadId: "test",
      isContacted: "Si",
      closerId: "closer",
      questions: [{ questionKey: "q1", question: "Q?", answer: "A" }],
    });
    expect(resultSi.success).toBe(true);

    const resultNo = assignLeadInput.safeParse({
      leadId: "test",
      isContacted: "No",
    });
    expect(resultNo.success).toBe(true);

    const resultOldYes = assignLeadInput.safeParse({
      leadId: "test",
      isContacted: "yes",
      closerId: "closer",
      questions: [{ questionKey: "q1", question: "Q?", answer: "A" }],
    });
    expect(resultOldYes.success).toBe(false);

    const resultOldNo = assignLeadInput.safeParse({
      leadId: "test",
      isContacted: "no",
    });
    expect(resultOldNo.success).toBe(false);
  });

  it("throws NOT_FOUND when the lead does not exist", async () => {
    const callerId = crypto.randomUUID();
    await insertUser({ id: callerId, name: "Caller", email: "caller3@test.com", roleId: "role-caller" });

    await expect(
      assignLead({
        callerId,
        input: { leadId: crypto.randomUUID(), isContacted: "No" },
      }),
    ).rejects.toBeInstanceOf(TRPCError);

    await expect(
      assignLead({
        callerId,
        input: { leadId: crypto.randomUUID(), isContacted: "No" },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rolls back the transaction when closerId does not exist", async () => {
    const callerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();

    await insertUser({ id: callerId, name: "Caller", email: "caller4@test.com", roleId: "role-caller" });
    await insertLead({ id: leadId });

    await expect(
      assignLead({
        callerId,
        input: {
          leadId,
          isContacted: "Si",
          closerId: crypto.randomUUID(),
          scheduledDate: "2026-07-26",
          scheduledTime: "10:00",
          questions: [{ questionKey: "q1", question: "Q", answer: "A" }],
        },
      }),
    ).rejects.toBeInstanceOf(TRPCError);

    await expect(
      assignLead({
        callerId,
        input: {
          leadId,
          isContacted: "Si",
          closerId: crypto.randomUUID(),
          scheduledDate: "2026-07-26",
          scheduledTime: "10:00",
          questions: [{ questionKey: "q1", question: "Q", answer: "A" }],
        },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const unchanged = await db.query.leads.findFirst({ where: (table, { eq }) => eq(table.id, leadId) });
    expect(unchanged?.state).toBe(LEAD_STATE.SIN_ASIGNAR);
    expect(unchanged?.callerId).toBeNull();
  });
});
