"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyCustomer } from "@/lib/customer/queries";
import { isDocumentRequired } from "@/lib/applications/requirements";
import { deriveAnswerFlags, type MobileRegisteredAnswer } from "@/lib/applications/aadhaar-fields";
import { deleteFromR2Worker } from "@/lib/documents/r2-worker";

export type ActionState = { error?: string } | undefined;

/**
 * customer_id is always derived server-side from the authenticated
 * session (getMyCustomer), never accepted from the client. The
 * applications_insert RLS policy independently re-checks
 * customer_id = current_customer_id() AND status = 'draft' regardless of
 * what this action sends -- so even a bug here can't create an
 * application owned by someone else.
 */
export async function createApplication(
  serviceId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const customer = await getMyCustomer();
  if (!customer) {
    return { error: "We couldn't find your customer profile. Please try again." };
  }

  const supabase = await createClient();

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, customer_price")
    .eq("id", serviceId)
    .eq("is_active", true)
    .maybeSingle();

  if (serviceError || !service) {
    return { error: "This service isn't available right now." };
  }

  const { data: application, error } = await supabase
    .from("applications")
    .insert({
      customer_id: customer.id,
      service_id: service.id,
      customer_price_snapshot: service.customer_price,
      status: "draft",
      created_by: customer.profile_id ?? undefined,
    })
    .select("id")
    .single();

  if (error || !application) {
    return { error: "We couldn't start your application. Please try again." };
  }

  redirect(`/customer/applications/${application.id}`);
}

/**
 * delete_draft_application() is the only path that can ever remove an
 * applications row: it independently re-checks ownership and that the
 * application is still a draft (a customer can never delete a submitted
 * application, regardless of what this action sends), and returns the R2
 * object keys of whatever documents it deleted so they can be cleaned up
 * here -- Postgres has no way to reach the Cloudflare Worker itself.
 */
export async function deleteDraftApplication(applicationId: string): Promise<ActionState> {
  const supabase = await createClient();

  const { data: objectKeys, error } = await supabase.rpc("delete_draft_application", {
    p_application_id: applicationId,
  });

  if (error) {
    return { error: "We couldn't delete this application. Please try again." };
  }

  for (const key of objectKeys ?? []) {
    await deleteFromR2Worker(key);
  }

  revalidatePath("/customer/applications");
  redirect("/customer/applications?deleted=1");
}

const NON_CURRENT_DOCUMENT_STATUSES = ["rejected", "reupload_required", "deleted"];

/**
 * Shared between updateApplicationAnswers (so "Save & continue" catches
 * these before the customer even reaches the documents/review sections)
 * and submitApplication (the final, unbypassable gate). update_fields is
 * only ever populated by the guided update-fields flow (currently just
 * Aadhaar) -- every check here is a no-op for any other service, exactly
 * like the pre-existing "other" check was before this was factored out.
 */
function validateUpdateFieldsAnswers(answers: Record<string, unknown>): string | null {
  const updateFields = Array.isArray(answers.update_fields) ? (answers.update_fields as unknown[]) : [];
  if (updateFields.length === 0) return null;

  const otherText = typeof answers.other_text === "string" ? answers.other_text.trim() : "";
  if (updateFields.includes("other") && !otherText) {
    return "Please tell us what else you'd like to update, or unselect \"Other\".";
  }

  if (updateFields.includes("mobile") && !answers.mobile_registered) {
    return "Please answer whether a mobile number is already registered with your Aadhaar.";
  }

  const contactMobile = typeof answers.contact_mobile === "string" ? answers.contact_mobile.trim() : "";
  if (!contactMobile) {
    return "Please add a mobile number so we can contact you about your application.";
  }

  return null;
}

/**
 * The only path that ever changes an application's status (enforced by
 * the prevent_direct_status_change DB trigger). change_application_status()
 * independently verifies the caller owns this application before doing
 * anything, only allows a customer to move draft -> submitted, and
 * computes/snapshots the final price itself from the service's configured
 * extra charges -- this action never sends a price, only a status change.
 *
 * Before calling it, this also enforces (server-side, not just in the UI)
 * that every currently-required document -- given the application's
 * answers, e.g. the Aadhaar "what do you want to update" selection -- has
 * a live upload, and that "Other" has real text if selected. A customer
 * cannot bypass this by hiding a form field or calling the action directly.
 */
