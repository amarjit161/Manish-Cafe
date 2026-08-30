import Link from "next/link";
import { SITE_NAME } from "@/lib/site-data";
import { requirePortalSession } from "@/lib/auth/session";
import { signOutAndRedirect } from "@/lib/auth/actions";
import { AdminShellNavLinks } from "@/components/admin-dashboard/admin-shell-nav";
import { MobileAdminDrawer } from "@/components/admin-dashboard/mobile-admin-drawer";

export default async function AdminSaasPortalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requirePortalSession("admin", "/admin/dashboard/login");
  const onSignOut = signOutAndRedirect.bind(null, "/admin/dashboard/login");
  const roleLabel = profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "Admin";

  return (
    <div className="min-h-screen bg-admin-bg text-foreground">
      {/* Desktop sidebar -- light surface, per Phase 2 (the old dark/navy
          block used --color-tertiary-container, which Phase 1's retune
          turned into a saffron accent color, not a neutral dark tone). */}
      <aside className="fixed inset-y-0 left-0 z-60 hidden md:flex flex-col bg-surface-container-lowest border-r border-outline-variant h-full w-72">
        <Link href="/admin/dashboard" className="flex items-center gap-2 p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              storefront
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-body-lg font-bold text-primary truncate">{SITE_NAME}</span>
            <span className="block text-label-sm text-on-surface-variant">Admin Portal</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="flex-1 px-3 space-y-1 overflow-y-auto">
          <AdminShellNavLinks />
        </nav>

        <div className="p-3 border-t border-outline-variant space-y-2">
          <div className="px-3 py-2">
            <p className="text-body-md text-foreground font-medium truncate">{profile.full_name ?? "Admin"}</p>
            <p className="text-label-sm text-on-surface-variant">{roleLabel}</p>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-body-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              sports_esports
            </span>
            Gaming/Seva Admin
          </Link>
          <form action={onSignOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-body-md text-error hover:bg-error-container/30 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                logout
              </span>
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile: sidebar collapses into a hamburger + slide-in drawer,
          sharing the exact same nav list as the desktop sidebar. */}
      <MobileAdminDrawer name={profile.full_name} roleLabel={roleLabel} signOutAction={onSignOut} />

      <main className="md:ml-72 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
