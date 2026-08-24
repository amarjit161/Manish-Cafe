import Link from "next/link";
import { getMyApplications } from "@/lib/customer/queries";
import { EmptyState } from "@/components/customer/empty-state";
import { StatusBadge } from "@/components/customer/status-badge";

export default async function CustomerApplicationsPage() {
  const applications = await getMyApplications();

  return (
    <div className="space-y-4">
      <h1 className="text-headline-md text-foreground">My Applications</h1>
      {applications.length === 0 ? (
        <EmptyState message="You haven't created any applications yet. Browse services to get started." />
      ) : (
        <ul className="space-y-3">
          {applications.map((app) => (
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
    </div>
  );
}
