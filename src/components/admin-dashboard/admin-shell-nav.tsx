"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Only routes that actually exist in the new SaaS admin today. Customers,
// Services, Reports, Communication and Settings are deliberately left out
// -- those routes don't exist yet, and inventing nav items for pages that
// 404 would be worse than not listing them (see Phase 2 spec: no fake
// functionality). Add them here the moment their route ships.
export const ADMIN_SHELL_NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "space_dashboard" },
  { href: "/admin/dashboard/applications", label: "Applications", icon: "assignment" },
  { href: "/admin/dashboard/appointments", label: "Appointments", icon: "event" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function AdminShellNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {ADMIN_SHELL_NAV.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-md font-medium transition-colors ${
              active
                ? "bg-primary text-on-primary"
                : "text-foreground hover:bg-surface-container-low"
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              aria-hidden="true"
            >
              {link.icon}
            </span>
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
