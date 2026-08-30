import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

/**
 * All queries here run through the normal RLS-respecting server client
 * (the same one customer/retailer pages use), using the caller's own
 * authenticated admin session -- never the service-role client. The
 * applications/customers/application_documents SELECT policies already
 * include an `current_role() = 'admin'` clause, so an authenticated admin
 * sees every row; nothing here bypasses or duplicates that authorization.
 */

// Documents in either of these states are sitting in the admin's queue,
// waiting on a human decision. This is the one place "needs admin
// attention" is defined -- the dashboard's KPI/list and the applications
// register's "Needs attention" indicator both import this so they can
// never silently drift apart into two different definitions.
export const AWAITING_ADMIN_REVIEW = new Set(["uploaded", "under_review"]);

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

export type AdminApplicationFilters = {
  search?: string;
  status?: string;
  serviceId?: string;
  createdWithin?: "today" | "week" | "month";
};

function startOfCreatedWindow(window: "today" | "week" | "month"): string {
  const now = new Date();
  if (window === "today") {
    now.setHours(0, 0, 0, 0);
  } else if (window === "week") {
    now.setDate(now.getDate() - 7);
  } else {
    now.setDate(now.getDate() - 30);
  }
  return now.toISOString();
}

/**
 * Status/service/date narrow the actual query (cheap, indexable columns).
 * Free-text search spans a joined customer's name/email/phone, which
 * PostgREST can't express as a single filter across relations -- same
 * reasoning as the appointments register's search. Applications is a
 * small table for this business (dozens, not millions of rows), so
 * fetching a generous bound and filtering in application code is simpler
 * and no less correct than a more elaborate embedded-filter query or a
 * dedicated search index. The bound is only raised when a search term is
 * present -- without one, this preserves the original "most recent 100"
 * behavior exactly.
 */
export async function getAllApplicationsForAdmin(filters: AdminApplicationFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("applications")
    .select(
      // appointments is embedded as-is (same relation/RLS already used by
      // getAdminAppointments, just read from the applications side) --
      // this is a presentation addition, not a new query path. An
      // application can theoretically accumulate more than one row here
      // over its lifetime (rescheduled/cancelled-and-rebooked), so this
      // stays an array; callers pick the one they care about.
      "id, application_number, status, customer_price_snapshot, created_at, updated_at, submitted_at, customers(full_name, email, phone), services(id, name), application_documents(status), appointments(appointment_date, status, appointment_slot_templates(start_time))",
    )
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status as Database["public"]["Enums"]["application_status"]);
  if (filters.serviceId) query = query.eq("service_id", filters.serviceId);
  if (filters.createdWithin) query = query.gte("created_at", startOfCreatedWindow(filters.createdWithin));

  query = query.limit(filters.search?.trim() ? 1000 : 100);

  const { data, error } = await query;
  if (error) throw error;

  let rows = data ?? [];
  const term = filters.search?.trim().toLowerCase();
  if (term) {
    rows = rows.filter(
      (a) =>
        a.application_number?.toLowerCase().includes(term) ||
        a.customers?.full_name?.toLowerCase().includes(term) ||
        a.customers?.email?.toLowerCase().includes(term) ||
        a.customers?.phone?.toLowerCase().includes(term),
    );
  }

  // Document progress ("2/3 documents") is computed here rather than in a
  // view -- documents are the currently-required set only, but the list
  // page shows a simple total/verified count, not the conditional
  // requirement logic that the detail page needs.
  return rows.map((application) => {
    const documents = application.application_documents ?? [];
    const approvedCount = documents.filter((d) => d.status === "approved" || d.status === "verified").length;

    // Prefer the still-booked appointment if one exists; otherwise fall
    // back to the most recent row (cancelled/completed) so a genuinely
    // past appointment isn't silently hidden. Real data currently never
    // has more than one row per application, so this is a safety net,
    // not the common case. Supabase's generated type for this embed is
    // "single row | never[]" rather than a plain array, so normalize
    // first regardless of which shape actually comes back.
    const rawAppointments = application.appointments;
    const appointments = Array.isArray(rawAppointments) ? rawAppointments : rawAppointments ? [rawAppointments] : [];
    const currentAppointment =
      appointments.find((a) => a.status === "booked") ??
      [...appointments].sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))[0] ??
      null;

    return {
      ...application,
      documentCounts: { approved: approvedCount, total: documents.length },
      currentAppointment,
    };
  });
}

export async function getAllServicesForAdminFilter() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("services").select("id, name").order("name");
  if (error) throw error;
  return data ?? [];
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
