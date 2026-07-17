import { z } from "zod";
import { router } from "../index";
import {
  getAll,
  getById,
  assignLeadToCaller,
  getWithoutAssigned
} from "../leads/services/index";
import { permittedProcedure } from "@crm-fran/api/trpc/trpc";

const idInput = z.object({ id: z.string() });
const createLeadInput = z.object({
  name: z.string(),
  email: z.email(),
  phone: z.string(),
});
const updateLeadInput = createLeadInput.partial().extend({ id: z.string() });

export const leadsRouter = router({
  listAll: permittedProcedure(["leads:read"]).query(async () => {
    return await getAll();
  }),

  listWithoutAssigned: permittedProcedure(["leads:read"]).query(async () => {
    return await getWithoutAssigned();
  }),

  getById: permittedProcedure(["leads:read"])
    .input(idInput)
    .query(async ({ input }) => {
      return await getById({ id: input.id });
    }),

  listByCloser: permittedProcedure(["leads:read"])
    .input(idInput)
    .query(async ({ input }) => {
      console.log(`[stub] listByCloser called with id: ${input.id}`);
      return null;
    }),

  listByCaller: permittedProcedure(["leads:read"])
    .input(idInput)
    .query(async ({ input }) => {
      console.log(`[stub] listByCaller called with id: ${input.id}`);
      return null;
    }),

  assignLeadToCaller: permittedProcedure(["leads:write"])
    .input(z.object({ id: z.string()}))
    .mutation(async ({ctx,  input }) => {
      return await assignLeadToCaller({ id: input.id, userId: ctx.session.user.id});
    }),

  create: permittedProcedure(["leads:write"])
    .input(createLeadInput)
    .mutation(async ({ input }) => {
      return { id: "stub", ...input };
    }),

  update: permittedProcedure(["leads:write"])
    .input(updateLeadInput)
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return { id, ...rest };
    }),

  delete: permittedProcedure(["leads:delete"])
    .input(idInput)
    .mutation(async ({ input }) => {
      return { success: true, id: input.id };
    }),
});
