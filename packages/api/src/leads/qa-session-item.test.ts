import { describe, it, expect } from "vitest";
import { LEAD_QA_ROLE } from "@crm-fran/db/schema/index";

import { LeadQASessionItemSchema } from "./qa-session-item";

describe("LeadQASessionItemSchema", () => {
	it("validates a well-formed session item", () => {
		const item = {
			question: "Q",
			answer: "A",
			authorRole: LEAD_QA_ROLE.CALLER,
			authorId: "u1",
		};

		expect(() => LeadQASessionItemSchema.parse(item)).not.toThrow();
		expect(LeadQASessionItemSchema.parse(item)).toEqual(item);
	});

	it("allows a null authorId", () => {
		const item = {
			question: "Q",
			answer: "A",
			authorRole: LEAD_QA_ROLE.CLOSER,
			authorId: null,
		};

		expect(() => LeadQASessionItemSchema.parse(item)).not.toThrow();
	});

	it("rejects an invalid authorRole", () => {
		const item = {
			question: "Q",
			answer: "A",
			authorRole: "admin",
			authorId: "u1",
		};

		expect(() => LeadQASessionItemSchema.parse(item)).toThrow();
	});

	it("rejects a missing question", () => {
		const item = {
			question: "",
			answer: "A",
			authorRole: LEAD_QA_ROLE.CALLER,
			authorId: "u1",
		};

		expect(() => LeadQASessionItemSchema.parse(item)).toThrow();
	});
});
