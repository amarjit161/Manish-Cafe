import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { pickCurrentAppointment } from "@/lib/applications/appointments";

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

    const currentAppointment = pickCurrentAppointment(application.appointments);

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

  const [
    { data: documents },
    { data: history },
    { data: messages },
    { data: internalNotes },
    { data: requiredDocs },
    { data: appointments },
  ] = await Promise.all([
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
    // Same table/RLS getAdminAppointments already reads, just scoped to
    // this one application and with the columns the detail page's
    // appointment card actually shows (contact numbers, admin notes).
    supabase
      .from("appointments")
      .select("*, appointment_slot_templates(start_time, end_time)")
      .eq("application_id", applicationId),
  ]);

  return {
    application,
    documents: documents ?? [],
    history: history ?? [],
    messages: messages ?? [],
    internalNotes: internalNotes ?? [],
    requiredDocs: requiredDocs ?? [],
    appointment: pickCurrentAppointment(appointments ?? []),
  };
}

export type ReportRange = "today" | "7d" | "30d" | "90d" | "all";

export const REPORT_RANGE_LABELS: Record<ReportRange, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

/** Inclusive lower bound (ISO datetime) for a report range, or null for "all time". */
export function reportRangeStart(range: ReportRange): string | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "today") {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  const days = { "7d": 7, "30d": 30, "90d": 90 }[range];
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

type ReportApplicationRow = {
  id: string;
  application_number: string | null;
  status: Database["public"]["Enums"]["application_status"];
  service_id: string;
  services: { name: string | null; slug: string | null } | null;
  customers: { full_name: string | null; email: string | null } | null;
  created_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  total_price_snapshot: number | null;
  customer_price_snapshot: number;
  answers: unknown;
};

/**
 * Everything the admin Reports page shows, computed from real rows only --
 * no invented revenue, conversion rate, or turnaround-time figure. Two
 * different time bases are used deliberately:
 *  - The KPIs/breakdowns/volume chart are scoped to applications *created*
 *    within the selected range (and appointments *scheduled* within it) --
 *    this is what "Last 30 days" means on any reporting dashboard.
 *  - The "Pending operational metrics" table is a live snapshot of the
 *    admin's current queue (documents awaiting review, awaiting a customer
 *    re-upload, Aadhaar applications with an unregistered mobile) -- these
 *    describe work sitting right now, not history, so they intentionally
 *    ignore the date range the same way the main dashboard's KPIs do.
 * "Total value" sums the real per-application price snapshot -- it is
 * explicitly NOT labelled "Revenue", since no payment/transaction table
 * exists to confirm any of it was actually collected.
 */
export async function getAdminReportsData(range: ReportRange) {
  const supabase = await createClient();
  const start = reportRangeStart(range);

  let appQuery = supabase
    .from("applications")
    .select(
      "id, application_number, status, service_id, services(name, slug), customers(full_name, email), created_at, submitted_at, completed_at, total_price_snapshot, customer_price_snapshot, answers",
    );
  if (start) appQuery = appQuery.gte("created_at", start);

  let apptQuery = supabase.from("appointments").select("status, appointment_date");
  if (start) apptQuery = apptQuery.gte("appointment_date", start.slice(0, 10));

  const [
    { data: applications, error: appError },
    { data: appointments, error: apptError },
    { count: pendingDocumentReviews },
    { count: reuploadRequiredDocuments },
    { data: aadhaarService },
  ] = await Promise.all([
    appQuery,
    apptQuery,
    supabase
      .from("application_documents")
      .select("*", { count: "exact", head: true })
      .in("status", ["uploaded", "under_review"]),
    supabase
      .from("application_documents")
      .select("*", { count: "exact", head: true })
      .eq("status", "reupload_required"),
    supabase.from("services").select("id").eq("slug", "aadhaar-card-update").maybeSingle(),
  ]);
  if (appError) throw appError;
  if (apptError) throw apptError;

  const rows = (applications ?? []) as ReportApplicationRow[];

  // Live snapshot: Aadhaar applications (any status) whose customer answered
  // "no" to "is a mobile number already registered with your Aadhaar" --
  // these need special handling before the visit, regardless of when the
  // application was created.
  let unregisteredAadhaarMobiles = 0;
  if (aadhaarService?.id) {
    const { count } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("service_id", aadhaarService.id)
      .eq("answers->>mobile_registered", "no");
    unregisteredAadhaarMobiles = count ?? 0;
  }

  const totalApplications = rows.length;
  const totalValue = rows.reduce((sum, a) => sum + (a.total_price_snapshot ?? a.customer_price_snapshot ?? 0), 0);
  const completed = rows.filter((a) => a.status === "completed");
  const completionRate = totalApplications > 0 ? Math.round((completed.length / totalApplications) * 100) : null;

  // Average completion time only over completed applications that actually
  // have both a submitted_at and a completed_at timestamp -- never
  // estimated or backfilled for the rest.
  const completionDurationsDays = completed
    .filter((a) => a.submitted_at && a.completed_at)
    .map((a) => (new Date(a.completed_at!).getTime() - new Date(a.submitted_at!).getTime()) / 86_400_000);
  const avgCompletionDays =
    completionDurationsDays.length > 0
      ? completionDurationsDays.reduce((sum, d) => sum + d, 0) / completionDurationsDays.length
      : null;

  const byService = new Map<string, { name: string; count: number }>();
  for (const a of rows) {
    const key = a.service_id;
    const name = a.services?.name ?? "Unknown service";
    const entry = byService.get(key) ?? { name, count: 0 };
    entry.count += 1;
    byService.set(key, entry);
  }
  const applicationsByService = [...byService.values()].sort((a, b) => b.count - a.count);

  const byStatus = new Map<string, number>();
  for (const a of rows) byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1);

  // Daily volume -- one bucket per calendar day across the selected range
  // (capped so "All time" on a years-old dataset doesn't render thousands
  // of bars; the real per-application rows are still all counted above,
  // this only limits how many days the chart draws).
  const dayBuckets = new Map<string, number>();
  for (const a of rows) {
    const day = a.created_at.slice(0, 10);
    dayBuckets.set(day, (dayBuckets.get(day) ?? 0) + 1);
  }
  const sortedDays = [...dayBuckets.keys()].sort();
  const MAX_BARS = 60;
  const recentDays = sortedDays.slice(-MAX_BARS);
  const dailyVolume = recentDays.map((day) => ({ day, count: dayBuckets.get(day)! }));

  const appointmentsByStatus = new Map<string, number>();
  for (const appt of appointments ?? []) {
    appointmentsByStatus.set(appt.status, (appointmentsByStatus.get(appt.status) ?? 0) + 1);
  }

  return {
    range,
    totalApplications,
    totalValue,
    completionRate,
    avgCompletionDays,
    applicationsByService,
    statusDistribution: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
    dailyVolume,
    dailyVolumeTruncated: sortedDays.length > MAX_BARS,
    totalAppointments: (appointments ?? []).length,
    appointmentsByStatus: [...appointmentsByStatus.entries()].map(([status, count]) => ({ status, count })),
    // The exact rows the metrics above were computed from -- reused as-is
    // by the CSV export route so the download always matches what's on
    // screen for the same range, never a second divergent query.
    rawApplications: rows,
    pending: {
      documentsPendingReview: pendingDocumentReviews ?? 0,
      actionRequiredByCustomer: reuploadRequiredDocuments ?? 0,
      unregisteredAadhaarMobiles,
    },
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
