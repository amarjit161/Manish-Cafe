import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getApplicationProgress } from "@/lib/applications/progress";
import { isDocumentRequired } from "@/lib/applications/requirements";
import type { Tables } from "@/lib/supabase/database.types";

export type CustomerRow = Tables<"customers">;

/**
 * The caller's own customer record. RLS (customers_select) already scopes
 * this to profile_id = auth.uid() -- the explicit .eq() below is belt and
 * suspenders, not the actual security boundary.
 */
export const getMyCustomer = cache(async (): Promise<CustomerRow | null> => {
  const profile = await getCurrentUserProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("*").eq("profile_id", profile.id).maybeSingle();
  return data;
});

export async function getActiveServices() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("services").select("*").eq("is_active", true).order("name");
  if (error) throw error;
  return data;
}

/**
 * The service overview only -- no document checklist. Document
 * requirements are shown later, inside the guided draft-application flow,
 * only once the customer has actually answered the service's questions
 * (an unconditional document is meaningless before that; a conditional one
 * like Aadhaar's Address Proof is actively misleading before that).
 */
export async function getService(serviceId: string) {
  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return service;
}

export async function getServiceExtraCharges(serviceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_extra_charges")
    .select("condition_key, label, amount, display_order")
    .eq("service_id", serviceId)
    .order("display_order");
  if (error) throw error;
  return data ?? [];
}

/**
 * The caller's own applications. RLS (applications_select) scopes this to
 * customer_id = current_customer_id() regardless of this query -- a
 * customer can never see another customer's applications even if this
 * function had a bug.
 */
