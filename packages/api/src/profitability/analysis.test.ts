import { describe, expect, it } from "vitest";

import {
  buildProfitabilityAnalysis,
  hasOverlappingSpendPeriod,
} from "./analysis";

const day = (value: string) => new Date(`${value}T12:00:00.000Z`);

describe("buildProfitabilityAnalysis", () => {
  it("attributes spend and estimated revenue to campaign, profile, caller, and closer", () => {
    const leads = Array.from({ length: 100 }, (_, index) => ({
      id: `lead-${index}`,
      profile: index < 50 ? "Emprendedor" : "Ingreso extra",
      source: "Meta",
      campaign: "Agosto",
      createdAt: day("2026-08-10"),
      callerId: index < 60 ? "caller-a" : "caller-b",
      callerName: index < 60 ? "Ana" : "Bruno",
      closerId: index < 70 ? "closer-a" : "closer-b",
      closerName: index < 70 ? "Carla" : "Diego",
      contacted: index < 80,
      appointment: index < 40,
      show: index < 20,
      sale: index < 10,
    }));

    const result = buildProfitabilityAnalysis({
      from: day("2026-08-01"),
      to: day("2026-08-31"),
      spendPeriods: [{
        id: "spend-1",
        source: "Meta",
        campaign: "Agosto",
        periodStart: day("2026-08-01"),
        periodEnd: day("2026-08-31"),
        spendCents: 100_000,
        referenceSaleValueCents: 200_000,
      }],
      leads,
    });

    expect(result.summary).toMatchObject({
      spendCents: 100_000,
      estimatedRevenueCents: 2_000_000,
      estimatedContributionCents: 1_900_000,
      leads: 100,
      sales: 10,
      costPerLeadCents: 1_000,
      customerAcquisitionCostCents: 10_000,
      roas: 20,
    });
    expect(result.campaigns[0]).toMatchObject({
      source: "Meta",
      campaign: "Agosto",
      contacted: 80,
      appointments: 40,
      shows: 20,
      sales: 10,
      suggestion: { action: "increase", suggestedBudgetChangePercent: 15 },
    });
    expect(result.profiles.find((row) => row.name === "Emprendedor")).toMatchObject({
      spendCents: 50_000,
      estimatedRevenueCents: 2_000_000,
      sales: 10,
    });
    expect(result.callers.find((row) => row.id === "caller-a")).toMatchObject({
      name: "Ana",
      spendCents: 60_000,
      sales: 10,
    });
    expect(result.closers.find((row) => row.id === "closer-a")).toMatchObject({
      name: "Carla",
      spendCents: 70_000,
      sales: 10,
    });
    expect(result.simulationOnly).toBe(true);
  });

  it("does not invent CAC and asks for more data when the sample is small", () => {
    const result = buildProfitabilityAnalysis({
      from: day("2026-08-01"),
      to: day("2026-08-31"),
      spendPeriods: [{
        id: "spend-1",
        source: "Google",
        campaign: "Search",
        periodStart: day("2026-08-01"),
        periodEnd: day("2026-08-31"),
        spendCents: 30_000,
        referenceSaleValueCents: 150_000,
      }],
      leads: Array.from({ length: 10 }, (_, index) => ({
        id: `lead-${index}`,
        profile: null,
        source: "Google",
        campaign: "Search",
        createdAt: day("2026-08-10"),
        callerId: null,
        callerName: null,
        closerId: null,
        closerName: null,
        contacted: false,
        appointment: false,
        show: false,
        sale: false,
      })),
    });

    expect(result.summary.customerAcquisitionCostCents).toBeNull();
    expect(result.campaigns[0]?.suggestion).toMatchObject({
      action: "wait",
      suggestedBudgetChangePercent: 0,
    });
  });
});

describe("hasOverlappingSpendPeriod", () => {
  it("detects overlap only within the same source and campaign", () => {
    const existing = [{
      id: "existing",
      source: "Meta",
      campaign: "Agosto",
      periodStart: day("2026-08-01"),
      periodEnd: day("2026-08-31"),
    }];

    expect(hasOverlappingSpendPeriod({ existing, source: "Meta", campaign: "Agosto", periodStart: day("2026-08-20"), periodEnd: day("2026-09-10") })).toBe(true);
    expect(hasOverlappingSpendPeriod({ existing, source: "Google", campaign: "Agosto", periodStart: day("2026-08-20"), periodEnd: day("2026-09-10") })).toBe(false);
    expect(hasOverlappingSpendPeriod({ existing, source: "Meta", campaign: "Agosto", periodStart: day("2026-09-01"), periodEnd: day("2026-09-30") })).toBe(false);
  });
});
