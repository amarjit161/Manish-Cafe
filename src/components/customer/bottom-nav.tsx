"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CUSTOMER_NAV = [
  { href: "/customer", label: "Dashboard", icon: "space_dashboard" },
  { href: "/customer/services", label: "Services", icon: "storefront" },
  { href: "/customer/applications", label: "Applications", icon: "assignment" },
] as const;

export function CustomerBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 bg-primary border-t border-white/10 shadow-lg">
      {CUSTOMER_NAV.map((link) => {
        const active = link.href === "/customer" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-colors ${
              active ? "bg-white/15 text-on-primary" : "text-on-primary/60"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">{link.icon}</span>
            <span className="text-[10px] font-medium">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
