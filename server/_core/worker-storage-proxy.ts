import type { Env } from "../../src/worker";

/**
 * Handle storage proxy requests for R2.
 * Streams /manus-storage/{key} straight from the R2 binding.
 *
 * (Previously this redirected to `your-r2-custom-domain`/`your-r2-bucket-url`,
 * which were unset placeholders — the bucket has no public URL configured,
 * so every request 404'd/failed DNS. Serving the object body directly
 * through the Worker avoids needing a public bucket or custom domain at all.)
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
    const object = await env.R2_BUCKET.get(key);
    if (!object) {
      return new Response(
        JSON.stringify({ error: "Object not found" }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=3600");

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("[StorageProxy] Error:", error);
    return new Response(
      JSON.stringify({ error: "Storage proxy error" }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
}
