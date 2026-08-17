import { z } from "zod";

import { getConversionFunnel } from "../dashboard/conversion-funnel-service";
import { router } from "../index";
import { permittedProcedure } from "../trpc/trpc";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const conversionFunnelInput = z
  .object({
    from: date,
    to: date,
    callerId: z.string().min(1).optional(),
    closerId: z.string().min(1).optional(),
    type: z.enum(["maestra", "vsl"]).optional(),
  })
  .refine((input) => input.from <= input.to, {
    message: "The end date cannot be before the start date",
    path: ["to"],
  });

export const dashboardRouter = router({
  conversionFunnel: permittedProcedure(["leads:read"])
    .input(conversionFunnelInput)
    .query(({ input }) => getConversionFunnel(input)),
});
