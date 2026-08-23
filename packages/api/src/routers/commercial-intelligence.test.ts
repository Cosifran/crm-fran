import { describe, expect, it } from "vitest";
import { commercialIntelligenceInput } from "./commercial-intelligence";
describe("commercial intelligence input", () => {
 it("rejects an inverted time window", () => expect(() => commercialIntelligenceInput.parse({ from: "2026-08-23", to: "2026-08-01" })).toThrow());
 it("rejects impossible calendar dates rather than accepting a regex-shaped date", () => expect(() => commercialIntelligenceInput.parse({ from: "2026-02-30", to: "2026-08-23" })).toThrow());
 it("accepts an explicit non-negative reference sale value", () => expect(commercialIntelligenceInput.parse({ from: "2026-08-01", to: "2026-08-23", referenceSaleValue: 1000 }).referenceSaleValue).toBe(1000));
});
