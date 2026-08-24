import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getAdminDashboardStats } from "@/lib/admin/queries";
import { StatCard } from "@/components/customer/stat-card";

export default async function AdminSaasDashboardPage() {
  const [profile, stats] = await Promise.all([getCurrentUserProfile(), getAdminDashboardStats()]);

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg text-foreground">
        Business Console{profile?.full_name ? ` — ${profile.full_name}` : ""}
      </h1>
      <p className="text-body-md text-on-surface-variant">
        This is the new services/applications SaaS admin, separate from the existing gaming &amp; seva
        operations dashboard.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Applications" value={stats.applicationsCount} />
        <StatCard label="Customers" value={stats.customersCount} />
        <StatCard label="Pending payments" value={stats.pendingPayments ?? "Not implemented"} />
        <StatCard label="Open tickets" value={stats.openTickets ?? "Not implemented"} />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest border border-outline-variant p-4">
        <div>
          <p className="text-body-md text-foreground font-medium">Applications</p>
          <p className="text-label-sm text-on-surface-variant">Browse and inspect customer applications.</p>
        </div>
        <Link href="/admin/dashboard/applications" className="text-label-sm text-primary underline whitespace-nowrap">
          View all
        </Link>
      </div>

      <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-on-surface-variant text-body-md">
        Users, services, documents, payments, wallets, invoices, reports and audit logs are coming in
        upcoming updates.
      </div>
    </div>
  );
}
