import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions, getWorkerSessionCookieAttributes } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      if (ctx.platform === "express") {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      } else {
        // Fetch adapter has no res.clearCookie; set Set-Cookie on the
        // response via ctx.responseHeaders, read back in src/worker.ts's
        // responseMeta.
        const attrs = getWorkerSessionCookieAttributes(ctx.req);
        ctx.responseHeaders.append("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; ${attrs}`);
      }
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
