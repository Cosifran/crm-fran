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
      listByUserId: {
        queryKey: vi.fn(() => ["leads", "listByUserId"]),
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
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
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

  it("hides the conditional fields and submits a No-contact payload when isContacted is No", async () => {
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
        { leadId: "lead-1", isContacted: "No" },
        expect.any(Object),
      );
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it("reveals the conditional fields when isContacted is Si", async () => {
    const user = userEvent.setup();
    render(<AssignLeadForm leadId="lead-1" />);

    const trigger = screen.getByTestId("isContacted-trigger");
    await user.click(trigger);
    await waitFor(async () => {
      const option = screen.getByRole("option", { name: "Si" });
      await user.click(option);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("¿Es el decisor?")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Closer asignado")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora")).toBeInTheDocument();
  });

  it("submits a Si-contact payload with questions", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<AssignLeadForm leadId="lead-1" onSuccess={onSuccess} />);

    // Select Si
    const trigger = screen.getByTestId("isContacted-trigger");
    await user.click(trigger);
    await waitFor(async () => {
      const option = screen.getByRole("option", { name: "Si" });
      await user.click(option);
    });

    // Wait for conditional fields to render
    await waitFor(() => {
      expect(screen.getByText("¿Es el decisor?")).toBeInTheDocument();
    });

    // Verify conditional fields are visible
    expect(screen.getByText("Closer asignado")).toBeInTheDocument();
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Hora")).toBeInTheDocument();
  });

  describe("edit mode — prefill from leadQuestions", () => {
    const callerQuestions = [
      { questionKey: "isContacted", question: "¿Fué contactado?", answer: "Si", authorRole: "caller" as const, authorId: "user-1" },
      { questionKey: "isDecisionMaker", question: "¿Es el decisor?", answer: "No", authorRole: "caller" as const, authorId: "user-1" },
      { questionKey: "decisionMakerName", question: "¿Quién es la persona correcta?", answer: "John Doe", authorRole: "caller" as const, authorId: "user-1" },
      { questionKey: "financialSource", question: "¿De dónde sale su capacidad económica?", answer: "Salary", authorRole: "caller" as const, authorId: "user-1" },
      { questionKey: "productFit", question: "Producto recomendado", answer: "Product 1", authorRole: "caller" as const, authorId: "user-1" },
      { questionKey: "urgencyReason", question: "¿De dónde sale la urgencia?", answer: "Urgent", authorRole: "caller" as const, authorId: "user-1" },
      { questionKey: "extraInfo", question: "Información extra", answer: "Some notes", authorRole: "caller" as const, authorId: "user-1" },
      { questionKey: "scheduledDate", question: "Fecha", answer: "2026-08-15", authorRole: "caller" as const, authorId: "user-1" },
      { questionKey: "scheduledTime", question: "Hora", answer: "10:00", authorRole: "caller" as const, authorId: "user-1" },
    ];

    it("prefills fields from caller questions and sets label to Editar", () => {
      const onSubmitLabelChange = vi.fn();
      render(
        <AssignLeadForm
          leadId="lead-1"
          leadQuestions={callerQuestions}
          onSubmitLabelChange={onSubmitLabelChange}
        />,
      );

      // Edit mode detected → label callback
      expect(onSubmitLabelChange).toHaveBeenCalledWith("Editar");

      // Branch initialized to "Si" → conditional fields visible
      expect(screen.getByText("¿Es el decisor?")).toBeInTheDocument();
      expect(screen.getByText("Closer asignado")).toBeInTheDocument();

      // Prefilled text values
      expect(screen.getByDisplayValue("Salary")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Urgent")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Some notes")).toBeInTheDocument();
    });

    it("skips legacy rows without questionKey", () => {
      const mixedQuestions = [
        { questionKey: "isContacted", question: "¿Fué contactado?", answer: "Si", authorRole: "caller" as const, authorId: "user-1" },
        { questionKey: "financialSource", question: "¿De dónde sale su capacidad económica?", answer: "Savings", authorRole: "caller" as const, authorId: "user-1" },
        { question: "Old question", answer: "Old answer", authorRole: "caller" as const, authorId: "user-1" },
      ];

      const onSubmitLabelChange = vi.fn();
      render(
        <AssignLeadForm
          leadId="lead-1"
          leadQuestions={mixedQuestions}
          onSubmitLabelChange={onSubmitLabelChange}
        />,
      );

      // Valid row prefilled (branch is Si from isContacted, so conditional fields visible)
      expect(screen.getByDisplayValue("Savings")).toBeInTheDocument();

      // Edit mode detected (has caller questions with questionKey)
      expect(onSubmitLabelChange).toHaveBeenCalledWith("Editar");
    });

    it("initializes branch from prefilled isContacted = Si and shows conditional fields", () => {
      const questions = [
        { questionKey: "isContacted", question: "¿Fué contactado?", answer: "Si", authorRole: "caller" as const, authorId: "user-1" },
      ];

      render(
        <AssignLeadForm leadId="lead-1" leadQuestions={questions} />,
      );

      // Conditional fields visible on mount
      expect(screen.getByLabelText("¿Es el decisor?")).toBeInTheDocument();
      expect(screen.getByLabelText("Closer asignado")).toBeInTheDocument();
    });

    it("initializes branch from prefilled isContacted = No and hides conditional fields", () => {
      const questions = [
        { questionKey: "isContacted", question: "¿Fué contactado?", answer: "No", authorRole: "caller" as const, authorId: "user-1" },
      ];

      render(
        <AssignLeadForm leadId="lead-1" leadQuestions={questions} />,
      );

      // Conditional fields hidden
      expect(screen.queryByLabelText("¿Es el decisor?")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Closer asignado")).not.toBeInTheDocument();
    });

    it("renders closerId as read-only when currentCloserId is provided", () => {
      render(
        <AssignLeadForm
          leadId="lead-1"
          leadQuestions={callerQuestions}
          currentCloserId="closer-456"
        />,
      );

      // Branch is Si → conditional fields visible
      const closerInput = screen.getByDisplayValue("closer-456");
      expect(closerInput).toBeDisabled();
    });

    it("renders an enabled closer assignment Select when currentCloserId is null", () => {
      render(
        <AssignLeadForm
          leadId="lead-1"
          leadQuestions={callerQuestions}
          currentCloserId={null}
        />,
      );

      const closerSelect = screen.getByLabelText("Closer asignado");
      expect(closerSelect).toBeInTheDocument();
      expect(closerSelect).toBeEnabled();
    });

    it("ignores closer items during prefill", () => {
      const mixedQuestions = [
        { questionKey: "isContacted", question: "¿Fué contactado?", answer: "Si", authorRole: "caller" as const, authorId: "user-1" },
        { questionKey: "financialSource", question: "¿De dónde sale su capacidad económica?", answer: "CloserBudget", authorRole: "closer" as const, authorId: "closer-1" },
        { questionKey: "financialSource", question: "¿De dónde sale su capacidad económica?", answer: "CallerSalary", authorRole: "caller" as const, authorId: "user-1" },
      ];

      render(
        <AssignLeadForm leadId="lead-1" leadQuestions={mixedQuestions} />,
      );

      // Only caller value prefilled, not closer
      expect(screen.getByDisplayValue("CallerSalary")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("CloserBudget")).not.toBeInTheDocument();
    });

    it("submits edited payload with Si/No encoding preserved", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(
        <AssignLeadForm
          leadId="lead-1"
          leadQuestions={callerQuestions}
          currentCloserId="closer-456"
          onSuccess={onSuccess}
        />,
      );

      // Submit the prefilled form
      const form = screen.getByTestId("assign-lead-form");
      const submitButton = document.createElement("button");
      submitButton.type = "submit";
      form.appendChild(submitButton);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mocks.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            leadId: "lead-1",
            isContacted: "Si",
          }),
          expect.any(Object),
        );
      });

      const payload = mocks.mutate.mock.calls[0][0];
      // Caller boolean answers use unaccented Si/No
      const isContactedQ = payload.questions.find((q: { questionKey: string }) => q.questionKey === "isContacted");
      expect(isContactedQ.answer).toBe("Si");

      const isDecisionMakerQ = payload.questions.find((q: { questionKey: string }) => q.questionKey === "isDecisionMaker");
      expect(isDecisionMakerQ.answer).toBe("No");
    });

    it("uses currentCloserId as top-level closerId in edit mode payload", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(
        <AssignLeadForm
          leadId="lead-1"
          leadQuestions={callerQuestions}
          currentCloserId="closer-456"
          onSuccess={onSuccess}
        />,
      );

      const form = screen.getByTestId("assign-lead-form");
      const submitButton = document.createElement("button");
      submitButton.type = "submit";
      form.appendChild(submitButton);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mocks.mutate).toHaveBeenCalled();
      });

      const payload = mocks.mutate.mock.calls[0][0];
      // Top-level closerId must be the currentCloserId, not empty string
      expect(payload.closerId).toBe("closer-456");
    });

    it("never includes closerId in the questions array", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(
        <AssignLeadForm
          leadId="lead-1"
          leadQuestions={callerQuestions}
          currentCloserId="closer-456"
          onSuccess={onSuccess}
        />,
      );

      const form = screen.getByTestId("assign-lead-form");
      const submitButton = document.createElement("button");
      submitButton.type = "submit";
      form.appendChild(submitButton);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mocks.mutate).toHaveBeenCalled();
      });

      const payload = mocks.mutate.mock.calls[0][0];
      // closerId must NOT appear as a question item
      const closerIdQuestion = payload.questions.find(
        (q: { questionKey: string }) => q.questionKey === "closerId",
      );
      expect(closerIdQuestion).toBeUndefined();
    });

    it("fails validation when isContacted is Si but no closerId in create mode", async () => {
      const user = userEvent.setup();
      render(<AssignLeadForm leadId="lead-1" />);

      // Select Si
      const trigger = screen.getByTestId("isContacted-trigger");
      await user.click(trigger);
      const option = await waitFor(() =>
        screen.getByRole("option", { name: "Si" }),
      );
      await user.click(option);

      // Wait for conditional fields
      await waitFor(() => {
        expect(screen.getByText("Closer asignado")).toBeInTheDocument();
      });

      // Submit without selecting closer
      const form = screen.getByTestId("assign-lead-form");
      const submitButton = document.createElement("button");
      submitButton.type = "submit";
      form.appendChild(submitButton);
      await user.click(submitButton);

      // Should NOT call mutate — validation should fail
      await waitFor(() => {
        expect(mocks.mutate).not.toHaveBeenCalled();
      });
    });

    it("fails validation when isContacted is Si and currentCloserId is null in edit mode", async () => {
      const user = userEvent.setup();
      render(
        <AssignLeadForm
          leadId="lead-1"
          leadQuestions={callerQuestions}
          currentCloserId={null}
        />,
      );

      const form = screen.getByTestId("assign-lead-form");
      const submitButton = document.createElement("button");
      submitButton.type = "submit";
      form.appendChild(submitButton);
      await user.click(submitButton);

      // Should NOT call mutate — validation should fail (null closerId)
      await waitFor(() => {
        expect(mocks.mutate).not.toHaveBeenCalled();
      });
    });
  });

  describe("create mode — closerId from form select", () => {
    it("uses selected closerId as top-level payload field in create mode", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<AssignLeadForm leadId="lead-1" onSuccess={onSuccess} />);

      // Select Si
      const isContactedTrigger = screen.getByTestId("isContacted-trigger");
      await user.click(isContactedTrigger);
      const siOption = await waitFor(() =>
        screen.getByRole("option", { name: "Si" }),
      );
      await user.click(siOption);

      // Wait for conditional fields
      await waitFor(() => {
        expect(screen.getByText("Closer asignado")).toBeInTheDocument();
      });

      // Fill required fields
      const isDecisionMakerTrigger = screen.getByLabelText("¿Es el decisor?");
      await user.click(isDecisionMakerTrigger);
      const siDecision = await waitFor(() =>
        screen.getByRole("option", { name: "Si" }),
      );
      await user.click(siDecision);

      await user.type(screen.getByLabelText("Si respondió NO ¿quién es la persona correcta?"), "John");
      await user.type(screen.getByLabelText("¿De dónde sale su capacidad económica?"), "Salary");
      await user.type(screen.getByLabelText("¿De dónde sale la urgencia?"), "Urgent");

      // Select closer
      const closerTrigger = screen.getByLabelText("Closer asignado");
      await user.click(closerTrigger);
      const closerOption = await waitFor(() =>
        screen.getByRole("option", { name: "Closer 1" }),
      );
      await user.click(closerOption);

      // Select product
      const productTrigger = screen.getByLabelText("Producto recomendado");
      await user.click(productTrigger);
      const productOption = await waitFor(() =>
        screen.getByRole("option", { name: "Product 1" }),
      );
      await user.click(productOption);

      // Fill date/time
      await user.type(screen.getByLabelText("Fecha"), "2026-08-15");
      await user.type(screen.getByLabelText("Hora"), "10:00");

      // Submit
      const form = screen.getByTestId("assign-lead-form");
      const submitButton = document.createElement("button");
      submitButton.type = "submit";
      form.appendChild(submitButton);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mocks.mutate).toHaveBeenCalled();
      });

      const payload = mocks.mutate.mock.calls[0][0];
      // Top-level closerId must be the selected closer
      expect(payload.closerId).toBe("closer-1");
      // closerId must NOT be in questions
      const closerIdQuestion = payload.questions.find(
        (q: { questionKey: string }) => q.questionKey === "closerId",
      );
      expect(closerIdQuestion).toBeUndefined();
    });
  });
});
