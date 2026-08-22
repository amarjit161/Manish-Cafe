export default function RetailerDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg text-foreground">Retailer Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {["Today's sales", "Today's profit", "Pending applications", "Wallet balance"].map((label) => (
          <div key={label} className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4">
            <p className="text-label-sm text-on-surface-variant">{label}</p>
            <p className="text-headline-md text-foreground mt-1">—</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-on-surface-variant text-body-md">
        Customer, application and payment management are coming in upcoming updates.
      </div>
    </div>
  );
}
