import { z } from "zod";
import { router } from "../index";
import {
  getAll,
  getById,
  getByUserId,
  assignLead,
  assignLeadToCaller,
  getWithoutAssigned,
} from "../leads/services/index";
import { permittedProcedure } from "@crm-fran/api/trpc/trpc";

const idInput = z.object({ id: z.string() });
const createLeadInput = z.object({
  name: z.string(),
  email: z.email(),
  phone: z.string(),
});
const updateLeadInput = createLeadInput.partial().extend({ id: z.string() });

const assignLeadInput = z.discriminatedUnion("isContacted", [
  z.object({
    leadId: z.string().min(1),
    isContacted: z.literal("yes"),
    closerId: z.string().min(1),
    scheduledDate: z.string().min(1).optional(),
    scheduledTime: z.string().min(1).optional(),
    questions: z.array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
    ),
    extraNotes: z.string().optional(),
  }),
  z.object({
    leadId: z.string().min(1),
    isContacted: z.literal("no"),
  }),
]);

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

  listByUserId: permittedProcedure(["leads:read"]).query(async ({ ctx }) => {
    return await getByUserId({ userId: ctx.session.user.id });
  }),

  assignLead: permittedProcedure(["leads:write"])
    .input(assignLeadInput)
    .mutation(async ({ ctx, input }) => {
      return await assignLead({
        input,
        callerId: ctx.session.user.id,
      });
    }),

  /**
   * @deprecated Use {@link leadsRouter.assignLead} instead.
   */
  assignLeadToCaller: permittedProcedure(["leads:write"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.warn(
        "[leads.assignLeadToCaller] DEPRECATED — use leads.assignLead instead",
      );
      return await assignLeadToCaller({ id: input.id, userId: ctx.session.user.id });
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
