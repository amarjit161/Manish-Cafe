import Link from "next/link";
import { getMyApplicationsWithProgress } from "@/lib/customer/queries";
import { ApplicationSummaryCard } from "@/components/customer/application-summary-card";
import { EmptyState } from "@/components/customer/empty-state";
import { applicationPriorityRank } from "@/lib/applications/progress";

export default async function CustomerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const applications = await getMyApplicationsWithProgress();
  const sorted = [...applications].sort(
    (a, b) => applicationPriorityRank(a.progress, a.appointment) - applicationPriorityRank(b.progress, b.appointment),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-headline-md text-foreground">My applications</h1>
      {deleted === "1" ? (
        <p className="rounded-xl bg-success-container text-on-success-container text-body-md px-4 py-3">
          Application deleted successfully.
        </p>
      ) : null}
      {sorted.length === 0 ? (
        <EmptyState message="No applications yet. Choose a service to get started." action={{ label: "Browse services", href: "/customer/services" }} />
      ) : (
        <div className="space-y-3">
          {sorted.map(({ application, progress, appointment }) => (
            <ApplicationSummaryCard key={application.id} application={application} progress={progress} appointment={appointment} />
          ))}
        </div>
      )}
      {sorted.length > 0 ? (
        <Link href="/customer/services" className="inline-block text-label-sm text-primary font-medium">
          + Start a new application
        </Link>
      ) : null}
    </div>
  );
}
