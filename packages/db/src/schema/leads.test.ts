import { describe, it, expect } from "vitest";
import { leads, type LeadQuestion, type LeadQuestions } from "./leads";
import { LEAD_STATE } from "./state";

describe("leads schema", () => {
	it("exports LeadQuestion and LeadQuestions types", () => {
		const question: LeadQuestion = { question: "Q", answer: "A" };
		const questions: LeadQuestions = [question];
		expect(questions).toHaveLength(1);
	});

	it("state default is the sin asignar enum value", () => {
		expect(leads.state.default).toBe(LEAD_STATE.SIN_ASIGNAR);
	});
});
