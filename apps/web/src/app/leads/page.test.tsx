import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LeadsPage from "./page";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  useQuery: vi.fn(),
  listAllQueryOptions: vi.fn(() => ({})),
  listByUserIdQueryOptions: vi.fn(() => ({})),
  dateRangePickerOnChange: undefined as
    | ((range: { from?: string; to?: string }) => void)
    | undefined,
  dateFieldSelectOnValueChange: undefined as
    | ((value: string | null) => void)
    | undefined,
  dataTableData: [] as unknown[][],
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
  DataTable: (props: { data: unknown[] }) => {
    mocks.dataTableData.push(props.data);
    return null;
  },
}));

vi.mock("@crm-fran/ui/components/select", () => ({
  Select: (props: {
    onValueChange: (value: string | null) => void;
  }) => {
    mocks.dateFieldSelectOnValueChange = props.onValueChange;
    return null;
  },
  SelectContent: () => null,
  SelectGroup: () => null,
  SelectItem: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
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
    mocks.dataTableData = [];
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

  it("filters loaded leads locally when the selected date field changes", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { roleId: "role-admin" } },
      isPending: false,
    });
    const createdAtMatch = {
      id: "created-at-match",
      createdAt: new Date(2026, 0, 15, 12),
      updatedAt: new Date(2026, 1, 15, 12),
    };
    const updatedAtMatch = {
      id: "updated-at-match",
      createdAt: new Date(2026, 1, 15, 12),
      updatedAt: new Date(2026, 0, 15, 12),
    };
    mocks.useQuery.mockReturnValue({
      data: [createdAtMatch, updatedAtMatch],
      isLoading: false,
    });

    render(<LeadsPage />);

    expect(mocks.listAllQueryOptions).toHaveBeenCalledWith();
    expect(mocks.listByUserIdQueryOptions).toHaveBeenCalledWith();

    act(() => {
      mocks.dateRangePickerOnChange?.({
        from: "2026-01-01",
        to: "2026-01-31",
      });
    });

    expect(mocks.dataTableData.at(-1)).toEqual([createdAtMatch]);

    act(() => {
      mocks.dateFieldSelectOnValueChange?.("updatedAt");
    });

    expect(mocks.dataTableData.at(-1)).toEqual([updatedAtMatch]);
    expect(
      mocks.listAllQueryOptions.mock.calls.every((args) => args.length === 0)
    ).toBe(true);
    expect(
      mocks.listByUserIdQueryOptions.mock.calls.every((args) => args.length === 0)
    ).toBe(true);
  });
});
