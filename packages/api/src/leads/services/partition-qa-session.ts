import { LEAD_QA_ROLE, type LeadQASessionItem } from "@crm-fran/db/schema/index";

export function partitionQASession(
	items: ReadonlyArray<LeadQASessionItem>,
): { caller: LeadQASessionItem[]; closer: LeadQASessionItem[] } {
	const caller: LeadQASessionItem[] = [];
	const closer: LeadQASessionItem[] = [];

	for (const item of items) {
		if (item.authorRole === LEAD_QA_ROLE.CLOSER) {
			closer.push(item);
		} else {
			caller.push({
				...item,
				authorRole: item.authorRole ?? LEAD_QA_ROLE.CALLER,
				authorId: item.authorId ?? null,
			});
		}
	}

	return { caller, closer };
}
