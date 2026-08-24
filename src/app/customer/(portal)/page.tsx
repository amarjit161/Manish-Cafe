import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getMyApplicationsWithProgress, getActiveServices } from "@/lib/customer/queries";
import { ApplicationSummaryCard } from "@/components/customer/application-summary-card";
import { EmptyState } from "@/components/customer/empty-state";

export default async function CustomerDashboardPage() {
  const [profile, applications, services] = await Promise.all([
    getCurrentUserProfile(),
    getMyApplicationsWithProgress(),
    getActiveServices(),
  ]);

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md text-foreground">Welcome back{firstName ? `, ${firstName}` : ""} 👋</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Manage your applications and services.</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">What would you like to do?</h2>
        {services.length === 0 ? (
          <EmptyState message="No services are available right now." />
        ) : (
          <div className="space-y-2">
            {services.slice(0, 3).map((service) => (
              <Link
                key={service.id}
                href={`/customer/services/${service.id}`}
                className="flex min-h-11 items-start justify-between gap-3 rounded-xl bg-surface-container-lowest border border-outline-variant p-4"
              >
                <div className="min-w-0">
                  <p className="text-body-md text-foreground font-medium">{service.name}</p>
                  {service.description ? (
                    <p className="text-label-sm text-on-surface-variant">{service.description}</p>
                  ) : null}
                </div>
                <span className="text-label-sm text-on-surface-variant whitespace-nowrap shrink-0">₹{service.customer_price}</span>
              </Link>
            ))}
          </div>
        )}
        {services.length > 0 ? (
          <Link href="/customer/services" className="inline-block text-label-sm text-primary font-medium">
            Browse all services →
          </Link>
        ) : null}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-label-lg text-foreground">Your applications</h2>
          {applications.length > 0 ? (
            <Link href="/customer/applications" className="text-label-sm text-primary font-medium">
              View all
            </Link>
          ) : null}
        </div>
        {applications.length === 0 ? (
          <EmptyState message="No applications yet. Choose a service above to get started." />
        ) : (
          <div className="space-y-2">
            {applications.slice(0, 3).map(({ application, progress }) => (
              <ApplicationSummaryCard key={application.id} application={application} progress={progress} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
