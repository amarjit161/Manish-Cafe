import Link from "next/link";
import { SITE_NAME } from "@/lib/site-data";
import { signOutAndRedirect } from "@/lib/auth/actions";
import { CustomerNavLinks } from "@/components/customer/customer-nav-links";
import { AccountMenu } from "@/components/customer/account-menu";

/**
 * Renders at every breakpoint (brand + notifications + account are needed
 * on mobile too), but the horizontal nav links only show at md+ -- on
 * mobile, navigation lives in CustomerBottomNav instead, so the two are
 * never showing the same links at once.
 */
export function CustomerHeader({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const onSignOut = signOutAndRedirect.bind(null, "/customer/login");

  return (
    <header className="sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant">
      <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-2 lg:gap-4">
        <Link href="/customer" className="flex items-center gap-2 font-bold text-primary min-w-0 shrink-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              storefront
            </span>
          </span>
          <span className="text-label-lg md:text-body-lg truncate">{SITE_NAME}</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
          <CustomerNavLinks variant="desktop" />
        </nav>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              notifications
            </span>
          </button>
          <AccountMenu name={name} email={email} onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  );
}
