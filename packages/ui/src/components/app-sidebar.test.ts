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
  it("keeps commercial planning global-only", () => {
    const source = readFileSync(new URL("./app-sidebar.tsx", import.meta.url), "utf8");
    expect(source).toContain('title: "Planificación comercial"');
    expect(source).toMatch(/title: "Planificación comercial"[\s\S]*?globalOnly: true/);
  });
  it("keeps learning playbooks beside commercial intelligence and global-only", () => {
    const source = readFileSync(new URL("./app-sidebar.tsx", import.meta.url), "utf8");
    expect(source).toMatch(/title: "Inteligencia comercial"[\s\S]*?title: "Playbooks que aprenden"/);
    expect(source).toMatch(/title: "Playbooks que aprenden"[\s\S]*?globalOnly: true/);
  });
  it("places Pregúntale al CRM after the decision centre and keeps it global-only", () => {
    const source = readFileSync(new URL("./app-sidebar.tsx", import.meta.url), "utf8");
    expect(source).toMatch(/title: "Centro de decisiones"[\s\S]*?title: "Pregúntale al CRM"/);
    expect(source).toMatch(/title: "Pregúntale al CRM"[\s\S]*?globalOnly: true/);
  });
});
