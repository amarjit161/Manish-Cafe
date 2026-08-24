import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFromR2Worker } from "@/lib/documents/r2-worker";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeContentDisposition(disposition: "inline" | "attachment", filename: string): string {
  // RFC 5987 encoding -- avoids header-injection risk from a raw
  // (client-supplied, untrusted) original_filename ever reaching the
  // response header unescaped.
  const encoded = encodeURIComponent(filename).replace(/['()]/g, escape);
  return `${disposition}; filename*=UTF-8''${encoded}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // 1. Authentication -- defense in depth alongside the /api/admin
  // middleware gate. This route never assumes middleware ran.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 2. Ownership/authorization: RLS-scoped lookup using the admin's own
  // session (not a service-role bypass). application_documents_select
  // already grants admin unconditional read access -- this is the same
  // authorization check the metadata list already relies on, just
  // reused here before touching R2.
  const { data: document } = await supabase
    .from("application_documents")
    .select("id, original_filename, mime_type, r2_object_key, status")
    .eq("id", id)
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (document.status === "deleted") {
    return NextResponse.json({ error: "This document is no longer available." }, { status: 404 });
  }

  // 3. Retrieve through the existing Worker -- Next.js never touches R2
  // credentials directly, and the browser never sees the Worker's shared
  // secret or R2_WORKER_URL.
  const object = await getFromR2Worker(document.r2_object_key);
  if (!object) {
    return NextResponse.json({ error: "Could not retrieve the document. Please try again." }, { status: 502 });
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  const headers = new Headers();
  headers.set("Content-Type", document.mime_type || object.contentType);
  if (object.contentLength > 0) headers.set("Content-Length", String(object.contentLength));
  headers.set("Content-Disposition", safeContentDisposition(download ? "attachment" : "inline", document.original_filename));
  // Never cached by a shared/public cache -- this is short-lived,
  // per-request, authorization-gated access to a private file.
  headers.set("Cache-Control", "private, no-store");

  return new NextResponse(object.body, { status: 200, headers });
}
