import type { Env } from "../../src/worker";

/**
 * Handle storage proxy requests for R2
 * Redirects /manus-storage/{key} to R2 signed URLs
 */
export async function handleStorageProxy(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const key = url.pathname.replace("/manus-storage/", "");

  if (!key) {
    return new Response(
      JSON.stringify({ error: "Missing storage key" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  try {
    // Get the object from R2 to check if it exists
    const object = await env.R2_BUCKET.head(key);
    if (!object) {
      return new Response(
        JSON.stringify({ error: "Object not found" }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    // Redirect to the R2 object
    // R2 URLs are publicly accessible if bucket is configured correctly
    const r2Url = `https://${env.ENVIRONMENT === "production" ? "your-r2-custom-domain" : "your-r2-bucket-url"}/${key}`;
    
    return new Response(null, {
      status: 307,
      headers: {
        Location: r2Url,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[StorageProxy] Error:", error);
    return new Response(
      JSON.stringify({ error: "Storage proxy error" }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
}
