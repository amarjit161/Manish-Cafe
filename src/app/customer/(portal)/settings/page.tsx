import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getMyCustomer } from "@/lib/customer/queries";
import { signOutAndRedirect } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { ChangePasswordForm } from "@/components/customer/change-password-form";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant overflow-hidden">
      <p className="px-4 sm:px-5 pt-4 text-label-lg font-semibold text-primary uppercase tracking-wide text-[13px]">
        {title}
      </p>
      <div className="divide-y divide-outline-variant">{children}</div>
    </div>
  );
}

function NavRow({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-surface-container-low transition-colors">
      <span className="material-symbols-outlined text-on-surface-variant text-[20px]" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 text-body-md text-foreground">{label}</span>
      <span className="material-symbols-outlined text-on-surface-variant text-[18px]" aria-hidden="true">
        chevron_right
      </span>
    </Link>
  );
}

/**
 * Push/email toggles and language have no persistence anywhere in this
 * app (no notification_preferences table, no language column, nothing
 * consuming a stored value) -- rendered visibly disabled with an
 * "Unavailable" label rather than a working-looking toggle, so nothing
 * here can make a customer believe a preference was actually saved.
 */
function UnavailableRow({ icon, label, valueLabel }: { icon: string; label: string; valueLabel: string }) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-5 py-4">
      <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px]" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 text-body-md text-on-surface-variant">{label}</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-label-sm text-on-surface-variant">{valueLabel}</span>
        <span
          role="switch"
          aria-checked="false"
          aria-disabled="true"
          aria-label={`${label} -- not available yet`}
          className="relative inline-flex h-6 w-11 items-center rounded-full bg-surface-container-high cursor-not-allowed"
        >
          <span className="inline-block h-4 w-4 translate-x-1 rounded-full bg-surface-container-lowest" />
        </span>
      </span>
    </div>
  );
}

export default async function CustomerSettingsPage() {
  const [profile, customer] = await Promise.all([getCurrentUserProfile(), getMyCustomer()]);
  const name = profile?.full_name ?? customer?.full_name ?? "Your account";
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const phone = profile?.phone ?? customer?.phone ?? null;

  const onSignOut = signOutAndRedirect.bind(null, "/customer/login");

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-headline-md md:text-headline-lg text-foreground font-bold">Settings</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Manage your account and preferences.</p>
      </div>

      <Link
        href="/customer/account/edit"
        className="flex items-center gap-4 rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 sm:p-5 hover:border-primary/40 transition-colors"
      >
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary text-headline-md font-semibold"
          aria-hidden="true"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-lg font-semibold text-foreground truncate">{name}</p>
          {phone ? <p className="text-label-sm text-on-surface-variant truncate">{phone}</p> : null}
        </div>
        <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">
          edit
        </span>
      </Link>

      <SectionCard title="Account">
        <NavRow href="/customer/account" icon="person" label="Personal information" />
      </SectionCard>

      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 sm:p-5 space-y-3">
        <p className="flex items-center gap-2 text-label-lg font-semibold text-primary uppercase tracking-wide text-[13px]">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            lock
          </span>
          Security &amp; password
        </p>
        <ChangePasswordForm />
      </div>

      <SectionCard title="Preferences">
        <UnavailableRow icon="notifications" label="Push notifications" valueLabel="Unavailable" />
        <UnavailableRow icon="mail" label="Email updates" valueLabel="Unavailable" />
        <div className="flex items-center gap-3 px-4 sm:px-5 py-4">
          <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px]" aria-hidden="true">
            language
          </span>
          <span className="flex-1 text-body-md text-on-surface-variant">Language</span>
          <span className="text-label-sm text-on-surface-variant">English</span>
        </div>
      </SectionCard>

      <form action={onSignOut}>
        <SubmitButton className="w-full flex items-center justify-center gap-2 min-h-11 rounded-xl bg-error-container text-on-error-container text-label-lg font-medium hover:brightness-95 transition-all disabled:opacity-60">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            logout
          </span>
          Log out
        </SubmitButton>
      </form>
    </div>
  );
}
