import { describe, it, expect } from "vitest";
import { LEAD_STATE, leadStateEnum, type LeadState } from "./state";

describe("LEAD_STATE", () => {
	it("has the three expected states", () => {
		expect(LEAD_STATE.SIN_ASIGNAR).toBe("sin asignar");
		expect(LEAD_STATE.ASIGNADO).toBe("Asignado");
		expect(LEAD_STATE.NUMERO_ERRONEO).toBe("número erróneo");
	});

	it("LeadState type accepts only the enum values", () => {
		const valid: LeadState = LEAD_STATE.ASIGNADO;
		expect(valid).toBe("Asignado");
	});

	it("Zod enum accepts valid states", () => {
		expect(leadStateEnum.parse(LEAD_STATE.SIN_ASIGNAR)).toBe("sin asignar");
		expect(leadStateEnum.parse(LEAD_STATE.ASIGNADO)).toBe("Asignado");
		expect(leadStateEnum.parse(LEAD_STATE.NUMERO_ERRONEO)).toBe("número erróneo");
	});

	it("Zod enum rejects invalid states", () => {
		expect(() => leadStateEnum.parse("invalid")).toThrow();
		expect(() => leadStateEnum.parse("")).toThrow();
	});
});
