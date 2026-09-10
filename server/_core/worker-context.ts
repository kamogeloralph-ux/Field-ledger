import type { User } from "../../drizzle/schema";
import type { Env } from "../../src/worker";
import { sdk } from "./sdk";

export type WorkerTrpcContext = {
  req: Request;
  env: Env;
  user: User | null;
  r2: R2Bucket;
  kv: KVNamespace;
};

/**
 * Create tRPC context for Cloudflare Workers
 * Authenticates the request and provides access to env, R2, and KV
 */
export async function createWorkerContext(
  request: Request,
  env: Env
): Promise<WorkerTrpcContext> {
  let user: User | null = null;

  try {
    // Extract authentication from request headers/cookies
    user = await sdk.authenticateWorkerRequest(request, env);
  } catch (error) {
    // Authentication is optional for public procedures
    console.debug("[Context] Authentication failed:", error);
    user = null;
  }

  return {
    req: request,
    env,
    user,
    r2: env.R2_BUCKET,
    kv: env.KV_CACHE,
  };
}
