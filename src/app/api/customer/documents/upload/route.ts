import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  SUPPORTED_MIME_TYPES,
  extensionMatchesMimeType,
  matchesFileSignature,
  safeExtensionForMimeType,
} from "@/lib/documents/file-signature";
import { deleteFromR2Worker, uploadToR2Worker } from "@/lib/documents/r2-worker";

const UPLOADABLE_STATUSES = ["draft", "submitted", "documents_required"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  // 1. Authentication -- defense in depth alongside the middleware check
  // on /api/customer/:path*. This route never assumes middleware ran.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (!profile || profile.role !== "customer" || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 2. Parse and shape-validate the request
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const file = formData.get("file");
  const applicationId = String(formData.get("applicationId") ?? "");
  const documentTypeId = String(formData.get("documentTypeId") ?? "");

  if (!(file instanceof File) || !UUID_PATTERN.test(applicationId) || !UUID_PATTERN.test(documentTypeId)) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  // 3. File type: never trust file.type alone. Checked against a fixed
  // allowlist, cross-checked against the filename extension, and later
  // against the file's actual leading bytes.
  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }
  if (!extensionMatchesMimeType(file.name, file.type)) {
    return NextResponse.json({ error: "File extension does not match its type." }, { status: 400 });
  }

  // 4. Ownership: RLS on `applications` returns nothing for an application
  // that isn't this customer's, regardless of what applicationId was sent.
  const { data: application } = await supabase
    .from("applications")
    .select("id, customer_id, service_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }
  if (!UPLOADABLE_STATUSES.includes(application.status)) {
    return NextResponse.json({ error: "This application is not accepting document uploads." }, { status: 400 });
  }

  // 5. Relevance: this document type must actually be required for this
  // application's service, and its own mime/size rules apply on top of
  // the global allowlist above.
  const { data: link } = await supabase
    .from("service_document_types")
    .select("document_type_id, document_types(allowed_mime_types, max_file_size_bytes)")
    .eq("service_id", application.service_id)
    .eq("document_type_id", documentTypeId)
    .maybeSingle();

  const docType = link?.document_types;
  if (!docType) {
    return NextResponse.json({ error: "This document is not required for this application." }, { status: 400 });
  }
  if (!docType.allowed_mime_types.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type for this document." }, { status: 400 });
  }
  if (file.size > docType.max_file_size_bytes) {
    return NextResponse.json({ error: "File is too large for this document type." }, { status: 400 });
  }

  // 6. Magic-byte check against the actual bytes -- the last and strongest
  // check before anything is written anywhere.
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  if (!matchesFileSignature(file.type, bytes)) {
    return NextResponse.json({ error: "The file's content does not match its declared type." }, { status: 400 });
  }

  // 7. Server-generated id and object key -- never derived from the
  // client-supplied filename.
  const documentId = crypto.randomUUID();
  const objectKey = `applications/${applicationId}/${documentId}/document.${safeExtensionForMimeType(file.type)}`;

  const uploaded = await uploadToR2Worker(objectKey, arrayBuffer, file.type);
  if (!uploaded) {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }

  // 8. Metadata insert. customer_id comes from the verified `application`
  // row, never from the client. If this fails after a successful R2
  // write, roll the R2 object back so nothing is ever orphaned in storage
  // without a matching database record.
  const { data: doc, error: insertError } = await supabase
    .from("application_documents")
    .insert({
      id: documentId,
      application_id: applicationId,
      document_type_id: documentTypeId,
      customer_id: application.customer_id,
      original_filename: file.name,
      r2_object_key: objectKey,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: user.id,
    })
    .select("id, status")
    .single();

  if (insertError || !doc) {
    console.error("application_documents insert failed after R2 upload; rolling back R2 object", {
      objectKey,
      insertError,
    });
    const cleaned = await deleteFromR2Worker(objectKey);
    if (!cleaned) {
      console.error("R2 rollback delete also failed -- orphaned object requires manual cleanup", { objectKey });
    }
    return NextResponse.json({ error: "Could not save the document. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ id: doc.id, status: doc.status }, { status: 201 });
}
