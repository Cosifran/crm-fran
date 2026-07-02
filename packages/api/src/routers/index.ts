import { authRouter } from "./auth";
import { leadsRouter } from "./leads";
import { permittedProcedure } from "@crm-fran/api/trpc/trpc";
import { publicProcedure, router } from "../index";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: permittedProcedure(["profile:read"]).query(({ ctx }) => {
    return {
      message: "This is private",
      role: ctx.role,
      user: ctx.session.user,
      permissions: ctx.permissions,
    };
  }),
  createUser: permittedProcedure(["users:create"]).query(({ ctx }) => {
    return {
      message: "This is create user",
      user: ctx.session.user,
      permissions: ctx.permissions,
    };
  }),
  auth: authRouter,
  leads: leadsRouter,
});
export type AppRouter = typeof appRouter;
