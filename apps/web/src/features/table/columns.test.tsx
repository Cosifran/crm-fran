import { describe, expect, it } from "vitest";
import { createLeadColumns } from "./columns";

type LeadRow = {
  caller?: { id: string; name: string | null } | null;
  closer?: { id: string; name: string | null } | null;
};

function getColumn(header: string) {
  const column = createLeadColumns(() => null).find(
    (column) => column.header === header,
  );

  if (!column || typeof column.cell !== "function") {
    throw new Error(`Column ${header} does not expose a cell renderer`);
  }

  return column;
}

function renderCell(header: string, row: LeadRow) {
  return getColumn(header).cell!({ row: { original: row } } as never);
}

describe("Lead user columns", () => {
  it("renders caller and closer names for assigned users", () => {
    const row = {
      caller: { id: "caller-1", name: "Ana Caller" },
      closer: { id: "closer-1", name: "Bruno Closer" },
    };

    expect(renderCell("Caller", row)).toBe("Ana Caller");
    expect(renderCell("Closer", row)).toBe("Bruno Closer");
  });

  it("renders Sin asignar for missing relations or names", () => {
    expect(
      renderCell("Caller", { caller: null, closer: { id: "closer-1", name: null } }),
    ).toBe("Sin asignar");
    expect(
      renderCell("Closer", { caller: undefined, closer: undefined }),
    ).toBe("Sin asignar");
  });

  it("uses name-based headers instead of ID headers", () => {
    const columns = createLeadColumns(() => null);
    const headers = columns.map((column) => column.header);

    expect(headers).toContain("Caller");
    expect(headers).toContain("Closer");
    expect(headers).not.toContain("Caller ID");
    expect(headers).not.toContain("Closer ID");
  });
});
