import { eq, or} from "@crm-fran/db";
import { leads } from "@crm-fran/db/schema/index";
import { selectLeadWithUsers } from "../queries/index";

export async function getByUserId({ userId }: { userId: string }) {
  return await selectLeadWithUsers(or(eq(leads.callerId, userId), eq(leads.closerId, userId)));
}