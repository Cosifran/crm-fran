import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import LeadDetails from "./lead-details";

afterEach(() => {
  cleanup();
});

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(() => ({ data: null })),
  usePermissionState: vi.fn(() => ({ permissions: [], role: null, isLoaded: true, isLoading: false, error: null })),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: mocks.useSession,
  },
}));

vi.mock("@crm-fran/ui/permissions", () => ({
  usePermissionState: mocks.usePermissionState,
  PermissionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock QASessionPanel to avoid needing trpc/react-query mocks in this test
vi.mock("./qa-session-panel", () => ({
  default: vi.fn(() => <div data-testid="qa-session-panel-mock" />),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const leadWithQuestions = {
  id: "lead-1",
  closerId: "closer-1",
  questions: [
    { question: "¿Fué contactado?", answer: "Sí", authorRole: "caller" as const, authorId: "u1" },
    { question: "¿Es el decisor?", answer: "No", authorRole: "caller" as const, authorId: "u1" },
    { question: "¿Fué contactado?", answer: "Confirmado", authorRole: "closer" as const, authorId: "closer-1" },
  ],
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("LeadDetails — layout", () => {
  it("renders caller and closer section headings", () => {
    render(<LeadDetails lead={leadWithQuestions} />);

    // "Sesión del caller" appears in both mobile Tabs trigger AND desktop Label
    const callerLabels = screen.getAllByText("Sesión del caller");
    expect(callerLabels.length).toBeGreaterThanOrEqual(1);

    const closerLabels = screen.getAllByText("Sesión del closer");
    expect(closerLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("renders three QASessionPanel instances (1 active mobile tab + 2 desktop)", () => {
    render(<LeadDetails lead={leadWithQuestions} />);

    const panels = screen.getAllByTestId("qa-session-panel-mock");
    expect(panels).toHaveLength(3);
  });
});

describe("LeadDetails — editability smoke tests", () => {
  it("renders for a non-admin, non-closer user", () => {
    mocks.useSession.mockReturnValue({ data: { user: { id: "other-user" } } });
    mocks.usePermissionState.mockReturnValue({
      permissions: [],
      role: null,
      isLoaded: true,
      isLoading: false,
      error: null,
    });

    render(<LeadDetails lead={leadWithQuestions} />);
    const panels = screen.getAllByTestId("qa-session-panel-mock");
    expect(panels).toHaveLength(3);
  });

  it("renders for admin user", () => {
    mocks.useSession.mockReturnValue({ data: { user: { id: "u1" } } });
    mocks.usePermissionState.mockReturnValue({
      permissions: ["*"],
      role: { id: "admin", name: "Admin", permissions: [{ id: "*", name: "Administrator", description: null }] },
      isLoaded: true,
      isLoading: false,
      error: null,
    });

    render(<LeadDetails lead={leadWithQuestions} />);
    const panels = screen.getAllByTestId("qa-session-panel-mock");
    expect(panels).toHaveLength(3);
  });

  it("renders for the closer user", () => {
    mocks.useSession.mockReturnValue({ data: { user: { id: "closer-1" } } });
    mocks.usePermissionState.mockReturnValue({
      permissions: [],
      role: null,
      isLoaded: true,
      isLoading: false,
      error: null,
    });

    render(<LeadDetails lead={leadWithQuestions} />);
    const panels = screen.getAllByTestId("qa-session-panel-mock");
    expect(panels).toHaveLength(3);
  });
});
