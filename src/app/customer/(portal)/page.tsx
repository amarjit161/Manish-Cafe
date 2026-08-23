import { getCurrentUserProfile } from "@/lib/auth/session";

export default async function CustomerDashboardPage() {
  const profile = await getCurrentUserProfile();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-container-low p-6">
        <h1 className="text-headline-md text-foreground">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Your applications, documents and payments will appear here.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {["Active applications", "Pending documents", "Recent payments", "Notifications"].map((label) => (
          <div key={label} className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4">
            <p className="text-label-sm text-on-surface-variant">{label}</p>
            <p className="text-headline-md text-foreground mt-1">0</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-on-surface-variant text-body-md">
        Applications and documents are coming in upcoming updates.
      </div>
    </div>
  );
}
