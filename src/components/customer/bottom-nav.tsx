import { CustomerNavLinks } from "@/components/customer/customer-nav-links";

/**
 * Mobile-only (the desktop equivalent is CustomerHeader's nav) -- never
 * rendered alongside it at the same breakpoint. `pb-[env(safe-area-inset-bottom)]`
 * keeps it clear of the home-indicator area on notched phones without
 * eating into the icons/labels themselves.
 */
export function CustomerBottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 left-0 w-full z-50 flex items-stretch bg-surface-container-lowest border-t border-outline-variant shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]"
    >
      <CustomerNavLinks variant="mobile" />
    </nav>
  );
}
