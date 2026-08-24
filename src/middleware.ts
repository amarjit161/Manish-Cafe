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

// API routes get the same role gate, but a JSON 401/403 instead of a page
// redirect. This is a second, independent layer -- every one of these
// routes also does its own full auth/ownership check internally and must
// never assume this middleware ran.
const SAAS_API_PORTALS: { prefix: string; role: AppRole }[] = [
  { prefix: "/api/customer", role: "customer" },
  { prefix: "/api/admin", role: "admin" },
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

  // --- New SaaS API routes: same role gate, JSON response on failure ---
  const apiPortal = SAAS_API_PORTALS.find((p) => pathname.startsWith(p.prefix));
  if (apiPortal) {
    try {
      const { supabase, supabaseResponse, user } = await updateSupabaseSession(request);

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!profile || profile.role !== apiPortal.role) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      return supabaseResponse;
    } catch (err) {
      // Fail safe rather than letting an exception (e.g. a misconfigured
      // Supabase client) crash the whole middleware invocation.
      console.error("Supabase session check failed in middleware (api portal)", err);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // --- New SaaS portals: Supabase Auth + role-scoped access ---
  const portal = SAAS_PORTALS.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`));
  if (!portal) {
    return NextResponse.next();
  }

  // Public auth pages never need a Supabase session lookup at all -- check
  // this BEFORE touching Supabase, not after. Previously this ran
  // unconditionally for every matched path, so a Supabase client
  // construction failure took down the public login/signup pages along
  // with everything else -- there was no way to even reach the login page
  // to recover.
  if (portal.publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  try {
    const { supabase, supabaseResponse, user } = await updateSupabaseSession(request);

    if (!user) {
      return NextResponse.redirect(new URL(`${portal.prefix}/login`, request.url));
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    if (!profile || profile.role !== portal.role) {
      const home = profile?.role ? PORTAL_HOME[profile.role as AppRole] : `${portal.prefix}/login`;
      return NextResponse.redirect(new URL(home, request.url));
    }

    return supabaseResponse;
  } catch (err) {
    // Fail safe: treat an unverifiable session as unauthenticated instead
    // of letting the exception crash the whole middleware invocation.
    console.error("Supabase session check failed in middleware", err);
    return NextResponse.redirect(new URL(`${portal.prefix}/login`, request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/customer/:path*", "/retailer/:path*", "/api/customer/:path*", "/api/admin/:path*"],
};
