"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, SITE_NAME } from "@/lib/site-data";

export function SiteNavbar() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 bg-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-black tracking-tight">
            {SITE_NAME}
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <a
            href="tel:+910000000000"
            className="hidden md:flex items-center gap-2 bg-secondary-container text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">call</span>
            Call Us
          </a>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 bg-white border-t border-outline-variant shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-colors ${
                active ? "bg-surface-container text-secondary" : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {link.icon}
              </span>
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
