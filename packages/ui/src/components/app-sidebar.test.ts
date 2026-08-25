import { describe, expect, it } from "vitest";

import { canViewNavigationItem } from "./app-sidebar";
import { readFileSync } from "node:fs";

describe("app sidebar decision-center visibility", () => {
  it("hides global-only navigation from ordinary users", () => {
    expect(canViewNavigationItem({ globalOnly: true }, ["leads:read"])).toBe(false);
    expect(canViewNavigationItem({ globalOnly: true }, ["*"])).toBe(true);
    expect(canViewNavigationItem({}, ["leads:read"])).toBe(true);
  });
  it("names the financial truth destination explicitly", () => {
    expect(readFileSync(new URL("./app-sidebar.tsx", import.meta.url), "utf8")).toContain("Rentabilidad y verdad económica");
  });
});
