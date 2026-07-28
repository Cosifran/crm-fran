import { db, eq, asc } from "@crm-fran/db";
import { user } from "@crm-fran/db/schema/index";

export async function listClosers() {
	return await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
		})
		.from(user)
		.where(eq(user.roleId, "role-closer"))
		.orderBy(asc(user.name));
}
