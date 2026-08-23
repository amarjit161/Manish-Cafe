import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared callback for every Supabase email link (signup confirmation,
 * password recovery) across all three portals. The origin is always taken
 * from the incoming request itself -- never hardcoded -- so this works
 * identically on localhost, any Vercel Preview URL, and production.
 */
function loginFallbackFor(next: string): string {
  if (next.startsWith("/retailer")) return "/retailer/login";
  if (next.startsWith("/admin/dashboard")) return "/admin/dashboard/login";
  return "/customer/login";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/customer";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing, invalid, or expired code -- fail gracefully to the relevant
  // login page instead of throwing. Never a 500.
  return NextResponse.redirect(`${origin}${loginFallbackFor(next)}?error=confirmation_failed`);
}
