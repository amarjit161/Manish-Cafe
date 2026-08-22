export default function AdminSaasDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg text-foreground">Business Console</h1>
      <p className="text-body-md text-on-surface-variant">
        This is the new services/applications SaaS admin, separate from the existing gaming &amp; seva
        operations dashboard.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {["Applications", "Customers", "Pending payments", "Open tickets"].map((label) => (
          <div key={label} className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4">
            <p className="text-label-sm text-on-surface-variant">{label}</p>
            <p className="text-headline-md text-foreground mt-1">—</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-on-surface-variant text-body-md">
        Users, services, applications, documents, payments, wallets, invoices, reports and audit logs are
        coming in upcoming updates.
      </div>
    </div>
  );
}
