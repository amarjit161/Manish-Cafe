import Link from "next/link";
import { SITE_NAME } from "@/lib/site-data";
import { requirePortalSession } from "@/lib/auth/session";
import { signOutAndRedirect } from "@/lib/auth/actions";

const CUSTOMER_NAV = [{ href: "/customer", label: "Dashboard", icon: "space_dashboard" }] as const;

export default async function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  await requirePortalSession("customer", "/customer/login");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-primary text-on-primary px-4 py-3 flex items-center justify-between shadow-md">
        <span className="font-black tracking-tight">{SITE_NAME}</span>
        <form action={signOutAndRedirect.bind(null, "/customer/login")}>
          <button type="submit" className="text-label-sm text-on-primary/70 hover:text-on-primary">
            Logout
          </button>
        </form>
      </header>

      <main className="p-4 pb-24 max-w-2xl mx-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 bg-primary border-t border-white/10 shadow-lg">
        {CUSTOMER_NAV.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center justify-center px-3 py-1 rounded-xl text-on-primary bg-white/15"
          >
            <span className="material-symbols-outlined text-[22px]">{link.icon}</span>
            <span className="text-[10px] font-medium">{link.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
