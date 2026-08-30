"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATUS_LABELS } from "@/components/customer/status-badge";
import type { Database } from "@/lib/supabase/database.types";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [ApplicationStatus, string][];

const DATE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
];

/**
 * The text field is the only thing debounced -- every keystroke updates
 * local state instantly (no server round trip), and only after the
 * customer stops typing for 400ms does the URL (and therefore the
 * server-rendered result set) actually update. The status/service/date
 * dropdowns are discrete choices, not keystrokes, so they navigate
 * immediately on change.
 */
export function AdminApplicationSearchBar({ services }: { services: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Ctrl/Cmd+K jumps to the search box, same as the Stitch reference's
  // shortcut hint -- a plain focus, nothing that needs its own modal or
  // command palette.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ q: value.trim() }), 400);
  }

  const hasAnyFilter = !!(searchParams.get("q") || searchParams.get("status") || searchParams.get("service") || searchParams.get("created"));

  function clearAll() {
    setSearchInput("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Routed through the same pushParams() the status/service/date selects
    // already use (rather than a bare router.replace(pathname)) -- that
    // bare call was silently not updating the URL at all in testing, for
    // reasons that traced back to Next.js's client router rather than
    // anything specific to this component; pushParams's explicit
    // `${pathname}?${params}` construction is the one path already proven
    // to reliably drive a navigation here.
    pushParams({ q: "", status: "", service: "", created: "" });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <label htmlFor="application-search" className="sr-only">
          Search by application number, customer name, email or phone
        </label>
        <input
          id="application-search"
          ref={inputRef}
          type="text"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by application number, customer name, email or phone"
          className="min-h-12 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-16 text-body-md text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
        <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center rounded-md border border-outline-variant bg-surface-container-low px-1.5 py-0.5 text-label-sm text-on-surface-variant">
          Ctrl+K
        </kbd>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
          Status
          <select
            aria-label="Filter by status"
            defaultValue={searchParams.get("status") ?? ""}
            onChange={(e) => pushParams({ status: e.target.value })}
            className="min-h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-label-md font-medium text-foreground"
          >
            <option value="">Any status</option>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
          Service
          <select
            aria-label="Filter by service"
            defaultValue={searchParams.get("service") ?? ""}
            onChange={(e) => pushParams({ service: e.target.value })}
            className="min-h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-label-md font-medium text-foreground"
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
          Date
          <select
            aria-label="Filter by submission date"
            defaultValue={searchParams.get("created") ?? ""}
            onChange={(e) => pushParams({ created: e.target.value })}
            className="min-h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-label-md font-medium text-foreground"
          >
            {DATE_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        {hasAnyFilter ? (
          <button
            type="button"
            onClick={clearAll}
            className="min-h-10 rounded-lg border border-outline-variant px-3 text-label-md font-medium text-primary hover:bg-surface-container-low transition-colors ml-auto"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
