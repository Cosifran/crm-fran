import { describe, it, expect } from "vitest";
import { LEAD_QA_ROLE, type LeadQASessionItem } from "@crm-fran/db/schema/index";

import { partitionQASession } from "./partition-qa-session";

describe("partitionQASession", () => {
	it("returns empty buckets for an empty session", () => {
		const result = partitionQASession([]);
		expect(result.caller).toEqual([]);
		expect(result.closer).toEqual([]);
	});

	it("places all-caller items in the caller bucket", () => {
		const items: LeadQASessionItem[] = [
			{ question: "Q1", answer: "A1", authorRole: LEAD_QA_ROLE.CALLER, authorId: "u1" },
			{ question: "Q2", answer: "A2", authorRole: LEAD_QA_ROLE.CALLER, authorId: "u1" },
		];

		const result = partitionQASession(items);

		expect(result.caller).toEqual(items);
		expect(result.closer).toEqual([]);
	});

	it("places all-closer items in the closer bucket", () => {
		const items: LeadQASessionItem[] = [
			{ question: "Q1", answer: "A1", authorRole: LEAD_QA_ROLE.CLOSER, authorId: "u2" },
			{ question: "Q2", answer: "A2", authorRole: LEAD_QA_ROLE.CLOSER, authorId: "u2" },
		];

		const result = partitionQASession(items);

		expect(result.caller).toEqual([]);
		expect(result.closer).toEqual(items);
	});

	it("partitions mixed items into caller and closer buckets while preserving order", () => {
		const callerItems: LeadQASessionItem[] = [
			{ question: "CQ1", answer: "CA1", authorRole: LEAD_QA_ROLE.CALLER, authorId: "u1" },
			{ question: "CQ2", answer: "CA2", authorRole: LEAD_QA_ROLE.CALLER, authorId: "u1" },
		];
		const closerItems: LeadQASessionItem[] = [
			{ question: "LQ1", answer: "LA1", authorRole: LEAD_QA_ROLE.CLOSER, authorId: "u2" },
		];

		const result = partitionQASession([callerItems[0]!, closerItems[0]!, callerItems[1]!]);

		expect(result.caller).toEqual(callerItems);
		expect(result.closer).toEqual(closerItems);
	});

	it("treats legacy items without authorRole as caller", () => {
		const legacyItems = [
			{ question: "Q1", answer: "A1" },
			{ question: "Q2", answer: "A2" },
		] as LeadQASessionItem[];

		const result = partitionQASession(legacyItems);

		expect(result.caller).toHaveLength(2);
		expect(result.closer).toHaveLength(0);
		expect(result.caller[0]?.authorRole).toBe(LEAD_QA_ROLE.CALLER);
		expect(result.caller[1]?.authorRole).toBe(LEAD_QA_ROLE.CALLER);
	});
});
