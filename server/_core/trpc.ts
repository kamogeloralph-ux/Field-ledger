import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext as ExpressTrpcContext } from "./context";
import type { WorkerTrpcContext } from "./worker-context";

// The same appRouter is served by both the Express server (server/_core/index.ts)
// and the Cloudflare Worker (src/worker.ts), which build different context shapes.
// Narrow on `ctx.platform` in procedures that need platform-specific fields
// (e.g. auth.logout in ./routers.ts).
export type AppContext = ExpressTrpcContext | WorkerTrpcContext;

const t = initTRPC.context<AppContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async (opts: any) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async (opts: any) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
