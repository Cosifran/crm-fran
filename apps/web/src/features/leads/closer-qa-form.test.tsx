import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CloserQAForm from "./closer-qa-form";

afterEach(() => {
  cleanup();
});

// ── Mocks ────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  recordCloserAnswersMutationOptions: vi.fn(() => ({
    mutationKey: ["leads", "recordCloserAnswers"],
  })),
}));

vi.mock("@/utils/trpc", () => ({
  trpc: {
    leads: {
      recordCloserAnswers: {
        mutationOptions: mocks.recordCloserAnswersMutationOptions,
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
    useMutation: vi.fn(() => ({
      mutate: mocks.mutate,
      isPending: false,
      status: "idle",
      isSuccess: false,
      isError: false,
    })),
  };
});

// ── Tests ────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

describe("CloserQAForm — integración con el drawer", () => {
  it("renders the form with the expected id for the drawer's submit button to attach", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CloserQAForm leadId="lead-1" leadQuestions={[]} />
      </QueryClientProvider>,
    );

    const form = screen.getByTestId("closer-qa-form");
    expect(form).toBeInTheDocument();
    expect(form.tagName).toBe("FORM");
    expect(form).toHaveAttribute("id", "closer-qa-form");
  });

  it("does NOT render any submit button of its own (el padre controla el submit)", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CloserQAForm leadId="lead-1" leadQuestions={[]} />
      </QueryClientProvider>,
    );

    const form = screen.getByTestId("closer-qa-form");
    const submitButtons = form.querySelectorAll('button[type="submit"]');
    expect(submitButtons).toHaveLength(0);
  });
});