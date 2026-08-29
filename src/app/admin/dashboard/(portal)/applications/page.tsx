import Link from "next/link";
import { getAllApplicationsForAdmin, getAllServicesForAdminFilter } from "@/lib/admin/queries";
import { StatusBadge } from "@/components/customer/status-badge";
import { EmptyState } from "@/components/customer/empty-state";
import { formatDate } from "@/lib/format";
import { AdminApplicationSearchBar } from "@/components/admin-dashboard/application-search-bar";

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; service?: string; created?: string }>;
}) {
  const { q, status, service, created } = await searchParams;

  const [applications, services] = await Promise.all([
    getAllApplicationsForAdmin({
      search: q,
      status,
      serviceId: service,
      createdWithin: created === "today" || created === "week" || created === "month" ? created : undefined,
    }),
    getAllServicesForAdminFilter(),
  ]);

  const hasActiveFilter = !!(q || status || service || created);

  return (
    <div className="space-y-4">
      <h1 className="text-headline-lg text-foreground">Applications</h1>

      <AdminApplicationSearchBar services={services} />

      {hasActiveFilter && q ? (
        <p className="text-label-sm text-on-surface-variant">Showing results for &ldquo;{q}&rdquo;</p>
      ) : null}

      {applications.length === 0 ? (
        <EmptyState
          message={hasActiveFilter ? "No applications found." : "No applications have been created yet."}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="w-full text-left text-body-md">
            <thead className="bg-surface-container-low text-label-sm text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Application #</th>
                <th className="px-4 py-3 whitespace-nowrap">Customer</th>
                <th className="px-4 py-3 whitespace-nowrap">Service</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Documents</th>
                <th className="px-4 py-3 whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 whitespace-nowrap">Created</th>
                <th className="px-4 py-3 whitespace-nowrap">Updated</th>
                <th className="px-4 py-3 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-t border-outline-variant">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/admin/dashboard/applications/${app.id}`} className="font-semibold text-primary underline underline-offset-2">
                      {app.application_number ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>{app.customers?.full_name ?? "—"}</div>
                    {app.customers?.email || app.customers?.phone ? (
                      <div className="text-label-sm text-on-surface-variant">
                        {[app.customers?.email, app.customers?.phone].filter(Boolean).join(" · ")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{app.services?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {app.documentCounts.approved}/{app.documentCounts.total} documents
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">₹{app.customer_price_snapshot}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(app.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(app.updated_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/admin/dashboard/applications/${app.id}`} className="text-label-sm text-primary underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
