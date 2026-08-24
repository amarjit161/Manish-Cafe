import Link from "next/link";
import { getAllApplicationsForAdmin } from "@/lib/admin/queries";
import { StatusBadge } from "@/components/customer/status-badge";
import { EmptyState } from "@/components/customer/empty-state";
import { formatDate } from "@/lib/format";

export default async function AdminApplicationsPage() {
  const applications = await getAllApplicationsForAdmin();

  return (
    <div className="space-y-4">
      <h1 className="text-headline-lg text-foreground">Applications</h1>

      {applications.length === 0 ? (
        <EmptyState message="No applications have been created yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="w-full text-left text-body-md">
            <thead className="bg-surface-container-low text-label-sm text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Application #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-t border-outline-variant">
                  <td className="px-4 py-3 whitespace-nowrap">{app.application_number ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{app.customers?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{app.services?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">₹{app.customer_price_snapshot}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(app.created_at)}</td>
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
