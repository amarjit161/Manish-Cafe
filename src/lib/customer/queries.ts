import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/session";
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

export async function getServiceWithDocuments(serviceId: string) {
  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!service) return null;

  const { data: requiredDocs } = await supabase
    .from("service_document_types")
    .select("id, is_mandatory, display_order, document_type_id, document_types(id, code, name, description)")
    .eq("service_id", serviceId)
    .order("display_order");

  return { service, requiredDocs: requiredDocs ?? [] };
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
 * A single application by id, with its required documents, submitted
 * documents, and status timeline. Ownership is NOT checked here in
 * application code -- RLS on applications/application_documents/
 * application_status_history already denies any row that doesn't belong
 * to the caller, so an id for another customer's application resolves to
 * null (rendered as 404), not a leaked record.
 */
export async function getApplicationDetail(applicationId: string) {
  const supabase = await createClient();

  const { data: application, error } = await supabase
    .from("applications")
    .select("*, services(id, name, description, category)")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  if (!application) return null;

  const [{ data: requiredDocs }, { data: documents }, { data: history }] = await Promise.all([
    supabase
      .from("service_document_types")
      .select("id, is_mandatory, display_order, document_type_id, document_types(id, code, name, description)")
      .eq("service_id", application.service_id)
      .order("display_order"),
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
    requiredDocs: requiredDocs ?? [],
    documents: documents ?? [],
    history: history ?? [],
  };
}
