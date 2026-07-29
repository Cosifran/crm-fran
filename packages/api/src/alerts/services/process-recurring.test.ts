import { describe, expect, it, beforeAll, afterEach } from "vitest";
import { db, inArray } from "@crm-fran/db";
import { alerts, leads, roles, user } from "@crm-fran/db/schema/index";
import { LEAD_STATE } from "@crm-fran/db/schema/state";
import { ALERT_KIND } from "@crm-fran/db/schema/alerts";
import { processRecurringAlerts } from "./process-recurring";

describe("processRecurringAlerts", () => {
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

  async function insertLead(input: { id: string }) {
    created.leadIds.push(input.id);
    await db.insert(leads).values({
      id: input.id,
      name: "Test Lead",
      email: `lead-${input.id}@test.com`,
      phone: "123456789",
      state: LEAD_STATE.SIN_ASIGNAR,
    });
    return input;
  }

  async function insertAlert(input: {
    leadId: string;
    targetUserId: string;
    nextShowAt: Date;
    intervalMinutes: number;
    occurrences?: number;
    maxOccurrences?: number | null;
    resolvedAt?: Date | null;
  }) {
    const id = crypto.randomUUID();
    created.alertIds.push(id);
    await db.insert(alerts).values({
      id,
      leadId: input.leadId,
      targetUserId: input.targetUserId,
      kind: ALERT_KIND.FOLLOW_UP,
      message: "Test alert",
      severity: "info",
      intervalMinutes: input.intervalMinutes,
      nextShowAt: input.nextShowAt,
      occurrences: input.occurrences ?? 0,
      maxOccurrences: input.maxOccurrences ?? null,
      resolvedAt: input.resolvedAt ?? null,
    });
    return id;
  }

  it("advances nextShowAt by intervalMinutes and increments occurrences", async () => {
    const closerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();
    await insertUser({ id: closerId, name: "Closer", email: "closer@test.com", roleId: "role-closer" });
    await insertLead({ id: leadId });

    const now = new Date();
    const intervalMinutes = 60;
    const alertId = await insertAlert({
      leadId,
      targetUserId: closerId,
      nextShowAt: new Date(now.getTime() - 1_000),
      intervalMinutes,
    });

    const processed = await processRecurringAlerts(now);
    expect(processed).toBe(1);

    const updated = await db.query.alerts.findFirst({ where: (table, { eq }) => eq(table.id, alertId) });
    expect(updated?.occurrences).toBe(1);
    expect(updated?.nextShowAt.getTime()).toBeGreaterThanOrEqual(now.getTime() + intervalMinutes * 60_000 - 1_000);
    expect(updated?.nextShowAt.getTime()).toBeLessThanOrEqual(now.getTime() + intervalMinutes * 60_000 + 1_000);
  });

  it("does not process alerts whose nextShowAt is in the future", async () => {
    const closerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();
    await insertUser({ id: closerId, name: "Closer", email: "closer@test.com", roleId: "role-closer" });
    await insertLead({ id: leadId });

    const now = new Date();
    const alertId = await insertAlert({
      leadId,
      targetUserId: closerId,
      nextShowAt: new Date(now.getTime() + 60_000),
      intervalMinutes: 60,
    });

    const processed = await processRecurringAlerts(now);
    expect(processed).toBe(0);

    const unchanged = await db.query.alerts.findFirst({ where: (table, { eq }) => eq(table.id, alertId) });
    expect(unchanged?.occurrences).toBe(0);
  });

  it("respects maxOccurrences", async () => {
    const closerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();
    await insertUser({ id: closerId, name: "Closer", email: "closer@test.com", roleId: "role-closer" });
    await insertLead({ id: leadId });

    const now = new Date();
    const alertId = await insertAlert({
      leadId,
      targetUserId: closerId,
      nextShowAt: new Date(now.getTime() - 1_000),
      intervalMinutes: 60,
      occurrences: 3,
      maxOccurrences: 3,
    });

    const processed = await processRecurringAlerts(now);
    expect(processed).toBe(0);

    const unchanged = await db.query.alerts.findFirst({ where: (table, { eq }) => eq(table.id, alertId) });
    expect(unchanged?.occurrences).toBe(3);
  });

  it("skips resolved alerts", async () => {
    const closerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();
    await insertUser({ id: closerId, name: "Closer", email: "closer@test.com", roleId: "role-closer" });
    await insertLead({ id: leadId });

    const now = new Date();
    const alertId = await insertAlert({
      leadId,
      targetUserId: closerId,
      nextShowAt: new Date(now.getTime() - 1_000),
      intervalMinutes: 60,
      resolvedAt: new Date(),
    });

    const processed = await processRecurringAlerts(now);
    expect(processed).toBe(0);

    const unchanged = await db.query.alerts.findFirst({ where: (table, { eq }) => eq(table.id, alertId) });
    expect(unchanged?.occurrences).toBe(0);
  });

  it("is idempotent when run twice with no time passing", async () => {
    const closerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();
    await insertUser({ id: closerId, name: "Closer", email: "closer@test.com", roleId: "role-closer" });
    await insertLead({ id: leadId });

    const now = new Date();
    const alertId = await insertAlert({
      leadId,
      targetUserId: closerId,
      nextShowAt: new Date(now.getTime() - 1_000),
      intervalMinutes: 60,
    });

    const firstRun = await processRecurringAlerts(now);
    expect(firstRun).toBe(1);

    const secondRun = await processRecurringAlerts(now);
    expect(secondRun).toBe(0);

    const updated = await db.query.alerts.findFirst({ where: (table, { eq }) => eq(table.id, alertId) });
    expect(updated?.occurrences).toBe(1);
  });

  it("processes multiple due alerts", async () => {
    const closerId = crypto.randomUUID();
    const leadId = crypto.randomUUID();
    await insertUser({ id: closerId, name: "Closer", email: "closer@test.com", roleId: "role-closer" });
    await insertLead({ id: leadId });

    const now = new Date();
    const alertIdA = await insertAlert({
      leadId,
      targetUserId: closerId,
      nextShowAt: new Date(now.getTime() - 2_000),
      intervalMinutes: 30,
    });
    const alertIdB = await insertAlert({
      leadId,
      targetUserId: closerId,
      nextShowAt: new Date(now.getTime() - 1_000),
      intervalMinutes: 60,
    });

    const processed = await processRecurringAlerts(now);
    expect(processed).toBe(2);

    const updatedA = await db.query.alerts.findFirst({ where: (table, { eq }) => eq(table.id, alertIdA) });
    const updatedB = await db.query.alerts.findFirst({ where: (table, { eq }) => eq(table.id, alertIdB) });
    expect(updatedA?.occurrences).toBe(1);
    expect(updatedB?.occurrences).toBe(1);
  });
});
