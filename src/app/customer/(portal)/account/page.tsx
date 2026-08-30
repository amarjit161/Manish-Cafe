import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getMyCustomer } from "@/lib/customer/queries";

/** "1990-05-15" -> "15 May 1990" -- a pure date, never formatDate()'s time-of-day suffix (meaningless for a birth date). */
function formatDateOnly(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-body-md py-2.5 border-b border-outline-variant last:border-b-0">
      <dt className="text-on-surface-variant shrink-0">{label}</dt>
      <dd className="text-foreground text-right min-w-0 break-words">{value}</dd>
    </div>
  );
}

/**
 * Read-only snapshot of the authenticated customer's own real data --
 * pulled from the exact same getCurrentUserProfile()/getMyCustomer()
 * queries every other customer page already uses (RLS already scopes
 * both to the caller's own row; nothing here re-derives ownership).
 * Editing happens on /customer/account/edit, not here.
 */
export default async function CustomerAccountPage() {
  const [profile, customer] = await Promise.all([getCurrentUserProfile(), getMyCustomer()]);

  const name = profile?.full_name ?? customer?.full_name ?? "Your account";
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const email = profile?.email ?? customer?.email ?? null;
  const phone = profile?.phone ?? customer?.phone ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-headline-md md:text-headline-lg text-foreground font-bold">Account</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Your personal information with Manish Cafe.</p>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary text-headline-md font-semibold"
              aria-hidden="true"
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-body-lg font-semibold text-foreground break-words">{name}</p>
              {email ? <p className="text-label-sm text-on-surface-variant break-words">{email}</p> : null}
              {phone ? <p className="text-label-sm text-on-surface-variant break-words">{phone}</p> : null}
            </div>
          </div>
          <Link
            href="/customer/account/edit"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-on-primary px-4 text-label-lg font-medium hover:brightness-110 transition-all sm:ml-auto sm:shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              edit
            </span>
            Edit profile
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 sm:p-6">
        <p className="text-label-lg font-semibold text-foreground mb-1">Personal information</p>
        <dl>
          <LabelValue label="Full name" value={name} />
          <LabelValue label="Email" value={email ?? "—"} />
          <LabelValue label="Phone" value={phone ?? "—"} />
          <LabelValue label="Address" value={customer?.address ?? "—"} />
          <LabelValue label="Date of birth" value={customer?.date_of_birth ? formatDateOnly(customer.date_of_birth) : "—"} />
        </dl>
      </div>

      <Link href="/customer/settings" className="inline-flex items-center gap-1 text-label-sm font-medium text-primary">
        Manage settings
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          arrow_forward
        </span>
      </Link>
    </div>
  );
}
