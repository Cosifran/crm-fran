import { protectedPermissionProcedure } from "@crm-fran/api/trpc/trpc";
import { protectedProcedure, publicProcedure, router } from "../index";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
      permission: ctx.permissions,
    };
  }),
  createUser: protectedPermissionProcedure(["users:create"]).query(
    ({ ctx }) => {
      return {
        message: "This is create user",
        user: ctx.session.user,
        permission: ctx.permissions,
      };
    },
  ),
});
export type AppRouter = typeof appRouter;
