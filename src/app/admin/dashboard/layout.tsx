import Link from "next/link";
import { SITE_NAME } from "@/lib/site-data";

const BUSINESS_ADMIN_NAV = [{ href: "/admin/dashboard", label: "Dashboard", icon: "space_dashboard" }] as const;

export default function AdminSaasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-[60] hidden md:flex flex-col bg-tertiary-container h-full w-72 shadow-2xl">
        <div className="text-2xl font-black text-on-tertiary-container p-6 tracking-tight">{SITE_NAME}</div>
        <div className="px-6 pb-4 text-label-sm text-on-tertiary-container/70 uppercase tracking-wide">
          Business Console
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {BUSINESS_ADMIN_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-lg p-3 text-sm font-semibold bg-white/15 text-on-tertiary-container"
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 p-3 text-on-tertiary-container/70 font-medium hover:bg-white/10 rounded-lg transition-colors text-sm"
          >
            <span className="material-symbols-outlined">sports_esports</span>
            Gaming/Seva Admin
          </Link>
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-40 bg-tertiary-container text-on-tertiary-container px-4 py-3 flex items-center justify-between shadow-md">
        <span className="font-black">{SITE_NAME}</span>
        <span className="text-label-sm">Business Console</span>
      </header>

      <main className="md:ml-72 min-h-screen p-4 sm:p-8">{children}</main>
    </div>
  );
}
