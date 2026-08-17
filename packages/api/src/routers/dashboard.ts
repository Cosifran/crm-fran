import { z } from "zod";

import { getConversionFunnel } from "../dashboard/conversion-funnel-service";
import {
  getQualityControls,
  updateQualitySettings,
} from "../dashboard/quality-controls-service";
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

const qualityControlsInput = z
  .object({
    from: date,
    to: date,
    callerId: z.string().min(1).optional(),
    closerId: z.string().min(1).optional(),
  })
  .refine((input) => input.from <= input.to, {
    message: "The end date cannot be before the start date",
    path: ["to"],
  });

const qualitySettingsInput = z.object({
  callerAbandonedHours: z.number().int().min(0).max(8760),
  closerAbandonedHours: z.number().int().min(0).max(8760),
  callerFollowUpGraceHours: z.number().int().min(0).max(8760),
  closerFollowUpGraceHours: z.number().int().min(0).max(8760),
  callerLowConversionPercent: z.number().int().min(0).max(100),
  closerLowConversionPercent: z.number().int().min(0).max(100),
});

export const dashboardRouter = router({
  conversionFunnel: permittedProcedure(["leads:read"])
    .input(conversionFunnelInput)
    .query(({ input }) => getConversionFunnel(input)),
  qualityControls: permittedProcedure(["leads:read"])
    .input(qualityControlsInput)
    .query(({ input }) => getQualityControls(input)),
  updateQualitySettings: permittedProcedure(["settings:write"])
    .input(qualitySettingsInput)
    .mutation(({ ctx, input }) => updateQualitySettings(ctx.session.user.id, input)),
});