export async function submitApplication(
  applicationId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("service_id, answers, services(slug)")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) {
    return { error: "We couldn't find that application." };
  }

  const answers = (application.answers ?? {}) as Record<string, unknown>;
  const updateFields = Array.isArray(answers.update_fields) ? (answers.update_fields as unknown[]) : [];

  if (application.services?.slug === "aadhaar-card-update" && updateFields.length === 0) {
    return { error: "Please choose at least one thing to update." };
  }

  const validationError = validateUpdateFieldsAnswers(answers);
  if (validationError) {
    return { error: validationError };
  }

  const [{ data: requirements }, { data: documents }] = await Promise.all([
    supabase
      .from("service_document_types")
      .select("document_type_id, is_mandatory, condition_key, document_types(name)")
      .eq("service_id", application.service_id),
    supabase
      .from("application_documents")
      .select("document_type_id, status, uploaded_at")
      .eq("application_id", applicationId),
  ]);

  const requiredDocs = (requirements ?? []).filter((r) =>
    isDocumentRequired(r.condition_key, r.is_mandatory, answers),
  );

  const sorted = [...(documents ?? [])].sort(
    (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
  );
  const latestStatusByType = new Map<string, string>();
  for (const doc of sorted) {
    if (!latestStatusByType.has(doc.document_type_id)) {
      latestStatusByType.set(doc.document_type_id, doc.status);
    }
  }

  const missing = requiredDocs.filter((r) => {
    const latestStatus = latestStatusByType.get(r.document_type_id);
    return !latestStatus || NON_CURRENT_DOCUMENT_STATUSES.includes(latestStatus);
  });

  if (missing.length > 0) {
    const names = missing.map((m) => m.document_types?.name ?? "a required document").join(", ");
    return { error: `Please upload before submitting: ${names}.` };
  }

  const { error } = await supabase.rpc("change_application_status", {
    p_application_id: applicationId,
    p_new_status: "submitted",
  });

  if (error) {
    return { error: "We couldn't submit your application. Please try again." };
  }

  revalidatePath(`/customer/applications/${applicationId}`);
  // A one-time success screen (see the "submitted" search param on the
  // detail page) instead of silently re-rendering into the ongoing-status
  // view -- the customer should see a clear confirmation that their
  // submission actually went through.
  redirect(`/customer/applications/${applicationId}?submitted=1`);
}

/**
 * Persists service-specific question answers (Aadhaar's "what do you want
 * to update" + the mobile-number sub-question) into the generic
 * applications.answers jsonb column. `flags` is derived here from
 * mobile_registered via the one shared mapping (deriveAnswerFlags) that
 * both the live customer-facing price preview and the server-side price
 * snapshot read -- never computed differently in two places. Ownership is
 * enforced by RLS (applications_update, customer-scoped to their own
 * application), not by this function.
 */
export async function updateApplicationAnswers(
  applicationId: string,
  params: {
    updateFields: string[];
    otherText?: string;
    mobileRegistered?: MobileRegisteredAnswer;
    contactMobile?: string;
    contactAltMobile?: string;
    contactEmail?: string;
  },
): Promise<ActionState> {
  const supabase = await createClient();

  const answers: Record<string, string | string[]> = { update_fields: params.updateFields };
  if (params.updateFields.includes("other") && params.otherText?.trim()) {
    answers.other_text = params.otherText.trim();
  }
  if (params.updateFields.includes("mobile") && params.mobileRegistered) {
    answers.mobile_registered = params.mobileRegistered;
    answers.flags = deriveAnswerFlags({ mobile_registered: params.mobileRegistered });
  }
  if (params.contactMobile?.trim()) answers.contact_mobile = params.contactMobile.trim();
  if (params.contactAltMobile?.trim()) answers.contact_alt_mobile = params.contactAltMobile.trim();
  if (params.contactEmail?.trim()) answers.contact_email = params.contactEmail.trim();

  // Validated here too (not just at final submit) so "Save & continue"
  // catches these immediately -- the customer shouldn't reach the
  // documents/review sections only to be sent back for a missing answer.
  const validationError = validateUpdateFieldsAnswers(answers);
  if (validationError) {
    return { error: validationError };
  }

  const { error } = await supabase.from("applications").update({ answers }).eq("id", applicationId);

  if (error) {
    return { error: "We couldn't save your answers. Please try again." };
  }

  revalidatePath(`/customer/applications/${applicationId}`);
}

export async function sendCustomerMessage(
  applicationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Please write a message before sending." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You don't have access to this application." };

  const { error } = await supabase.from("application_messages").insert({
    application_id: applicationId,
    sender_profile_id: user.id,
    sender_role: "customer",
    message,
  });

  if (error) return { error: "We couldn't send your message. Please try again." };
  revalidatePath(`/customer/applications/${applicationId}`);
}
