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

  const [{ count: applicationsCount }, { count: customersCount }] = await Promise.all([
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }),
  ]);

  return {
    applicationsCount: applicationsCount ?? 0,
    customersCount: customersCount ?? 0,
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
    .select("id, application_number, status, customer_price_snapshot, created_at, customers(full_name), services(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
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

  const [{ data: documents }, { data: history }] = await Promise.all([
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
  ]);

  return {
    application,
    documents: documents ?? [],
    history: history ?? [],
  };
}
