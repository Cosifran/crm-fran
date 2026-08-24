import { describe, expect, it } from "vitest";

import type { Context } from "../context";
import {
  profitabilityOverviewInput,
  profitabilityRouter,
  profitabilitySpendInput,
} from "./profitability";

describe("profitability router contracts", () => {
  it("rejects impossible and inverted report windows", () => {
    expect(() => profitabilityOverviewInput.parse({ from: "2026-02-30", to: "2026-08-23" })).toThrow();
    expect(() => profitabilityOverviewInput.parse({ from: "2026-08-23", to: "2026-08-01" })).toThrow();
  });

  it("requires positive spend and sale values with an ordered period", () => {
    expect(() => profitabilitySpendInput.parse({ source: "Meta", campaign: "Agosto", periodStart: "2026-08-01", periodEnd: "2026-08-31", spendEuros: 0, referenceSaleValueEuros: 2_000 })).toThrow();
    expect(() => profitabilitySpendInput.parse({ source: "Meta", campaign: "Agosto", periodStart: "2026-09-01", periodEnd: "2026-08-31", spendEuros: 1_000, referenceSaleValueEuros: 2_000 })).toThrow();
  });

  it("registers read-only analysis and manual spend management", () => {
    expect(profitabilityRouter._def.procedures).toMatchObject({
      overview: expect.anything(),
      saveSpend: expect.anything(),
      deleteSpend: expect.anything(),
    });
  });

  it("rejects non-admin users before reading financial data", async () => {
    const caller = profitabilityRouter.createCaller({
      session: { user: { id: "caller", roleId: "caller", name: "Caller", email: "caller@example.com", emailVerified: true, createdAt: new Date(), updatedAt: new Date() } },
      role: { id: "caller", name: "Caller", permissions: ["leads:read"] },
      permissions: ["leads:read"],
    } as Context);

    await expect(caller.overview({ from: "2026-08-01", to: "2026-08-31" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
