import { describe, expect, it } from "vitest";

import { createLeadInput } from "./leads";

describe("createLeadInput", () => {
  const lead = {
    name: "Imported lead",
    email: "imported@example.com",
    phone: "600000000",
  };

  it.each(["maestra", "vsl"] as const)(
    "accepts imported %s leads",
    (type) => {
      expect(createLeadInput.safeParse({ ...lead, type }).success).toBe(true);
    },
  );

  it("rejects the obsolete agenda lead type", () => {
    expect(createLeadInput.safeParse({ ...lead, type: "agenda" }).success).toBe(
      false,
    );
  });

  it("defaults imported leads without a type to maestra", () => {
    const result = createLeadInput.safeParse(lead);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected valid imported lead");
    expect(result.data.type).toBe("maestra");
  });
});
