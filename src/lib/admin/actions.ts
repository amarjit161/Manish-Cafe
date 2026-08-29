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
 * The document review state machine, enforced here -- not just by hiding
 * buttons in the UI -- so a direct call to an action with a stale document
 * id fails the same way a forged request would:
 *
 *   uploaded / under_review  -> approve, reject, or request-reupload (all
 *                                three are live options pre-decision)
 *   approved                 -> terminal. No further action of any kind.
 *   rejected                 -> only request-reupload is meaningful; a
 *                                second rejection or a late approval of a
 *                                document already rejected is not a real
 *                                workflow, so both are blocked.
 *   reupload_required        -> only request-reupload (to revise the
 *                                message); approve/reject don't apply until
 *                                the customer actually replaces the file.
 *   deleted                  -> terminal, never reachable at all.
 */
const ALLOWED_SOURCE_STATUSES: Record<"approve" | "reject" | "reupload", string[]> = {
  approve: ["uploaded", "under_review"],
  reject: ["uploaded", "under_review"],
  reupload: ["uploaded", "under_review", "rejected", "reupload_required"],
};

/**
 * A re-upload always creates a NEW application_documents row rather than
 * mutating the old one (see the upload route), so the old row is kept
 * purely for audit history -- review actions must only ever apply to the
 * current (latest-uploaded) row for that document type, never a
 * superseded historical one.
 */
async function loadReviewableDocument(
  supabase: SupabaseServerClient,
  documentId: string,
  action: "approve" | "reject" | "reupload",
) {
  const { data: doc } = await supabase
    .from("application_documents")
    .select("id, application_id, document_type_id, status, uploaded_at")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { doc: null, error: "Document not found." };

  if (!ALLOWED_SOURCE_STATUSES[action].includes(doc.status)) {
    return { doc: null, error: `This document is currently "${doc.status}" -- that action is not available for it.` };
  }

  const { data: latest } = await supabase
    .from("application_documents")
    .select("id")
    .eq("application_id", doc.application_id)
    .eq("document_type_id", doc.document_type_id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .single();

  if (latest?.id !== doc.id) {
    return { doc: null, error: "This is a previous version of this document and can no longer be reviewed." };
  }

  return { doc, error: null };
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

  const { error: reviewError } = await loadReviewableDocument(supabase, documentId, "approve");
  if (reviewError) return { error: reviewError };

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

  const { error: reviewError } = await loadReviewableDocument(supabase, documentId, "reject");
  if (reviewError) return { error: reviewError };

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

  const { error: reviewError } = await loadReviewableDocument(supabase, documentId, "reupload");
  if (reviewError) return { error: reviewError };

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

const APPOINTMENT_STATUS_VALUES = ["booked", "completed", "cancelled", "no_show"] as const;

/**
 * Enforced by RLS (appointments_admin_update: current_role() = 'admin'),
 * not just by the requireAdminUser() check here -- a non-admin session
 * calling this directly would still be denied at the database.
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: (typeof APPOINTMENT_STATUS_VALUES)[number],
): Promise<ActionState> {
  const supabase = await createClient();
  const user = await requireAdminUser(supabase);
  if (!user) return { error: "Unauthorized." };

  if (!APPOINTMENT_STATUS_VALUES.includes(status)) return { error: "Invalid status." };

  const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);
  if (error) return { error: "Could not update the appointment." };

  revalidatePath("/admin/dashboard/appointments");
  return { success: "Appointment updated." };
}

export async function updateAppointmentNotes(appointmentId: string, notes: string): Promise<ActionState> {
  const supabase = await createClient();
  const user = await requireAdminUser(supabase);
  if (!user) return { error: "Unauthorized." };

  const { error } = await supabase.from("appointments").update({ admin_notes: notes }).eq("id", appointmentId);
  if (error) return { error: "Could not save the note." };

  revalidatePath("/admin/dashboard/appointments");
  return { success: "Note saved." };
}
