import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AssignLeadForm from "./assign-lead-form";

afterEach(() => cleanup());

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  listClosersQueryOptions: vi.fn(() => ({ queryKey: ["users", "listClosers"] })),
  assignLeadMutationOptions: vi.fn(() => ({
    mutationKey: ["leads", "assignLead"],
  })),
}));

vi.mock("@/utils/trpc", () => ({
  trpc: {
    leads: {
      assignLead: { mutationOptions: mocks.assignLeadMutationOptions },
      listByUserId: { queryKey: vi.fn(() => ["leads", "listByUserId"]) },
    },
    users: {
      listClosers: { queryOptions: mocks.listClosersQueryOptions },
    },
  },
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );

  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: [{ id: "closer-1", name: "Closer 1" }],
      isLoading: false,
    })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    useMutation: vi.fn(() => ({
      mutate: mocks.mutate,
      isPending: false,
      status: "idle",
    })),
  };
});

function appendSubmitButton() {
  const form = screen.getByTestId("assign-lead-form");
  const button = document.createElement("button");
  button.type = "submit";
  form.appendChild(button);
  return button;
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  triggerTestId: string,
  label: string,
) {
  await user.click(screen.getByTestId(triggerTestId));
  await user.click(await screen.findByRole("option", { name: label }));
}

describe("AssignLeadForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutate.mockImplementation((_variables, options) => {
      options?.onSuccess?.();
    });
  });

  it("keeps the first contact decision and sends No directly to the existing alert path", async () => {
    const user = userEvent.setup();
    render(<AssignLeadForm leadId="lead-1" />);

    await chooseOption(user, "isContacted-trigger", "No");

    expect(screen.queryByTestId("outcome-trigger")).not.toBeInTheDocument();
    await user.click(appendSubmitButton());

    await waitFor(() => {
      expect(mocks.mutate).toHaveBeenCalledWith(
        { leadId: "lead-1", isContacted: "No" },
        expect.any(Object),
      );
    });
  });

  it.each([
    ["No encaja", "not_fit"],
    ["No interesado", "not_interested"],
  ] as const)(
    "shows previous questions as optional for %s",
    async (label, outcome) => {
      const user = userEvent.setup();
      render(<AssignLeadForm leadId="lead-1" />);

      await chooseOption(user, "isContacted-trigger", "Si");
      await chooseOption(user, "outcome-trigger", label);

      expect(screen.getByLabelText("¿Es el decisor?")).toBeInTheDocument();
      expect(screen.getByLabelText("Información extra")).toBeInTheDocument();
      expect(screen.queryByLabelText("Closer asignado")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Importancia de la alerta")).not.toBeInTheDocument();

      await user.click(appendSubmitButton());

      await waitFor(() => {
        expect(mocks.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            leadId: "lead-1",
            isContacted: "Si",
            outcome,
          }),
          expect.any(Object),
        );
      });
    },
  );

  it("shows previous questions plus alert configuration for future calls", async () => {
    const user = userEvent.setup();
    render(<AssignLeadForm leadId="lead-1" />);

    await chooseOption(user, "isContacted-trigger", "Si");
    await chooseOption(user, "outcome-trigger", "Llamar a futuro");

    expect(screen.getByLabelText("¿Es el decisor?")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora")).toBeInTheDocument();
    expect(screen.getByLabelText("Importancia de la alerta")).toBeInTheDocument();
    expect(screen.queryByLabelText("Closer asignado")).not.toBeInTheDocument();
  });

  it("shows previous questions plus closer/date/time for appointments", async () => {
    const user = userEvent.setup();
    render(<AssignLeadForm leadId="lead-1" />);

    await chooseOption(user, "isContacted-trigger", "Si");
    await chooseOption(user, "outcome-trigger", "Agenda");

    expect(screen.getByLabelText("¿Es el decisor?")).toBeInTheDocument();
    expect(screen.getByLabelText("Closer asignado")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora")).toBeInTheDocument();
    expect(screen.queryByLabelText("Importancia de la alerta")).not.toBeInTheDocument();
  });
});
