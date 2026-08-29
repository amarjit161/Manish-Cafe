import { createClient } from "@/lib/supabase/server";

/**
 * All queries here run through the normal RLS-respecting server client
 * (the same one customer/retailer pages use), using the caller's own
 * authenticated admin session -- never the service-role client. The
 * applications/customers/application_documents SELECT policies already
 * include an `current_role() = 'admin'` clause, so an authenticated admin
 * sees every row; nothing here bypasses or duplicates that authorization.
 */

export async function getAdminDashboardStats() {
  const supabase = await createClient();

  const [
    { count: applicationsCount },
    { count: customersCount },
    { count: pendingDocumentReviews },
    { count: reuploadRequiredDocuments },
    { count: completedApplications },
  ] = await Promise.all([
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase
      .from("application_documents")
      .select("*", { count: "exact", head: true })
      .in("status", ["uploaded", "under_review"]),
    supabase
      .from("application_documents")
      .select("*", { count: "exact", head: true })
      .eq("status", "reupload_required"),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "completed"),
  ]);

  return {
    applicationsCount: applicationsCount ?? 0,
    customersCount: customersCount ?? 0,
    pendingDocumentReviews: pendingDocumentReviews ?? 0,
    reuploadRequiredDocuments: reuploadRequiredDocuments ?? 0,
    completedApplications: completedApplications ?? 0,
    // No payments/wallets/support_tickets tables exist in the schema yet
    // (PR #11-13 scope) -- reported as not implemented rather than a
    // fabricated 0 that would misleadingly imply the feature exists.
    pendingPayments: null as number | null,
    openTickets: null as number | null,
  };
}

export async function getAllApplicationsForAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, application_number, status, customer_price_snapshot, created_at, updated_at, customers(full_name), services(name), application_documents(status)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  // Document progress ("2/3 documents") is computed here rather than in a
  // view -- documents are the currently-required set only, but the list
  // page shows a simple total/verified count, not the conditional
  // requirement logic that the detail page needs.
  return (data ?? []).map((application) => {
    const documents = application.application_documents ?? [];
    const approvedCount = documents.filter((d) => d.status === "approved" || d.status === "verified").length;
    return {
      ...application,
      documentCounts: { approved: approvedCount, total: documents.length },
    };
  });
}

export async function getApplicationDetailForAdmin(applicationId: string) {
  const supabase = await createClient();

  const { data: application, error } = await supabase
    .from("applications")
    .select(
      "*, customers(id, full_name, email, phone), services(id, name, description, category)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  if (!application) return null;

  const [{ data: documents }, { data: history }, { data: messages }, { data: internalNotes }, { data: requiredDocs }] =
    await Promise.all([
      supabase
        .from("application_documents")
        .select("*, document_types(name, code)")
        .eq("application_id", applicationId)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("application_status_history")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true }),
      supabase
        .from("application_messages")
        .select("*, profiles(full_name, role)")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true }),
      supabase
        .from("application_internal_notes")
        .select("*, profiles(full_name)")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true }),
      // Needed so the admin page can compute the exact same canonical
      // getApplicationProgress() the customer page uses -- one status
      // calculation reused everywhere, not a second one invented here.
      supabase
        .from("service_document_types")
        .select("is_mandatory, condition_key, document_type_id, document_types(name)")
        .eq("service_id", application.service_id),
    ]);

  return {
    application,
    documents: documents ?? [],
    history: history ?? [],
    messages: messages ?? [],
    internalNotes: internalNotes ?? [],
    requiredDocs: requiredDocs ?? [],
  };
}

export type AdminAppointmentFilters = {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  mobileRegistered?: "yes" | "no" | "unknown" | "registered_other";
  search?: string;
};

/**
 * appointments_select already grants admin unconditional read access
 * (current_role() = 'admin'), same as every other admin query here --
 * this just shapes and filters that same authorized read, it does not
 * grant anything on its own. mobile_registered isn't a column on
 * appointments (it lives in applications.answers, set once during the
 * Aadhaar flow) so that filter is applied in application code after the
 * join rather than as a second, duplicate copy of the same fact.
 */
export async function getAdminAppointments(filters: AdminAppointmentFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select(
      "*, appointment_slot_templates(start_time, end_time), applications(application_number, status, answers, services(name)), customers(full_name)",
    )
    .order("appointment_date", { ascending: true });

  if (filters.date) query = query.eq("appointment_date", filters.date);
  if (filters.dateFrom) query = query.gte("appointment_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("appointment_date", filters.dateTo);
  if (filters.status) query = query.eq("status", filters.status as "booked" | "completed" | "cancelled" | "no_show");

  const { data, error } = await query;
  if (error) throw error;

  // Search spans a joined customer name + application number, which
  // PostgREST can't express in a single .or() across relations -- this
  // dataset (a day/week's worth of appointments) is small enough that
  // filtering after the fetch is simpler and no less correct than a
  // more elaborate embedded-filter query.
  let rows = data ?? [];
  const term = filters.search?.trim().toLowerCase();
  if (term) {
    rows = rows.filter(
      (r) =>
        r.primary_mobile?.toLowerCase().includes(term) ||
        r.alternative_mobile?.toLowerCase().includes(term) ||
        r.customers?.full_name?.toLowerCase().includes(term) ||
        r.applications?.application_number?.toLowerCase().includes(term),
    );
  }
  if (filters.mobileRegistered) {
    rows = rows.filter((r) => {
      const answers = (r.applications?.answers ?? {}) as Record<string, unknown>;
      return answers.mobile_registered === filters.mobileRegistered;
    });
  }

  return rows;
}
