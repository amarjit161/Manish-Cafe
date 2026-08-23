import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { PORTAL_HOME, type AppRole } from "@/lib/auth/roles";

const LEGACY_ADMIN_PUBLIC_PATHS = ["/admin/login"];

// The legacy gaming/seva/courses admin owns everything under /admin EXCEPT
// /admin/dashboard, which is the new SaaS "Business Console" added in PR #1
// and protected separately below. This keeps the two admin surfaces on
// distinct auth systems without either one accidentally shadowing the other.
function isLegacyAdminPath(pathname: string) {
  return (pathname === "/admin" || pathname.startsWith("/admin/")) && !pathname.startsWith("/admin/dashboard");
}

const SAAS_PORTALS: { prefix: string; role: AppRole; publicPaths: string[] }[] = [
  {
    prefix: "/customer",
    role: "customer",
    publicPaths: [
      "/customer/login",
      "/customer/signup",
      "/customer/forgot-password",
      "/customer/reset-password",
    ],
  },
  {
    prefix: "/retailer",
    role: "retailer",
    publicPaths: ["/retailer/login", "/retailer/forgot-password", "/retailer/reset-password"],
  },
  {
    prefix: "/admin/dashboard",
    role: "admin",
    publicPaths: ["/admin/dashboard/login"],
  },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Legacy gaming/seva/courses admin: unchanged behavior ---
  if (isLegacyAdminPath(pathname)) {
    if (LEGACY_ADMIN_PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  // --- New SaaS portals: Supabase Auth + role-scoped access ---
  const portal = SAAS_PORTALS.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`));
  if (!portal) {
    return NextResponse.next();
  }

  const { supabase, supabaseResponse, user } = await updateSupabaseSession(request);

  if (portal.publicPaths.includes(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    return NextResponse.redirect(new URL(`${portal.prefix}/login`, request.url));
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== portal.role) {
    const home = profile?.role ? PORTAL_HOME[profile.role as AppRole] : `${portal.prefix}/login`;
    return NextResponse.redirect(new URL(home, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/customer/:path*", "/retailer/:path*"],
};
