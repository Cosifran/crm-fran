import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "page.tsx"), "utf8");

describe("Pregúntale al CRM page contract", () => {
  it("uses only the two read queries and exposes all response states", () => {
    expect(source).toContain("trpc.askCrm.catalog");
    expect(source).toContain("trpc.askCrm.ask");
    expect(source).not.toContain("useMutation");
    expect(source).toContain("explanation.temporalScope.label");
    expect(source).not.toContain("explanation.period.fromDay");
    for (const state of ["clarification_required", "insufficient_evidence", "unsupported", "Acceso restringido", "Cómo se calculó"]) expect(source).toContain(state);
  });

  it("keeps bounded in-memory history without localStorage", () => {
    expect(source).toContain("slice(0, 5)");
    expect(source).not.toContain("localStorage");
  });
});