export async function getMyApplications() {
  const customer = await getMyCustomer();
  if (!customer) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*, services(name, category)")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * The caller's own applications, each with its canonical progress stage
 * already computed (getApplicationProgress) -- so the dashboard and
 * applications list can show the same "Action required" / "We're
 * reviewing your application" language as the detail page, without
 * inventing their own per-row status logic. Batches the child-table
 * lookups (one query for all documents, one for all service_document_types
 * across every distinct service involved) instead of querying per
 * application, so this stays cheap regardless of how many applications a
 * customer has.
 */
export async function getMyApplicationsWithProgress() {
  const customer = await getMyCustomer();
  if (!customer) return [];

  const supabase = await createClient();
  const { data: applications, error } = await supabase
    .from("applications")
    .select("*, services(name, category)")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!applications || applications.length === 0) return [];

  const applicationIds = applications.map((a) => a.id);
  const serviceIds = [...new Set(applications.map((a) => a.service_id))];

  const [{ data: allDocuments }, { data: allRequirements }, { data: allAppointments }] = await Promise.all([
    supabase
      .from("application_documents")
      .select("application_id, document_type_id, status, uploaded_at, rejection_reason, reupload_message, document_types(name)")
      .in("application_id", applicationIds)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("service_document_types")
      .select("service_id, document_type_id, is_mandatory, condition_key")
      .in("service_id", serviceIds),
    supabase
      .from("appointments")
      .select("application_id, appointment_date, status, appointment_slot_templates(start_time)")
      .in("application_id", applicationIds),
  ]);

  return applications.map((app) => {
    const answers = (app.answers ?? {}) as Record<string, unknown>;
    const requirements = (allRequirements ?? []).filter((r) => r.service_id === app.service_id);
    const docsForApp = (allDocuments ?? []).filter((d) => d.application_id === app.id);

    const latestByType = new Map<string, (typeof docsForApp)[number]>();
    for (const doc of docsForApp) {
      if (!latestByType.has(doc.document_type_id)) latestByType.set(doc.document_type_id, doc);
    }

    const currentRequiredDocuments = requirements
      .filter((r) => isDocumentRequired(r.condition_key, r.is_mandatory, answers))
      .map((r) => latestByType.get(r.document_type_id))
      .filter((doc): doc is NonNullable<typeof doc> => !!doc)
      .map((doc) => ({
        id: `${doc.application_id}-${doc.document_type_id}`,
        documentTypeId: doc.document_type_id,
        status: doc.status,
        rejection_reason: doc.rejection_reason,
        reupload_message: doc.reupload_message,
        documentTypeName: doc.document_types?.name ?? "Document",
      }));

    const progress = getApplicationProgress({ applicationStatus: app.status, currentRequiredDocuments });
    const appointment = (allAppointments ?? []).find((a) => a.application_id === app.id) ?? null;
    return { application: app, progress, appointment };
  });
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A single application by either its internal UUID or its customer-facing
 * application_number (e.g. "MC-2026-000005") -- accepting the friendlier
 * identifier is purely a URL/UX convenience. It changes nothing about the
 * security boundary: ownership is NOT checked here in application code,
 * either way. RLS on applications/application_documents/
 * application_status_history already denies any row that doesn't belong
 * to the caller, so a reference for another customer's application
 * resolves to null (rendered as 404), not a leaked record. A draft
 * application has no application_number yet, so it can only ever be
 * reached by its UUID until it's submitted.
 */
export async function getApplicationDetail(applicationRef: string) {
  const supabase = await createClient();

  const lookupColumn = UUID_PATTERN.test(applicationRef) ? "id" : "application_number";
  const { data: application, error } = await supabase
    .from("applications")
    .select("*, services(id, name, description, category, slug, requires_appointment)")
    .eq(lookupColumn, applicationRef)
    .maybeSingle();
  if (error) throw error;
  if (!application) return null;

  const [{ data: requiredDocs }, { data: documents }, { data: history }, { data: messages }, { data: extraCharges }, { data: appointment }] =
    await Promise.all([
      supabase
        .from("service_document_types")
        .select(
          "id, is_mandatory, condition_key, display_order, document_type_id, document_types(id, code, name, description, allowed_mime_types, max_file_size_bytes)",
        )
        .eq("service_id", application.service_id)
        .order("display_order"),
      supabase
        .from("application_documents")
        .select("*, document_types(name, code)")
        .eq("application_id", application.id)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("application_status_history")
        .select("*")
        .eq("application_id", application.id)
        .order("created_at", { ascending: true }),
      // application_messages_select scopes this to the caller's own
      // application (or their retailer's) -- never returns rows for someone
      // else's application, and application_internal_notes is intentionally
      // NOT queried here at all: there is no policy granting customers any
      // access to it, so it isn't just hidden in the UI, it's unreadable.
      supabase
        .from("application_messages")
        .select("*")
        .eq("application_id", application.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("service_extra_charges")
        .select("condition_key, label, amount, display_order")
        .eq("service_id", application.service_id)
        .order("display_order"),
      // applications.id is unique on appointments (one appointment per
      // application), so .maybeSingle() rather than a list.
      supabase
        .from("appointments")
        .select("*, appointment_slot_templates(start_time, end_time)")
        .eq("application_id", application.id)
        .maybeSingle(),
    ]);

  return {
    application,
    requiredDocs: requiredDocs ?? [],
    documents: documents ?? [],
    history: history ?? [],
    messages: messages ?? [],
    extraCharges: extraCharges ?? [],
    appointment: appointment ?? null,
  };
}

/**
 * Read-only availability preview for a service/date -- SECURITY DEFINER
 * on the database side (get_appointment_availability) so the count is
 * accurate across every customer's bookings, not just the caller's own
 * RLS-visible rows. Never used to decide whether a booking succeeds;
 * book_appointment() re-checks capacity itself, inside a lock, at the
 * moment of booking.
 */
export async function getAppointmentAvailability(serviceId: string, date: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_appointment_availability", {
    p_service_id: serviceId,
    p_date: date,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * The single soonest upcoming (not yet past, still "booked") appointment
 * across all of the caller's applications -- for the home page's
 * priority banner. RLS already scopes appointments to the caller's own
 * customer_id regardless of this query.
 */
export async function getUpcomingAppointment() {
  const customer = await getMyCustomer();
  if (!customer) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*, appointment_slot_templates(start_time, end_time), applications(application_number, services(name))")
    .eq("customer_id", customer.id)
    .eq("status", "booked")
    .gte("appointment_date", new Date().toISOString().slice(0, 10))
    .order("appointment_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
