/**
 * Server-only client for the manishcafe-documents Cloudflare Worker.
 * R2_WORKER_SHARED_SECRET never leaves this module -- it is read from
 * process.env and attached as a bearer token on server-to-server requests
 * only. This file must never be imported from a "use client" component;
 * it is only ever called from Route Handlers, which Next.js guarantees
 * run exclusively on the server.
 */

function requireEnv(name: "R2_WORKER_URL" | "R2_WORKER_SHARED_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export async function uploadToR2Worker(
  objectKey: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<boolean> {
  const workerUrl = requireEnv("R2_WORKER_URL");
  const secret = requireEnv("R2_WORKER_SHARED_SECRET");

  try {
    const res = await fetch(`${workerUrl}/upload?key=${encodeURIComponent(objectKey)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
      },
      body,
    });
    return res.ok;
  } catch (err) {
    console.error("R2 worker upload request failed", err);
    return false;
  }
}

export type R2FetchResult = { body: ReadableStream<Uint8Array>; contentType: string; contentLength: number } | null;

/**
 * Retrieves a document's bytes through the Worker. Returns null on any
 * failure (not-found, network error, etc.) rather than throwing, so
 * callers can turn that into a clean 404 instead of a 500.
 */
export async function getFromR2Worker(objectKey: string): Promise<R2FetchResult> {
  const workerUrl = requireEnv("R2_WORKER_URL");
  const secret = requireEnv("R2_WORKER_SHARED_SECRET");

  try {
    const res = await fetch(`${workerUrl}/object?key=${encodeURIComponent(objectKey)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok || !res.body) return null;

    return {
      body: res.body,
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
      contentLength: Number(res.headers.get("content-length") ?? "0"),
    };
  } catch (err) {
    console.error("R2 worker get request failed", err);
    return null;
  }
}

/**
 * Used to roll back an R2 write when the follow-up Supabase metadata
 * insert fails, so a document never exists in R2 without a corresponding
 * database row. R2 delete is idempotent, so this is always safe to call.
 */
export async function deleteFromR2Worker(objectKey: string): Promise<boolean> {
  const workerUrl = requireEnv("R2_WORKER_URL");
  const secret = requireEnv("R2_WORKER_SHARED_SECRET");

  try {
    const res = await fetch(`${workerUrl}/object?key=${encodeURIComponent(objectKey)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${secret}` },
    });
    return res.ok;
  } catch (err) {
    console.error("R2 worker delete request failed", err);
    return false;
  }
}
