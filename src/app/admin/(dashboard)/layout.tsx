import Link from "next/link";
import { SITE_NAME } from "@/lib/site-data";
import { AdminSignOutButton } from "@/components/admin-sign-out-button";
import { AdminNavLinks } from "@/components/admin/admin-nav";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <aside className="fixed inset-y-0 left-0 z-[60] hidden md:flex flex-col bg-primary h-full w-72 shadow-2xl">
        <div className="text-2xl font-black text-white p-6 tracking-tight">{SITE_NAME}</div>
        <nav className="flex-1 px-4 space-y-2">
          <AdminNavLinks variant="sidebar" />
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 p-3 text-white/60 font-medium hover:bg-white/10 rounded-lg transition-colors text-sm"
          >
            <span className="material-symbols-outlined">storefront</span>
            View Website
          </Link>
          <AdminSignOutButton className="w-full flex items-center justify-center gap-2 p-3 text-red-300 font-medium hover:bg-red-500/10 rounded-lg transition-colors text-sm" />
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-40 bg-primary text-white px-4 py-3 flex items-center justify-between shadow-md">
        <span className="font-black">{SITE_NAME}</span>
        <AdminSignOutButton className="flex items-center gap-1 text-xs font-semibold text-red-300" />
      </header>

      <main className="md:ml-72 min-h-screen p-4 sm:p-8 pb-24 md:pb-8">{children}</main>

      <AdminNavLinks variant="mobile" />
    </div>
  );
}
