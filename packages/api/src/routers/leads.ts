import { z } from "zod";
import { router } from "../index";
import { getAll, getWithoutAssigned } from "@crm-fran/api/services/leads/index";
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

  listWithoutAassigned: permittedProcedure(["leads:read"]).query(async () => {
    return await getWithoutAssigned();
  }),

  getById: permittedProcedure(["leads:read"])
    .input(idInput)
    .query(async ({ input }) => {
      console.log(`[stub] getById called with id: ${input.id}`);
      return null;
    }),

  assignLeadToUser: permittedProcedure(["leads:write"])
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      console.log(
        `[stub] assignLeadToUser called with id: ${input.id} and userId: ${input.userId}`,
      );
      return { id: "stub", userId: input.userId };
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
