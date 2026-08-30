import { requirePortalSession } from "@/lib/auth/session";
import { CustomerBottomNav } from "@/components/customer/bottom-nav";
import { CustomerHeader } from "@/components/customer/customer-header";

export default async function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requirePortalSession("customer", "/customer/login");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomerHeader name={profile.full_name} email={profile.email} />

      <main className="max-w-4xl mx-auto p-4 md:p-6 pb-24 md:pb-10">{children}</main>

      <CustomerBottomNav />
    </div>
  );
}
