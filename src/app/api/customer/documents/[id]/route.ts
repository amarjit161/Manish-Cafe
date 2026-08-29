import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFromR2Worker } from "@/lib/documents/r2-worker";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeContentDisposition(disposition: "inline" | "attachment", filename: string): string {
  const encoded = encodeURIComponent(filename).replace(/['()]/g, escape);
  return `${disposition}; filename*=UTF-8''${encoded}`;
}

/**
 * The customer-facing counterpart to /api/admin/documents/[id] -- same
 * shape, same never-touch-R2-from-the-browser rule, but ownership is
 * enforced by RLS on a session-bound client (application_documents_select:
 * customer_id = current_customer_id()) rather than an admin-role check.
 * A customer requesting someone else's document id gets exactly the same
 * 404 as a nonexistent one -- the query simply returns no row -- so this
 * can never leak whether a given id belongs to another customer.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const object = await getFromR2Worker(document.r2_object_key);
  if (!object) {
    return NextResponse.json({ error: "Could not retrieve the document. Please try again." }, { status: 502 });
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  const headers = new Headers();
  headers.set("Content-Type", document.mime_type || object.contentType);
  if (object.contentLength > 0) headers.set("Content-Length", String(object.contentLength));
  headers.set("Content-Disposition", safeContentDisposition(download ? "attachment" : "inline", document.original_filename));
  headers.set("Cache-Control", "private, no-store");

  return new NextResponse(object.body, { status: 200, headers });
}
