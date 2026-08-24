"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDocumentRequired } from "@/lib/applications/requirements";

export type ActionState = { error?: string; success?: string } | undefined;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Defense in depth alongside the /admin/dashboard middleware gate -- every
 * action here re-checks the caller's role itself rather than trusting that
 * middleware (or the page it was submitted from) already did.
 */
async function requireAdminUser(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (!profile || profile.role !== "admin" || profile.status !== "active") return null;

  return user;
}

/**
 * A rejection or re-upload request always means the application needs more
 * from the customer. Only nudges the status when the application has
 * actually been submitted -- a still-draft application's documents aren't
 * part of a review cycle yet, so its status is left alone.
 */
async function requestMoreDocuments(supabase: SupabaseServerClient, applicationId: string) {
  const { data: application } = await supabase
    .from("applications")
    .select("status")
    .eq("id", applicationId)
    .maybeSingle();

  if (application && ["submitted", "under_review"].includes(application.status)) {
    await supabase.rpc("change_application_status", {
      p_application_id: applicationId,
      p_new_status: "documents_required",
    });
  }
}

/**
 * After an approval, checks whether every currently-required document
 * (given the application's answers -- see isDocumentRequired) now has an
 * approved upload, and if so advances the application to "processing".
 * Only fires from a state where documents were the blocker.
 */
async function advanceIfAllDocumentsApproved(supabase: SupabaseServerClient, applicationId: string) {
  const { data: application } = await supabase
    .from("applications")
    .select("status, service_id, answers")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application || !["submitted", "under_review", "documents_required"].includes(application.status)) {
    return;
  }

  const [{ data: requirements }, { data: documents }] = await Promise.all([
    supabase
      .from("service_document_types")
      .select("document_type_id, is_mandatory, condition_key")
      .eq("service_id", application.service_id),
    supabase
      .from("application_documents")
      .select("document_type_id, status")
      .eq("application_id", applicationId),
  ]);

  const answers = (application.answers ?? {}) as Record<string, unknown>;
  const requiredTypeIds = (requirements ?? [])
    .filter((r) => isDocumentRequired(r.condition_key, r.is_mandatory, answers))
    .map((r) => r.document_type_id);

  if (requiredTypeIds.length === 0) return;

  const approvedTypeIds = new Set(
    (documents ?? []).filter((d) => d.status === "approved").map((d) => d.document_type_id),
  );

  const allApproved = requiredTypeIds.every((id) => approvedTypeIds.has(id));
  if (allApproved) {
    await supabase.rpc("change_application_status", {
      p_application_id: applicationId,
      p_new_status: "processing",
    });
  }
}

export async function approveDocument(
  documentId: string,
  applicationId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const user = await requireAdminUser(supabase);
  if (!user) return { error: "Unauthorized." };

  const { error } = await supabase
    .from("application_documents")
    .update({
      status: "approved",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      rejection_reason: null,
      reupload_message: null,
    })
    .eq("id", documentId);

  if (error) return { error: "Could not approve the document." };

  await advanceIfAllDocumentsApproved(supabase, applicationId);
  revalidatePath(`/admin/dashboard/applications/${applicationId}`);
  return { success: "Document approved." };
}

export async function rejectDocument(
  documentId: string,
  applicationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "A rejection reason is required." };

  const supabase = await createClient();
  const user = await requireAdminUser(supabase);
  if (!user) return { error: "Unauthorized." };

  const { error } = await supabase
    .from("application_documents")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reupload_message: null,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) return { error: "Could not reject the document." };

  await requestMoreDocuments(supabase, applicationId);
  revalidatePath(`/admin/dashboard/applications/${applicationId}`);
  return { success: "Document rejected." };
}

export async function requestDocumentReupload(
  documentId: string,
  applicationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Please describe what the customer needs to re-upload." };

  const supabase = await createClient();
  const user = await requireAdminUser(supabase);
  if (!user) return { error: "Unauthorized." };

  const { error } = await supabase
    .from("application_documents")
    .update({
      status: "reupload_required",
      reupload_message: message,
      rejection_reason: null,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) return { error: "Could not request a re-upload." };

  await requestMoreDocuments(supabase, applicationId);
  revalidatePath(`/admin/dashboard/applications/${applicationId}`);
  return { success: "Re-upload requested." };
}

export async function sendAdminMessage(
  applicationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Message cannot be empty." };

  const supabase = await createClient();
  const user = await requireAdminUser(supabase);
  if (!user) return { error: "Unauthorized." };

  const { error } = await supabase.from("application_messages").insert({
    application_id: applicationId,
    sender_profile_id: user.id,
    sender_role: "admin",
    message,
  });

  if (error) return { error: "Could not send the message." };
  revalidatePath(`/admin/dashboard/applications/${applicationId}`);
  return { success: "Message sent." };
}

export async function addInternalNote(
  applicationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Note cannot be empty." };

  const supabase = await createClient();
  const user = await requireAdminUser(supabase);
  if (!user) return { error: "Unauthorized." };

  const { error } = await supabase.from("application_internal_notes").insert({
    application_id: applicationId,
    author_profile_id: user.id,
    note,
  });

  if (error) return { error: "Could not save the note." };
  revalidatePath(`/admin/dashboard/applications/${applicationId}`);
  return { success: "Note added." };
}
