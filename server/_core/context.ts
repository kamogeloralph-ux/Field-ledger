import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

// `platform` discriminates this from `WorkerTrpcContext` (see ./worker-context.ts).
// The two are unioned into the router's context type in ./trpc.ts, since the same
// `appRouter` is served by both the Express server and the Cloudflare Worker.
export type TrpcContext = {
  platform: "express";
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    platform: "express",
    req: opts.req,
    res: opts.res,
    user,
  };
}
