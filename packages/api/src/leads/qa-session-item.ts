import { z } from "zod";
import { LEAD_QA_ROLE } from "@crm-fran/db/schema/index";

export const LeadQASessionItemSchema = z.object({
	question: z.string().min(1),
	answer: z.string(),
	authorRole: z.enum([LEAD_QA_ROLE.CALLER, LEAD_QA_ROLE.CLOSER]),
	authorId: z.string().nullable(),
});
