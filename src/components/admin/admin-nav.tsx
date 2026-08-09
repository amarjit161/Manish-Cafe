"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Live Queue", icon: "bolt" },
  { href: "/admin/calendar", label: "Calendar", icon: "calendar_month" },
  { href: "/admin/history", label: "History", icon: "history" },
] as const;

export function AdminNavLinks({ variant }: { variant: "sidebar" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 bg-primary border-t border-white/10 shadow-lg">
        {ADMIN_NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-colors ${
                active ? "bg-white/15 text-white" : "text-white/60"
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

  return (
    <>
      {ADMIN_NAV_LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-colors ${
              active ? "bg-white/15 text-white font-bold shadow-lg" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
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
