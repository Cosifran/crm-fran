import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QASessionPanel from "./qa-session-panel";

afterEach(() => {
  cleanup();
});

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
    })),
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const callerItems = [
  { question: "¿Fué contactado?", answer: "Sí", authorRole: "caller" as const, authorId: "u1" },
  { question: "¿Es el decisor?", answer: "Sí", authorRole: "caller" as const, authorId: "u1" },
  { question: "Producto recomendado", answer: "Product 1", authorRole: "caller" as const, authorId: "u1" },
];

const closerItems = [
  { question: "¿Fué contactado?", answer: "Confirmado", authorRole: "closer" as const, authorId: "u2" },
  { question: "¿Es el decisor?", answer: "No, su esposa", authorRole: "closer" as const, authorId: "u2" },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("QASessionPanel — read-only mode", () => {
  it("renders caller questions and answers when items exist", () => {
    render(
      <QASessionPanel role="caller" items={callerItems} leadId="lead-1" editable={false} />,
    );

    const allSí = screen.getAllByDisplayValue("Sí");
    expect(allSí).toHaveLength(2);
    expect(screen.getByDisplayValue("Product 1")).toBeInTheDocument();
    expect(screen.getByText("¿Fué contactado?")).toBeInTheDocument();
    expect(screen.getByText("Producto recomendado")).toBeInTheDocument();
  });

  it("shows empty state when no items and not editable", () => {
    render(
      <QASessionPanel role="caller" items={[]} leadId="lead-1" editable={false} />,
    );

    expect(screen.getByText("Sin respuestas del caller")).toBeInTheDocument();
    expect(screen.getByText("Aún no se registraron respuestas")).toBeInTheDocument();
  });
});

describe("QASessionPanel — editable mode", () => {
  it("renders form prefilled when closer items exist", () => {
    render(
      <QASessionPanel role="closer" items={closerItems} leadId="lead-1" editable={true} />,
    );

    expect(screen.getByDisplayValue("Confirmado")).toBeInTheDocument();
    expect(screen.getByDisplayValue("No, su esposa")).toBeInTheDocument();
    expect(screen.getByText("Actualizar respuestas")).toBeInTheDocument();
  });

  it("renders empty form when no closer items yet", () => {
    render(
      <QASessionPanel role="closer" items={[]} leadId="lead-1" editable={true} />,
    );

    // All inputs should be empty
    const inputs = screen.getAllByRole("textbox");
    for (const input of inputs) {
      expect(input).toHaveValue("");
    }

    expect(screen.getByText("Guardar respuestas")).toBeInTheDocument();
  });

  it("submits the form and calls the mutation", async () => {
    const user = userEvent.setup();
    render(
      <QASessionPanel role="closer" items={closerItems} leadId="lead-1" editable={true} />,
    );

    const submitButton = screen.getByText("Actualizar respuestas");
    await user.click(submitButton);

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: "lead-1" }),
    );
  });
});
