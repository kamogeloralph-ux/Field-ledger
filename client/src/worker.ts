/// <reference types="@cloudflare/workers-types" />
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/routers";
import { createWorkerContext } from "../server/_core/worker-context";
import { handleStorageProxy } from "../server/_core/worker-storage-proxy";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  OAUTH_SERVER_URL: string;
  OWNER_OPEN_ID: string;
  R2_BUCKET: R2Bucket;
  KV_CACHE: KVNamespace;
  ENVIRONMENT: "production" | "development";
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle tRPC API requests
    if (url.pathname.startsWith("/api/trpc")) {
      return fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: async () => {
          return createWorkerContext(request, env);
        },
        onError:
          env.ENVIRONMENT === "development"
            ? ({ path, error }) => {
                console.error(`✘ tRPC failed on ${path}:`, error);
              }
            : undefined,
      });
    }

    // Handle OAuth callback
    if (url.pathname === "/api/oauth/callback") {
      return handleOAuthCallback(request, env);
    }

    // Handle storage proxy for R2
    if (url.pathname.startsWith("/manus-storage/")) {
      return handleStorageProxy(request, env);
    }

    // Default 404
    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handle OAuth callback from OAuth provider
 */
async function handleOAuthCallback(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return new Response(
      JSON.stringify({ error: "code and state are required" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  try {
    // Import OAuth handler from your existing oauth.ts adapted for Workers
    const { handleOAuthCallback: handleCallback } = await import(
      "../server/_core/worker-oauth"
    );
    return await handleCallback(request, env, code, state);
  } catch (error) {
    console.error("[OAuth] Callback failed:", error);
    return new Response(
      JSON.stringify({ error: "OAuth callback failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
