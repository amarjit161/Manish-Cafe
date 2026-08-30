"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Only routes that actually exist -- Support is intentionally left out
// here (no such route yet). Shared by the desktop header and the mobile
// bottom nav so the two surfaces can never drift out of sync.
export const CUSTOMER_NAV = [
  { href: "/customer", label: "Home", icon: "home" },
  { href: "/customer/services", label: "Services", icon: "storefront" },
  { href: "/customer/applications", label: "Applications", icon: "assignment" },
  { href: "/customer/account", label: "Account", icon: "person" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/customer" ? pathname === href : pathname.startsWith(href);
}

export function CustomerNavLinks({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <>
        {CUSTOMER_NAV.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 ${
                active ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                aria-hidden="true"
              >
                {link.icon}
              </span>
              <span className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}>{link.label}</span>
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <>
      {CUSTOMER_NAV.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-2.5 lg:px-4 py-2 text-label-lg font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-primary-container/15 text-primary"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
