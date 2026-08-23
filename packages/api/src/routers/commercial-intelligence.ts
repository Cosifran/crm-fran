import { z } from "zod";

import { getCommercialIntelligence } from "../commercial-intelligence/service";
import { router } from "../index";
import { permittedProcedure } from "../trpc/trpc";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).superRefine((value, context) => {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year ?? 0, (month ?? 1) - 1, day ?? 0);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== (month ?? 1) - 1 || parsed.getDate() !== day) {
    context.addIssue({ code: "custom", message: "Fecha de calendario inválida" });
  }
});
export const commercialIntelligenceInput = z.object({ from: date, to: date, referenceSaleValue: z.number().nonnegative().optional() }).refine((value) => value.from <= value.to, { message: "La fecha final no puede ser anterior", path: ["to"] });
function day(value: string, end = false) { const [year, month, day] = value.split("-").map(Number); return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0); }
export const commercialIntelligenceRouter = router({
  overview: permittedProcedure(["leads:read"]).input(commercialIntelligenceInput).query(({ ctx, input }) => getCommercialIntelligence({ actorId: ctx.session.user.id, permissions: ctx.permissions, from: day(input.from), to: day(input.to, true), referenceSaleValue: input.referenceSaleValue })),
});

