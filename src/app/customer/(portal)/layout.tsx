import { SITE_NAME } from "@/lib/site-data";
import { requirePortalSession } from "@/lib/auth/session";
import { signOutAndRedirect } from "@/lib/auth/actions";
import { CustomerBottomNav } from "@/components/customer/bottom-nav";

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

      <CustomerBottomNav />
    </div>
  );
}
