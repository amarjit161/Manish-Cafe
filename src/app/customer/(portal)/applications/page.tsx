import Link from "next/link";
import { getMyApplicationsWithProgress } from "@/lib/customer/queries";
import { ApplicationSummaryCard } from "@/components/customer/application-summary-card";
import { EmptyState } from "@/components/customer/empty-state";

export default async function CustomerApplicationsPage() {
  const applications = await getMyApplicationsWithProgress();

  return (
    <div className="space-y-4">
      <h1 className="text-headline-md text-foreground">My applications</h1>
      {applications.length === 0 ? (
        <EmptyState message="No applications yet. Choose a service to get started." action={{ label: "Browse services", href: "/customer/services" }} />
      ) : (
        <div className="space-y-3">
          {applications.map(({ application, progress }) => (
            <ApplicationSummaryCard key={application.id} application={application} progress={progress} />
          ))}
        </div>
      )}
      {applications.length > 0 ? (
        <Link href="/customer/services" className="inline-block text-label-sm text-primary font-medium">
          + Start a new application
        </Link>
      ) : null}
    </div>
  );
}
