// Local-only stand-in for the manishcafe-documents Worker, for testing the
// Next.js upload route without a real Cloudflare deployment. Mirrors the
// exact contract in src/index.ts (auth, key validation, size cap) but
// stores objects in memory instead of R2. Not deployed anywhere.
import { createServer } from "node:http";

const PORT = process.env.MOCK_WORKER_PORT || 8787;
const SECRET = process.env.MOCK_WORKER_SECRET || "test-shared-secret";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const OBJECT_KEY_PATTERN =
  /^applications\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]{1,200}$/;

const store = new Map();
let forceNextUploadFailure = false;

function isAuthorized(req) {
  return req.headers["authorization"] === `Bearer ${SECRET}`;
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Test-only control endpoints -- not part of the real Worker contract.
  if (url.pathname === "/__test__/force-fail" && req.method === "POST") {
    forceNextUploadFailure = true;
    return send(res, 200, { ok: true });
  }
  if (url.pathname === "/__test__/has-object") {
    return send(res, 200, { exists: store.has(url.searchParams.get("key")) });
  }
  if (url.pathname === "/__test__/count") {
    return send(res, 200, { count: store.size });
  }

  if (!isAuthorized(req)) {
    return send(res, 401, { ok: false, error: "unauthorized" });
  }

  const objectKey = url.searchParams.get("key") ?? "";
  if (!OBJECT_KEY_PATTERN.test(objectKey)) {
    return send(res, 400, { ok: false, error: "invalid_key" });
  }

  if (url.pathname === "/upload" && req.method === "PUT") {
    const contentLength = Number(req.headers["content-length"] ?? "0");
    if (!contentLength || contentLength <= 0 || contentLength > MAX_UPLOAD_BYTES) {
      return send(res, 413, { ok: false, error: "invalid_size" });
    }
    if (forceNextUploadFailure) {
      forceNextUploadFailure = false;
      await readBody(req);
      return send(res, 500, { ok: false, error: "forced_failure" });
    }
    const body = await readBody(req);
    store.set(objectKey, { contentType: req.headers["content-type"], size: body.length, bytes: body });
    return send(res, 200, { ok: true });
  }

  if (url.pathname === "/object" && req.method === "DELETE") {
    store.delete(objectKey);
    return send(res, 200, { ok: true });
  }

  if (url.pathname === "/object" && req.method === "GET") {
    const object = store.get(objectKey);
    if (!object) {
      return send(res, 404, { ok: false, error: "not_found" });
    }
    res.writeHead(200, {
      "content-type": object.contentType || "application/octet-stream",
      "content-length": String(object.size),
      "cache-control": "private, no-store",
    });
    return res.end(object.bytes);
  }

  return send(res, 404, { ok: false, error: "not_found" });
});

server.listen(PORT, () => {
  console.log(`Mock R2 worker listening on http://localhost:${PORT}`);
});
