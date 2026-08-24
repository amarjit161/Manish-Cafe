import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getMyApplications, getActiveServices } from "@/lib/customer/queries";
import { StatCard } from "@/components/customer/stat-card";
import { EmptyState } from "@/components/customer/empty-state";
import { StatusBadge } from "@/components/customer/status-badge";

const ACTIVE_STATUSES = new Set([
  "draft",
  "submitted",
  "under_review",
  "documents_required",
  "processing",
]);

export default async function CustomerDashboardPage() {
  const [profile, applications, services] = await Promise.all([
    getCurrentUserProfile(),
    getMyApplications(),
    getActiveServices(),
  ]);

  const activeCount = applications.filter((a) => ACTIVE_STATUSES.has(a.status)).length;
  const completedCount = applications.filter((a) => a.status === "completed").length;
  const recent = applications.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-surface-container-low p-6">
        <h1 className="text-headline-md text-foreground">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Track your applications, documents and payments here.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Active applications" value={activeCount} />
        <StatCard label="Completed" value={completedCount} />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-label-lg text-foreground">Recent activity</h2>
          <Link href="/customer/applications" className="text-label-sm text-primary underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState message="No applications yet. Browse services below to get started." />
        ) : (
          <ul className="space-y-2">
            {recent.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/customer/applications/${app.application_number ?? app.id}`}
                  className="block rounded-xl bg-surface-container-lowest border border-outline-variant p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body-md text-foreground font-medium">
                      {app.services?.name ?? "Service"}
                    </span>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-label-sm text-on-surface-variant mt-1">
                    {app.application_number ?? "Draft — not yet submitted"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-label-lg text-foreground">Available services</h2>
          <Link href="/customer/services" className="text-label-sm text-primary underline">
            Browse all
          </Link>
        </div>
        {services.length === 0 ? (
          <EmptyState message="No services are available right now." />
        ) : (
          <ul className="space-y-2">
            {services.slice(0, 3).map((service) => (
              <li key={service.id}>
                <Link
                  href={`/customer/services/${service.id}`}
                  className="block rounded-xl bg-surface-container-lowest border border-outline-variant p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-body-md text-foreground font-medium">{service.name}</span>
                    <span className="text-label-sm text-on-surface-variant">₹{service.customer_price}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
