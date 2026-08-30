"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Deliberately just an identity readout + logout -- there is no
 * account/settings route yet (that's a future phase per the SaaS shell
 * spec), so this never links anywhere that doesn't exist.
 */
export function AccountMenu({
  name,
  email,
  onSignOut,
}: {
  name: string | null;
  email: string | null;
  onSignOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (name?.trim()?.[0] ?? email?.trim()?.[0] ?? "?").toUpperCase();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary text-label-md font-semibold hover:brightness-110"
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-outline-variant bg-surface-container-lowest p-1.5 shadow-lg"
        >
          <div className="px-3 py-2 border-b border-outline-variant mb-1">
            <p className="text-body-md text-foreground font-medium truncate">{name ?? "Your account"}</p>
            {email ? <p className="text-label-sm text-on-surface-variant truncate">{email}</p> : null}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="w-full text-left rounded-lg px-3 py-2 text-body-md text-error hover:bg-error-container/30"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
