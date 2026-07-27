import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AssignLeadForm from "./assign-lead-form";

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
    const onSuccess = vi.fn();
    render(<AssignLeadForm leadId="lead-1" onSuccess={onSuccess} />);

    const trigger = screen.getByTestId("isContacted-trigger");
    fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "No" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("option", { name: "No" }));

    expect(screen.queryByLabelText("¿Es el decisor?")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Closer asignado")).not.toBeInTheDocument();

    fireEvent.submit(screen.getByTestId("assign-lead-form"));

    await waitFor(() => {
      expect(mocks.mutate).toHaveBeenCalledWith(
        { leadId: "lead-1", isContacted: "no" },
        expect.any(Object),
      );
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it("reveals the conditional fields when isContacted is yes", async () => {
    render(<AssignLeadForm leadId="lead-1" />);

    const trigger = screen.getByTestId("isContacted-trigger");
    fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Sí" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("option", { name: "Sí" }));

    expect(screen.getByLabelText("¿Es el decisor?")).toBeInTheDocument();
    expect(screen.getByLabelText("Closer asignado")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora")).toBeInTheDocument();
  });
});
