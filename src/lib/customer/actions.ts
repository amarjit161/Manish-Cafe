"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyCustomer } from "@/lib/customer/queries";
import { isDocumentRequired } from "@/lib/applications/requirements";

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
    return { error: "Your customer profile could not be found." };
  }

  const supabase = await createClient();

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, customer_price")
    .eq("id", serviceId)
    .eq("is_active", true)
    .maybeSingle();

  if (serviceError || !service) {
    return { error: "That service is not available." };
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
    return { error: "Could not create the application. Please try again." };
  }

  redirect(`/customer/applications/${application.id}`);
}

const NON_CURRENT_DOCUMENT_STATUSES = ["rejected", "reupload_required", "deleted"];

/**
 * The only path that ever changes an application's status (enforced by
 * the prevent_direct_status_change DB trigger). change_application_status()
 * independently verifies the caller owns this application before doing
 * anything, and only allows a customer to move draft -> submitted.
 *
 * Before calling it, this also enforces (server-side, not just in the UI)
 * that every currently-required document -- given the application's
 * answers, e.g. the Aadhaar "what do you want to update" selection -- has
 * a live upload. A customer cannot bypass this by hiding a form field or
 * calling the action directly.
 */
export async function submitApplication(
  applicationId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("service_id, answers")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) {
    return { error: "Application not found." };
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

  const answers = (application.answers ?? {}) as Record<string, unknown>;
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
    return { error: "Could not submit the application. Please try again." };
  }

  revalidatePath(`/customer/applications/${applicationId}`);
}

/**
 * Persists service-specific question answers (e.g. Aadhaar's "what do you
 * want to update") into the generic applications.answers jsonb column.
 * Ownership is enforced by RLS (applications_update is customer-scoped to
 * their own draft applications via prevent_customer_application_tamper +
 * the underlying applications_update policy), not by this function.
 */
export async function updateApplicationAnswers(
  applicationId: string,
  updateFields: string[],
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ answers: { update_fields: updateFields } })
    .eq("id", applicationId);

  if (error) {
    return { error: "Could not save your answers. Please try again." };
  }

  revalidatePath(`/customer/applications/${applicationId}`);
}

export async function sendCustomerMessage(
  applicationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Message cannot be empty." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized." };

  const { error } = await supabase.from("application_messages").insert({
    application_id: applicationId,
    sender_profile_id: user.id,
    sender_role: "customer",
    message,
  });

  if (error) return { error: "Could not send the message." };
  revalidatePath(`/customer/applications/${applicationId}`);
}
