import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PORTAL_HOME, type AppRole } from "@/lib/auth/roles";

export const getCurrentUserProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, phone, status")
    .eq("id", user.id)
    .single();

  return profile ?? null;
});

/**
 * Server-side, defense-in-depth check for use inside a portal's (portal)
 * layout. Middleware already enforces this at the edge; this re-verifies
 * inside the render path so protection never depends on the middleware
 * matcher alone.
 */
export async function requirePortalSession(expectedRole: AppRole, loginPath: string) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect(loginPath);
  }

  if (profile.role !== expectedRole || profile.status !== "active") {
    redirect(profile.role ? PORTAL_HOME[profile.role as AppRole] : loginPath);
  }

  return { profile };
}
