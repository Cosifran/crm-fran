import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssignLeadDrawer from "./assign-lead-drawer";

afterEach(() => {
  cleanup();
});

// ── Mocks ────────────────────────────────────────────────────────────────────

type SessionState = {
  data: { user: { id: string; roleId: string } } | null;
};
type PermissionState = {
  permissions: readonly string[];
  role: {
    id: string;
    name: string;
    permissions: { id: string; name: string; description: null }[];
  } | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
};

const mocks = vi.hoisted(() => ({
  useSession: vi.fn<() => SessionState>(),
  usePermissionState: vi.fn<() => PermissionState>(),
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

vi.mock("./closer-qa-form", () => ({
  default: vi.fn(() => (
    <form id="closer-qa-form" data-testid="closer-qa-form">
      <input data-testid="closer-input" />
    </form>
  )),
}));

vi.mock("./admin-qa-editor", () => ({
  default: vi.fn(({ activeTab }: { activeTab: "caller" | "closer" }) => {
    const formId =
      activeTab === "caller" ? "admin-caller-form" : "admin-closer-form";
    return (
      <form id={formId} data-testid={formId}>
        <input data-testid={`${activeTab}-input`} />
      </form>
    );
  }),
}));

// assign-lead-form ya tiene su propio test; lo mockeamos liviano acá
vi.mock("./assign-lead-form", () => ({
  default: vi.fn(() => (
    <form id="assign-lead-form" data-testid="assign-lead-form">
      <input />
    </form>
  )),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const lead = {
  id: "lead-1",
  name: "Test Lead",
  email: "test@example.com",
  phone: "+54 11 5555 5555",
  state: "Nuevo",
  response: "",
  feedback: "",
  questions: [],
  callerId: null,
  closerId: null,
  caller: null,
  closer: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /abrir drawer/i }));
}

function setupRole(role: "role-caller" | "role-closer" | "role-admin") {
  mocks.useSession.mockReturnValue({
    data: { user: { id: "u1", roleId: role } },
  });
  if (role === "role-admin") {
    mocks.usePermissionState.mockReturnValue({
      permissions: ["*"],
      role: {
        id: "admin",
        name: "Admin",
        permissions: [{ id: "*", name: "Administrator", description: null }],
      },
      isLoaded: true,
      isLoading: false,
      error: null,
    });
  } else {
    mocks.usePermissionState.mockReturnValue({
      permissions: [],
      role: null,
      isLoaded: true,
      isLoading: false,
      error: null,
    });
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AssignLeadDrawer — orquesta submitFormId por rol", () => {
  it("caller: pasa submitFormId='assign-lead-form' al drawer", async () => {
    setupRole("role-caller");
    const user = userEvent.setup();

    render(<AssignLeadDrawer lead={lead} />);
    await openDrawer(user);

    expect(screen.getByTestId("assign-lead-form")).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: /guardar/i });
    expect(submitButton).toHaveAttribute("form", "assign-lead-form");
  });

  it("closer: pasa submitFormId='closer-qa-form' al drawer", async () => {
    setupRole("role-closer");
    const user = userEvent.setup();

    render(<AssignLeadDrawer lead={lead} />);
    await openDrawer(user);

    expect(screen.getByTestId("closer-qa-form")).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: /guardar/i });
    expect(submitButton).toHaveAttribute("form", "closer-qa-form");
  });

  it("admin: el form activo del footer refleja el activeTab inicial", async () => {
    setupRole("role-admin");
    const user = userEvent.setup();

    render(<AssignLeadDrawer lead={lead} />);
    await openDrawer(user);

    // El activeTab por defecto es 'caller' → el form del footer debe ser admin-caller-form
    expect(screen.getByTestId("admin-caller-form")).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: /guardar/i });
    expect(submitButton).toHaveAttribute("form", "admin-caller-form");
  });

  it("admin: al cambiar de tab el submitFormId del footer se actualiza", async () => {
    setupRole("role-admin");
    const user = userEvent.setup();

    render(<AssignLeadDrawer lead={lead} />);
    await openDrawer(user);

    // Estado inicial: caller
    expect(
      screen.getByRole("button", { name: /guardar/i }),
    ).toHaveAttribute("form", "admin-caller-form");

    // Cambiamos al tab closer
    await user.click(screen.getByRole("tab", { name: /sesión del closer/i }));

    // Ahora el submit debe apuntar al form del closer
    expect(
      screen.getByRole("button", { name: /guardar/i }),
    ).toHaveAttribute("form", "admin-closer-form");
    expect(screen.getByTestId("admin-closer-form")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-caller-form")).not.toBeInTheDocument();
  });
});
