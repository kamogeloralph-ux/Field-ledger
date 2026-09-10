import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Env } from "../../src/worker";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

/**
 * Handle OAuth callback in Cloudflare Workers
 */
export async function handleOAuthCallback(
  request: Request,
  env: Env,
  code: string,
  state: string
): Promise<Response> {
  // CSRF guard: verify the nonce in state matches the cookie
  const { nonce } = decodeOAuthState(state);
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = parseCookieHeader(cookieHeader);
  const expectedNonce = cookies[OAUTH_STATE_COOKIE];

  if (!nonce || nonce !== expectedNonce) {
    return new Response(
      JSON.stringify({ error: "invalid oauth state" }),
      { status: 403, headers: { "content-type": "application/json" } }
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

    if (!userInfo.openId) {
      return new Response(
        JSON.stringify({ error: "openId missing from user info" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // Upsert user in database
    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn: new Date(),
    });

    // Create session token
    const sessionToken = await sdk.createWorkerSessionToken(
      userInfo.openId,
      {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      },
      env.JWT_SECRET
    );

    // Build response with Set-Cookie header
    const response = new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });

    // Set session cookie
    const cookieOptions = getSessionCookieOptions(request as any);
    const cookieValue = `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${ONE_YEAR_MS / 1000}; ${
      cookieOptions.secure ? "Secure; " : ""
    }${cookieOptions.sameSite ? `SameSite=${cookieOptions.sameSite}; ` : ""}`;

    response.headers.append("Set-Cookie", cookieValue);

    // Clear OAuth state cookie
    const clearStateCookie = `${OAUTH_STATE_COOKIE}=; Path=/; Max-Age=-1; Secure; SameSite=None`;
    response.headers.append("Set-Cookie", clearStateCookie);

    return response;
  } catch (error) {
    console.error("[OAuth] Callback failed:", error);
    return new Response(
      JSON.stringify({ error: "OAuth callback failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
