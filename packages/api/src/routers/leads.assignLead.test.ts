import { describe, expect, it, beforeAll, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { db, eq, inArray } from "@crm-fran/db";
import { alerts, leads, roles, user } from "@crm-fran/db/schema/index";
import { LEAD_STATE } from "@crm-fran/db/schema/state";
import { LEAD_QA_ROLE, type LeadQASessionItem } from "@crm-fran/db/schema/index";
import { assignLead } from "../leads/services/assign-lead";

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

  it("assigns a lead and persists Q&A when isContacted is yes", async () => {
    const callerId = crypto.randomUUID();
    const closerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();

    await insertUser({ id: callerId, name: "Caller", email: "caller@test.com", roleId: "role-caller" });
    await insertUser({ id: closerId, name: "Closer", email: "closer@test.com", roleId: "role-closer" });
    await insertLead({ id: leadId });

    const questions = [
      { question: "Is decision maker?", answer: "yes" },
      { question: "Decision maker name", answer: "John Doe" },
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
        isContacted: "yes",
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

  it("creates a no_contact alert when isContacted is no", async () => {
    const callerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();

    await insertUser({ id: callerId, name: "Caller", email: "caller2@test.com", roleId: "role-caller" });
    await insertLead({ id: leadId });

    const result = await assignLead({
      callerId,
      input: { leadId, isContacted: "no" },
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

  it("preserves existing questions when isContacted is no", async () => {
    const callerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();

    await insertUser({ id: callerId, name: "Caller", email: "caller5@test.com", roleId: "role-caller" });

    const existingQuestions: LeadQASessionItem[] = [
      { question: "Q1", answer: "A1", authorRole: LEAD_QA_ROLE.CALLER, authorId: callerId },
    ];

    await insertLead({ id: leadId });
    await db
      .update(leads)
      .set({ questions: existingQuestions })
      .where(eq(leads.id, leadId));

    const result = await assignLead({
      callerId,
      input: { leadId, isContacted: "no" },
    });

    expect(result.leadId).toBe(leadId);

    const updated = await db.query.leads.findFirst({ where: (table, { eq }) => eq(table.id, leadId) });
    expect(updated?.questions).toEqual(existingQuestions);
  });

  it("throws NOT_FOUND when the lead does not exist", async () => {
    const callerId = crypto.randomUUID();
    await insertUser({ id: callerId, name: "Caller", email: "caller3@test.com", roleId: "role-caller" });

    await expect(
      assignLead({
        callerId,
        input: { leadId: crypto.randomUUID(), isContacted: "no" },
      }),
    ).rejects.toBeInstanceOf(TRPCError);

    await expect(
      assignLead({
        callerId,
        input: { leadId: crypto.randomUUID(), isContacted: "no" },
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
          isContacted: "yes",
          closerId: crypto.randomUUID(),
          scheduledDate: "2026-07-26",
          scheduledTime: "10:00",
          questions: [{ question: "Q", answer: "A" }],
        },
      }),
    ).rejects.toBeInstanceOf(TRPCError);

    await expect(
      assignLead({
        callerId,
        input: {
          leadId,
          isContacted: "yes",
          closerId: crypto.randomUUID(),
          scheduledDate: "2026-07-26",
          scheduledTime: "10:00",
          questions: [{ question: "Q", answer: "A" }],
        },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const unchanged = await db.query.leads.findFirst({ where: (table, { eq }) => eq(table.id, leadId) });
    expect(unchanged?.state).toBe(LEAD_STATE.SIN_ASIGNAR);
    expect(unchanged?.callerId).toBeNull();
  });
});
