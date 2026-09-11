import type { R2Bucket } from "@cloudflare/workers-types";

export async function storagePutWorker(
  relKey: string,
  data: Buffer | Uint8Array | string,
  r2: R2Bucket,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  // Pass strings and bytes directly to R2. Constructing a DOM Blob here
  // causes a type collision between Node's lib.dom Blob and Cloudflare's
  // Workers Blob definitions during the full type check.
  const body = typeof data === "string" ? data : (data as unknown as ArrayBuffer);

  // Upload to R2
  const result = await r2.put(key, body, {
    httpMetadata: {
      contentType: contentType,
    },
  });

  if (!result) {
    throw new Error("Failed to upload to R2");
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetWorker(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

/**
 * Cloudflare's R2Bucket binding has no `createSignedUrl` method (that's an
 * S3-only concept; R2's S3-compatible signing needs the separate REST API
 * with access keys, not the Worker binding). Since /manus-storage/:key
 * already proxies GET requests straight through the Worker's binding (see
 * handleStorageProxy in worker-storage-proxy.ts), we reuse that same URL
 * here instead of a real signed URL — access control happens in the proxy
 * route itself rather than via URL expiry.
 */
export async function storageGetSignedUrlWorker(
  relKey: string,
  r2: R2Bucket
): Promise<string> {
  const key = normalizeKey(relKey);

  const object = await r2.head(key);
  if (!object) {
    throw new Error("Object not found in R2");
  }

  return `/manus-storage/${key}`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
