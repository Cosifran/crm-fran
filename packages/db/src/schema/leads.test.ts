import { describe, it, expect } from "vitest";
import {
	leads,
	LEAD_TYPE,
	LEAD_QA_ROLE,
	type LeadType,
	type LeadQARole,
	type LeadQASessionItem,
	type LeadQASession,
} from "./leads";
import { LEAD_STATE } from "./state";

describe("leads schema", () => {
	it("defines the imported lead types and defaults legacy rows to maestra", () => {
		const leadType: LeadType = LEAD_TYPE.VSL;
		expect(leadType).toBe("vsl");
		expect(LEAD_TYPE.MAESTRA).toBe("maestra");
		expect(leads.type.default).toBe(LEAD_TYPE.MAESTRA);
	});

	it("exports LEAD_QA_ROLE and LeadQARole", () => {
		const role: LeadQARole = LEAD_QA_ROLE.CALLER;
		expect(role).toBe("caller");
		expect(LEAD_QA_ROLE.CALLER).toBe("caller");
		expect(LEAD_QA_ROLE.CLOSER).toBe("closer");
	});

	it("allows LeadQASessionItem with authorRole and authorId", () => {
		const item: LeadQASessionItem = {
			question: "Q",
			answer: "A",
			authorRole: LEAD_QA_ROLE.CALLER,
			authorId: "u1",
		};
		expect(item.authorRole).toBe("caller");
	});

	it("allows LeadQASession array", () => {
		const session: LeadQASession = [
			{ question: "Q1", answer: "A1", authorRole: LEAD_QA_ROLE.CALLER, authorId: "u1" },
			{ question: "Q2", answer: "A2", authorRole: LEAD_QA_ROLE.CLOSER, authorId: "u2" },
		];
		expect(session).toHaveLength(2);
	});

	it("leads.questions default is an empty array", () => {
		expect(leads.questions.default).toEqual([]);
	});

	it("state default is the sin asignar enum value", () => {
		expect(leads.state.default).toBe(LEAD_STATE.SIN_ASIGNAR);
	});

	it("starts new leads in the new pool with zero no-contact impacts", () => {
		expect(leads.poolStatus.default).toBe("new");
		expect(leads.noContactImpactCount.default).toBe(0);
	});

	it("stores optional source and campaign attribution", () => {
		expect(leads.source).toBeDefined();
		expect(leads.campaign).toBeDefined();
		expect(leads.source.notNull).toBe(false);
		expect(leads.campaign.notNull).toBe(false);
	});
});
