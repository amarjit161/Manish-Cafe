"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyCustomer } from "@/lib/customer/queries";

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

/**
 * The only path that ever changes an application's status (enforced by
 * the prevent_direct_status_change DB trigger). change_application_status()
 * independently verifies the caller owns this application before doing
 * anything, and only allows a customer to move draft -> submitted.
 */
export async function submitApplication(
  applicationId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_application_status", {
    p_application_id: applicationId,
    p_new_status: "submitted",
  });

  if (error) {
    return { error: "Could not submit the application. Please try again." };
  }

  revalidatePath(`/customer/applications/${applicationId}`);
}
