/// <reference types="@cloudflare/workers-types" />
import type { Env } from "../../src/worker";
import { SDK_PASSWORD, SDK_URL } from "@shared/const";

export async function storagePutWorker(
  relKey: string,
  data: Buffer | Uint8Array | string,
  r2: R2Bucket,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  // Upload to R2
  const result = await r2.put(key, blob, {
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

export async function storageGetSignedUrlWorker(
  relKey: string,
  r2: R2Bucket
): Promise<string> {
  const key = normalizeKey(relKey);

  try {
    // Check if object exists
    const object = await r2.head(key);
    if (!object) {
      throw new Error("Object not found in R2");
    }

    // Create a signed URL valid for 1 hour
    const signedUrl = await r2.createSignedUrl(key, 3600, {
      method: "GET",
    });

    return signedUrl;
  } catch (error) {
    console.error("[Storage] Failed to create signed URL:", error);
    throw error;
  }
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
