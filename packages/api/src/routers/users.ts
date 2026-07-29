import { z } from "zod";
import { router } from "../index";
import { permittedProcedure } from "@crm-fran/api/trpc/trpc";
import { listClosers } from "../users/services/list-closers";

export const usersRouter = router({
	listClosers: permittedProcedure(["users:read"])
		.input(z.object({}).optional())
		.query(async () => {
			return await listClosers();
		}),
});
