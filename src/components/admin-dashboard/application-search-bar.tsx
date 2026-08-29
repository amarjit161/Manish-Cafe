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

  function onSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ q: value.trim() }), 400);
  }

  const hasAnyFilter = !!(searchParams.get("q") || searchParams.get("status") || searchParams.get("service") || searchParams.get("created"));

  function clearAll() {
    setSearchInput("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    router.replace(pathname);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search application number, name, email or phone..."
          className="min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-10 pr-3 text-body-md text-foreground"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(e) => pushParams({ status: e.target.value })}
          className="min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-label-md text-foreground"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          defaultValue={searchParams.get("service") ?? ""}
          onChange={(e) => pushParams({ service: e.target.value })}
          className="min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-label-md text-foreground"
        >
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          defaultValue={searchParams.get("created") ?? ""}
          onChange={(e) => pushParams({ created: e.target.value })}
          className="min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-label-md text-foreground"
        >
          {DATE_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        {hasAnyFilter ? (
          <button
            type="button"
            onClick={clearAll}
            className="min-h-11 rounded-lg border border-outline-variant px-3 text-label-md font-medium text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
