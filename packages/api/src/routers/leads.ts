import { z } from "zod";
import { router } from "../index";
import {
  getAll,
  getById,
  getByUserId,
  assignLead,
  assignLeadToCaller,
  getWithoutAssigned,
  recordCloserAnswers,
  adminEditLeadQASession,
  getPersonalStatistics,
} from "../leads/services/index";
import { permittedProcedure } from "@crm-fran/api/trpc/trpc";

const idInput = z.object({ id: z.string() });
const createLeadInput = z.object({
  name: z.string(),
  email: z.email(),
  phone: z.string(),
});
const updateLeadInput = createLeadInput.partial().extend({ id: z.string() });

const dateRangeInput = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .optional();

const qaSessionInput = z.discriminatedUnion("isContacted", [
  z.object({
    leadId: z.string().min(1),
    isContacted: z.literal("Si"),
    scheduledDate: z.string().min(1).optional(),
    scheduledTime: z.string().min(1).optional(),
    questions: z.array(
      z.object({
        questionKey: z.string().min(1),
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
    ),
    extraNotes: z.string().optional(),
  }),
  z.object({
    leadId: z.string().min(1),
    isContacted: z.literal("No"),
    questions: z
      .array(
        z.object({
          questionKey: z.string().min(1),
          question: z.string().min(1),
          answer: z.string().min(1),
        }),
      )
      .optional(),
  }),
]);

const callerQuestionsInput = z
  .array(
    z.object({
      questionKey: z.string().min(1),
      question: z.string().min(1),
      answer: z.string(),
    }),
  )
  .optional();

export const personalStatisticsInput = z
  .object({
    callerId: z.string().min(1).optional(),
    closerId: z.string().min(1).optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .refine((value) => !(value.callerId && value.closerId), {
    message: "Caller and closer filters cannot be combined",
  })
  .refine((value) => !(value.from && value.to && value.from > value.to), {
    message: "From date must be before or equal to to date",
    path: ["to"],
  });

export const assignLeadInput = z.union([
  z.object({
    leadId: z.string().min(1),
    isContacted: z.literal("Si"),
    outcome: z.literal("future_call"),
    scheduledDate: z.string().date(),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
    alertSeverity: z.enum(["urgent", "warning", "info"]),
    questions: callerQuestionsInput,
  }),
  z.object({
    leadId: z.string().min(1),
    isContacted: z.literal("Si"),
    outcome: z.literal("not_fit"),
    questions: callerQuestionsInput,
  }),
  z.object({
    leadId: z.string().min(1),
    isContacted: z.literal("Si"),
    outcome: z.literal("not_interested"),
    questions: callerQuestionsInput,
  }),
  z.object({
    leadId: z.string().min(1),
    isContacted: z.literal("Si"),
    outcome: z.literal("appointment"),
    closerId: z.string().min(1),
    scheduledDate: z.string().date(),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
    questions: callerQuestionsInput,
  }),
  z.object({
    leadId: z.string().min(1),
    isContacted: z.literal("Si"),
    closerId: z.string().min(1),
    scheduledDate: z.string().min(1).optional(),
    scheduledTime: z.string().min(1).optional(),
    questions: z.array(
      z.object({
        questionKey: z.string().min(1),
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
    ),
    extraNotes: z.string().optional(),
  }),
  z.object({
    leadId: z.string().min(1),
    isContacted: z.literal("No"),
  }),
]).and(
  z.object({
    sourceAlertId: z.string().min(1).optional(),
  }),
);

export const leadsRouter = router({
	personalStatistics: permittedProcedure(["leads:read"])
		.input(personalStatisticsInput)
		.query(async ({ input }) => {
			return await getPersonalStatistics(input);
		}),

  listAll: permittedProcedure(["leads:read"])
    .input(dateRangeInput)
    .query(async ({ input }) => {
    return await getAll({ dateRange: input });
  }),

  listWithoutAssigned: permittedProcedure(["leads:read"]).query(async () => {
    return await getWithoutAssigned();
  }),

  getById: permittedProcedure(["leads:read"])
    .input(idInput)
    .query(async ({ input }) => {
      return await getById({ id: input.id });
    }),

  listByUserId: permittedProcedure(["leads:read"])
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
    return await getByUserId({ userId: ctx.session.user.id, dateRange: input });
  }),

  assignLead: permittedProcedure(["leads:write"])
    .input(assignLeadInput)
    .mutation(async ({ ctx, input }) => {
      return await assignLead({
        input,
        callerId: ctx.session.user.id,
        authorRole:
          ctx.session.user.roleId === "role-closer"
            ? "closer"
            : "caller",
        permissions: ctx.permissions,
      });
    }),

  /**
   * Asigna un lead a un caller para que empiece a trabajarlo.
   * Falla con `CONFLICT` si el caller ya tiene un lead en estado "sin asignar".
   */
  assignLeadToCaller: permittedProcedure(["leads:write"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

  recordCloserAnswers: permittedProcedure(["leads:write"])
    .input(qaSessionInput)
    .mutation(async ({ ctx, input }) => {
      return await recordCloserAnswers({ ctx, input });
    }),

  adminEditLeadQASession: permittedProcedure(["*"])
    .input(qaSessionInput)
    .mutation(async ({ ctx, input }) => {
      return await adminEditLeadQASession({ ctx, input });
    }),
});
