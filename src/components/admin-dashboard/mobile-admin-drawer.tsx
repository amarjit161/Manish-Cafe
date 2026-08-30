"use client";

import { useState } from "react";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site-data";
import { AdminShellNavLinks } from "@/components/admin-dashboard/admin-shell-nav";

/**
 * The sidebar's mobile equivalent: a hamburger button that opens a
 * slide-in panel with the same nav (AdminShellNavLinks), rather than a
 * separate bottom bar -- an admin console reads more naturally as a
 * collapsible sidebar than a consumer-style tab bar, and this keeps one
 * single source of truth for the nav items instead of a second list.
 */
export function MobileAdminDrawer({
  name,
  roleLabel,
  signOutAction,
}: {
  name: string | null;
  roleLabel: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant px-4 h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            menu
          </span>
        </button>
        <span className="font-bold text-primary text-label-lg">{SITE_NAME}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-on-primary-container text-label-sm font-semibold">
          {(name?.trim()?.[0] ?? "A").toUpperCase()}
        </span>
      </header>

      {open ? (
        <div className="md:hidden fixed inset-0 z-70">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-on-surface/40"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface-container-lowest shadow-2xl flex flex-col">
            <div className="p-4 border-b border-outline-variant flex items-center justify-between">
              <span className="font-black text-primary">{SITE_NAME}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  close
                </span>
              </button>
            </div>

            <nav aria-label="Primary" className="flex-1 p-3 space-y-1 overflow-y-auto">
              <AdminShellNavLinks onNavigate={() => setOpen(false)} />
            </nav>

            <div className="p-3 border-t border-outline-variant space-y-2">
              <div className="px-3 py-2">
                <p className="text-body-md text-foreground font-medium truncate">{name ?? "Admin"}</p>
                <p className="text-label-sm text-on-surface-variant">{roleLabel}</p>
              </div>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-body-md text-on-surface-variant hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  sports_esports
                </span>
                Gaming/Seva Admin
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void signOutAction();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-body-md text-error hover:bg-error-container/30"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  logout
                </span>
                Log out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
