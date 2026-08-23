export interface Env {
  DOCUMENTS: R2Bucket;
  R2_WORKER_SHARED_SECRET: string;
}

// applications/{uuid}/{uuid}/{safe filename} -- matches the CHECK constraint
// on application_documents.r2_object_key in the Supabase schema. Both ids
// are server-generated UUIDs; the only variable part is a short, charset-
// restricted extension. No customer name, Aadhaar/PAN number, or original
// filename is ever part of the key.
const OBJECT_KEY_PATTERN =
  /^applications\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]{1,200}$/;

// Hard ceiling independent of whatever document_types.max_file_size_bytes
// says -- this Worker has no DB access and can't look that up, so it only
// enforces a conservative upper bound. The real per-document-type limit is
// enforced by the Next.js route handler before it ever reaches here.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function isAuthorized(request: Request, env: Env): boolean {
  const auth = request.headers.get("Authorization") ?? "";
  const expected = `Bearer ${env.R2_WORKER_SHARED_SECRET}`;

  // Constant-time-ish comparison so a mismatched secret doesn't leak
  // timing information about how many leading characters matched.
  if (auth.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= auth.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Never exposed to browsers -- only Next.js's server calls this, with
    // the shared secret it holds server-side only.
    if (!isAuthorized(request, env)) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }

    const objectKey = url.searchParams.get("key") ?? "";
    if (!OBJECT_KEY_PATTERN.test(objectKey)) {
      return jsonResponse({ ok: false, error: "invalid_key" }, 400);
    }

    if (url.pathname === "/upload" && request.method === "PUT") {
      const contentLength = Number(request.headers.get("content-length") ?? "0");
      if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_UPLOAD_BYTES) {
        return jsonResponse({ ok: false, error: "invalid_size" }, 413);
      }

      await env.DOCUMENTS.put(objectKey, request.body, {
        httpMetadata: {
          contentType: request.headers.get("content-type") ?? "application/octet-stream",
        },
      });

      return jsonResponse({ ok: true }, 200);
    }

    if (url.pathname === "/object" && request.method === "DELETE") {
      // R2 delete is idempotent -- deleting an already-missing key still
      // succeeds, so this is always safe to call from the rollback path
      // even if something upstream retries it.
      await env.DOCUMENTS.delete(objectKey);
      return jsonResponse({ ok: true }, 200);
    }

    return jsonResponse({ ok: false, error: "not_found" }, 404);
  },
} satisfies ExportedHandler<Env>;
