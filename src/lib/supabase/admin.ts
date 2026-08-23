import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * Server-only: reads SUPABASE_SERVICE_ROLE_KEY, which is never prefixed
 * NEXT_PUBLIC_ and must never be imported from a "use client" component or
 * any module reachable from the browser bundle. Currently only used by
 * scripts/create-staff-account.ts (a standalone CLI script, not part of the
 * Next.js app bundle) to provision retailer/admin accounts -- role
 * assignment must be server-controlled, never inferred from client input.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Set it in .env (never commit it, never prefix it NEXT_PUBLIC_).",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
