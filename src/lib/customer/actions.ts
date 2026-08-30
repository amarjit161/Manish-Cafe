"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyCustomer, getAppointmentAvailability } from "@/lib/customer/queries";
import { getCurrentUserProfile } from "@/lib/auth/session";
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

export type AppointmentActionState = { error?: string; success?: true } | undefined;

/**
 * Thin server-side wrapper so the booking UI (a client component) can
 * fetch real availability on demand -- e.g. when the customer picks a
 * different date -- without a full page navigation. Read-only; never
 * used to decide whether a booking succeeds (book_appointment() re-checks
 * capacity itself at the moment of booking).
 */
export async function fetchAppointmentAvailability(serviceId: string, date: string) {
  return getAppointmentAvailability(serviceId, date);
}

/**
 * book_appointment() independently re-verifies ownership of
 * applicationId, that the service actually requires an appointment, and
 * -- inside a row lock on the slot template -- that capacity hasn't been
 * exhausted, so nothing this action sends is trusted as-is; it only
 * forwards what the customer picked.
 */
export async function bookAppointment(
  applicationId: string,
  params: { slotTemplateId: string; date: string; primaryMobile: string; alternativeMobile?: string },
): Promise<AppointmentActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("book_appointment", {
    p_application_id: applicationId,
    p_slot_template_id: params.slotTemplateId,
    p_date: params.date,
    p_primary_mobile: params.primaryMobile,
    p_alternative_mobile: params.alternativeMobile,
  });

  if (error) {
    return { error: error.message.includes("fully booked") ? "That time is fully booked. Please choose another." : "We couldn't book that appointment. Please try again." };
  }

  revalidatePath(`/customer/applications/${applicationId}`);
  revalidatePath("/customer");
  return { success: true };
}

export async function rescheduleAppointment(
  appointmentId: string,
  applicationId: string,
  params: { slotTemplateId: string; date: string },
): Promise<AppointmentActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: appointmentId,
    p_new_slot_template_id: params.slotTemplateId,
    p_new_date: params.date,
  });

  if (error) {
    return { error: error.message.includes("fully booked") ? "That time is fully booked. Please choose another." : "We couldn't change your appointment. Please try again." };
  }

  revalidatePath(`/customer/applications/${applicationId}`);
  revalidatePath("/customer");
  return { success: true };
}

export async function cancelAppointment(appointmentId: string, applicationId: string): Promise<AppointmentActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_own_appointment", { p_appointment_id: appointmentId });

  if (error) {
    return { error: "We couldn't cancel your appointment. Please try again." };
  }

  revalidatePath(`/customer/applications/${applicationId}`);
  revalidatePath("/customer");
  return { success: true };
}

/**
 * Updates the caller's own name/phone/address/date of birth -- on both
 * `customers` (the business-domain record) and `profiles` (the
 * auth-role record), which keep independent copies of full_name/phone.
 * Neither table's UPDATE policy needs anything special from this action:
 * customers_update and profiles_update already allow
 * profile_id/id = auth.uid() respectively, so an unauthenticated caller
 * or a mismatched id is rejected by RLS regardless of what's sent here.
 * Email is intentionally never touched here -- it's also the Supabase
 * Auth login identifier, and changing it for real requires
 * auth.updateUser({ email }) plus a confirmation-link round trip, which
 * is out of scope for this simple profile-details form. The Account/Edit
 * Profile UI renders email read-only accordingly.
 */
export async function updateMyProfile(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return { error: "You need to be signed in to update your profile." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();

  if (!fullName) {
    return { error: "Full name is required." };
  }
  if (fullName.length > 200) {
    return { error: "Full name is too long." };
  }

  const supabase = await createClient();

  const [{ error: profileError }, { error: customerError }] = await Promise.all([
    supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", profile.id),
    supabase
      .from("customers")
      .update({
        full_name: fullName,
        phone: phone || null,
        address: address || null,
        date_of_birth: dateOfBirth || null,
      })
      .eq("profile_id", profile.id),
  ]);

  if (profileError || customerError) {
    return { error: "We couldn't save your changes. Please try again." };
  }

  revalidatePath("/customer/account");
  revalidatePath("/customer/settings");
  revalidatePath("/customer");
  return undefined;
}
