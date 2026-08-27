import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import AskCrmPage from "./page";

const mocks = vi.hoisted(() => ({
  askQueryOptions: vi.fn((input: unknown) => ({ kind: "ask", input })),
}));

vi.mock("@/utils/trpc", () => ({
  trpc: {
    askCrm: {
      catalog: { queryOptions: () => ({ kind: "catalog" }) },
      ask: { queryOptions: mocks.askQueryOptions },
    },
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { kind: string }) => options.kind === "catalog"
    ? { data: [], isPending: false, isError: false }
    : { data: undefined, isFetching: false, isError: false },
}));

vi.mock("@crm-fran/ui/permissions", () => ({
  usePermissionState: () => ({ permissions: ["*"] }),
}));

function requestedDays() {
  const calls = mocks.askQueryOptions.mock.calls;
  const input = calls[calls.length - 1]?.[0];
  if (typeof input !== "object" || input === null || !("overrides" in input)) throw new Error("Missing submitted request");
  const overrides = input.overrides;
  if (typeof overrides !== "object" || overrides === null || !("fromDay" in overrides) || !("toDay" in overrides)) throw new Error("Missing submitted period");
  if (typeof overrides.fromDay !== "string" || typeof overrides.toDay !== "string") throw new Error("Invalid submitted period");
  return (Date.parse(`${overrides.toDay}T00:00:00.000Z`) - Date.parse(`${overrides.fromDay}T00:00:00.000Z`)) / 86_400_000 + 1;
}

beforeEach(() => mocks.askQueryOptions.mockClear());
afterEach(cleanup);

describe("Pregúntale al CRM period precedence", () => {
  it("submits 60 days after the user types a natural-language 60-day period", () => {
    render(<AskCrmPage />);
    fireEvent.change(screen.getByLabelText("Pregunta"), { target: { value: "Qué anomalías hubo en los últimos 60 días" } });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(requestedDays()).toBe(60);
  });

  it("gives an explicit period chip precedence over the typed period", () => {
    render(<AskCrmPage />);
    fireEvent.change(screen.getByLabelText("Pregunta"), { target: { value: "Qué anomalías hubo en los últimos 60 días" } });
    fireEvent.click(screen.getByRole("button", { name: "30 d" }));
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(requestedDays()).toBe(30);
  });
});
