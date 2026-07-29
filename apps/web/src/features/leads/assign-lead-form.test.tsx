import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssignLeadForm from "./assign-lead-form";

afterEach(() => {
  cleanup();
});

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
      assignLead: {
        mutationOptions: mocks.assignLeadMutationOptions,
      },
    },
    users: {
      listClosers: {
        queryOptions: mocks.listClosersQueryOptions,
      },
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
    useMutation: vi.fn(() => ({
      mutate: mocks.mutate,
      isPending: false,
      status: "idle",
    })),
  };
});

describe("AssignLeadForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutate.mockImplementation((_vars, options) => {
      options?.onSuccess?.();
    });
  });

  it("hides the conditional fields and submits a no-contact payload when isContacted is no", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<AssignLeadForm leadId="lead-1" onSuccess={onSuccess} />);

    const trigger = screen.getByTestId("isContacted-trigger");
    await user.click(trigger);
    const option = await waitFor(() =>
      screen.getByRole("option", { name: "No" }),
    );
    await user.click(option);

    expect(screen.queryByLabelText("¿Es el decisor?")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Closer asignado")).not.toBeInTheDocument();

    const form = screen.getByTestId("assign-lead-form");
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    form.appendChild(submitButton);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mocks.mutate).toHaveBeenCalledWith(
        { leadId: "lead-1", isContacted: "no" },
        expect.any(Object),
      );
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it("reveals the conditional fields when isContacted is yes", async () => {
    const user = userEvent.setup();
    render(<AssignLeadForm leadId="lead-1" />);

    const trigger = screen.getByTestId("isContacted-trigger");
    await user.click(trigger);
    const option = await waitFor(() =>
      screen.getByRole("option", { name: "Sí" }),
    );
    await user.click(option);

    expect(screen.getByLabelText("¿Es el decisor?")).toBeInTheDocument();
    expect(screen.getByLabelText("Closer asignado")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora")).toBeInTheDocument();
  });
});
