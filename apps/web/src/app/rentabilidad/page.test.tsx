import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import ProfitabilityPage from "./page";

afterEach(cleanup);

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  invalidateQueries: vi.fn(),
}));

vi.mock("@/utils/trpc", () => ({ trpc: { profitability: {
  overview: { queryOptions: () => ({ queryKey: ["profitability"], key: "profitability" }), queryKey: () => ["profitability"] },
  saveSpend: { mutationOptions: () => ({}) },
  deleteSpend: { mutationOptions: () => ({}) },
} } }));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery, useMutation: mocks.useMutation, useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }) }));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const metrics = { spendCents: 100_000, estimatedRevenueCents: 400_000, estimatedContributionCents: 300_000, leads: 40, contacted: 30, appointments: 15, shows: 8, sales: 2, costPerLeadCents: 2_500, customerAcquisitionCostCents: 50_000, roas: 4, leadToSaleRate: 0.05 };

describe("ProfitabilityPage", () => {
  it("renders suggestion-only financial analysis in five sections", () => {
    mocks.useQuery.mockReturnValue({ data: {
      summary: metrics,
      campaigns: [{ source: "Meta", campaign: "Agosto", ...metrics, suggestion: { action: "increase", suggestedBudgetChangePercent: 15, reasons: ["ROAS suficiente"] } }],
      profiles: [{ id: "p", name: "Emprendedor", ...metrics }],
      callers: [{ id: "c", name: "Ana", ...metrics }],
      closers: [],
      spendPeriods: [],
      campaignOptions: [{ source: "Meta", campaign: "Agosto" }],
      simulationOnly: true,
      methodology: "Atribución por cohorte",
    }, isPending: false, isError: false });

    render(<ProfitabilityPage />);

    expect(screen.getByText("Rentabilidad y atribución")).toBeInTheDocument();
    expect(screen.getByText("Modo sugerencia")).toBeInTheDocument();
    for (const tab of ["Resumen", "Campañas", "Equipo", "Perfiles", "Gastos"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("tab", { name: "Campañas" }));
    expect(screen.getByText("Aumentar 15%")).toBeInTheDocument();
    expect(screen.getByText("ROAS suficiente")).toBeInTheDocument();
  });
});
