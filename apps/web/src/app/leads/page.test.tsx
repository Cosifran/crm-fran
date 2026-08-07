import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LeadsPage from "./page";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  useQuery: vi.fn(),
  listAllQueryOptions: vi.fn((input: unknown) => ({ input })),
  listByUserIdQueryOptions: vi.fn((input: unknown) => ({ input })),
  dateRangePickerOnChange: undefined as
    | ((range: { from?: string; to?: string }) => void)
    | undefined,
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: mocks.useSession },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
}));

vi.mock("@/utils/trpc", () => ({
  trpc: {
    leads: {
      listAll: { queryOptions: mocks.listAllQueryOptions },
      listByUserId: { queryOptions: mocks.listByUserIdQueryOptions },
    },
  },
}));

vi.mock("@/components/date-range-picker", () => ({
  DateRangePicker: (props: {
    onChange: (range: { from?: string; to?: string }) => void;
  }) => {
    mocks.dateRangePickerOnChange = props.onChange;
    return null;
  },
}));

vi.mock("@crm-fran/ui/components/data-table", () => ({
  DataTable: () => null,
}));

vi.mock("@/features/table/columns", () => ({
  createLeadColumns: () => [],
}));

vi.mock("@/features/leads/lead-view-drawer", () => ({
  default: () => null,
}));

vi.mock("@/features/leads/assign-lead-drawer", () => ({
  default: () => null,
}));

describe("LeadsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockReturnValue({ data: [], isLoading: false });
  });

  it("does not enable a leads query while the session is pending", () => {
    mocks.useSession.mockReturnValue({ data: undefined, isPending: true });

    render(<LeadsPage />);

    expect(mocks.useQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ enabled: false })
    );
    expect(mocks.useQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ enabled: false })
    );
  });

  it("passes the selected direct date range to both query option paths", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { roleId: "role-admin" } },
      isPending: false,
    });

    render(<LeadsPage />);

    expect(mocks.listAllQueryOptions).toHaveBeenCalledWith(undefined);
    expect(mocks.listByUserIdQueryOptions).toHaveBeenCalledWith(undefined);

    act(() => {
      mocks.dateRangePickerOnChange?.({
        from: "2026-01-01",
        to: "2026-01-31",
      });
    });

    expect(mocks.listAllQueryOptions).toHaveBeenLastCalledWith({
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(mocks.listByUserIdQueryOptions).toHaveBeenLastCalledWith({
      from: "2026-01-01",
      to: "2026-01-31",
    });
  });
});
