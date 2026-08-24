import { z } from "zod";

import { profitabilityService } from "../profitability/service";
import { router } from "../index";
import { permittedProcedure } from "../trpc/trpc";

const calendarDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }, "Fecha inválida");

export const profitabilityOverviewInput = z
  .object({ from: calendarDay, to: calendarDay })
  .refine((value) => value.from <= value.to, {
    message: "El intervalo está invertido",
  });

export const profitabilitySpendInput = z
  .object({
    id: z.string().min(1).optional(),
    source: z.string().trim().min(1).max(120),
    campaign: z.string().trim().min(1).max(200),
    periodStart: calendarDay,
    periodEnd: calendarDay,
    spendEuros: z.number().positive().max(21_000_000),
    referenceSaleValueEuros: z.number().positive().max(21_000_000),
  })
  .refine((value) => value.periodStart <= value.periodEnd, {
    message: "El periodo está invertido",
  });

const startOfDay = (value: string) => new Date(`${value}T00:00:00.000Z`);
const endOfDay = (value: string) => new Date(`${value}T23:59:59.999Z`);
const admin = permittedProcedure(["*"]);

export const profitabilityRouter = router({
  overview: admin
    .input(profitabilityOverviewInput)
    .query(({ input }) =>
      profitabilityService.overview({
        from: startOfDay(input.from),
        to: endOfDay(input.to),
      }),
    ),
  saveSpend: admin
    .input(profitabilitySpendInput)
    .mutation(({ ctx, input }) =>
      profitabilityService.saveSpend({
        id: input.id,
        source: input.source,
        campaign: input.campaign,
        periodStart: startOfDay(input.periodStart),
        periodEnd: endOfDay(input.periodEnd),
        spendCents: Math.round(input.spendEuros * 100),
        referenceSaleValueCents: Math.round(
          input.referenceSaleValueEuros * 100,
        ),
        actorId: ctx.session.user.id,
      }),
    ),
  deleteSpend: admin
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ input }) => profitabilityService.deleteSpend(input.id)),
});
