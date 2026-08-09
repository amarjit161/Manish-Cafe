"use client";

import { useEffect, useRef, useState } from "react";
import { StatusSelect } from "@/components/admin/status-select";
import { CallLink } from "@/components/admin/call-link";

type Tab = "gaming" | "seva" | "courses";

const TABS: { id: Tab; label: string; icon: string; endpoint: string; statusOptions: string[] }[] = [
  {
    id: "gaming",
    label: "Gaming Bookings",
    icon: "sports_esports",
    endpoint: "/api/bookings",
    statusOptions: ["PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"],
  },
  {
    id: "seva",
    label: "Online Seva",
    icon: "description",
    endpoint: "/api/seva",
    statusOptions: ["PENDING", "IN_PROGRESS", "VERIFIED", "COMPLETED"],
  },
  {
    id: "courses",
    label: "Skill Courses",
    icon: "school",
    endpoint: "/api/courses",
    statusOptions: ["NEW", "FOLLOW_UP", "ENROLLED", "CLOSED"],
  },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = any;

export function HistoryView({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTab = TABS.find((t) => t.id === tab)!;
  const PAGE_SIZE = 20;

  async function fetchPage(reset: boolean) {
    setLoading(true);
    try {
      const skip = reset ? 0 : items.length;
      const qs = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(skip) });
      if (search.trim()) qs.set("search", search.trim());
      if (status) qs.set("status", status);
      const res = await fetch(`${activeTab.endpoint}?${qs.toString()}`);
      const data = await res.json();
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setHasMore(Boolean(data.hasMore));
    } finally {
      setLoading(false);
    }
  }

  const isFirstSearchRender = useRef(true);

  useEffect(() => {
    isFirstSearchRender.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the list for a new fetch triggered by tab/status change
    setItems([]);
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status]);

  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setItems([]);
      fetchPage(true);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function switchTab(next: Tab) {
    setTab(next);
    setStatus("");
    setSearch("");
    setItems([]);
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              tab === t.id
                ? "bg-primary text-white"
                : "bg-white text-on-surface-variant border border-outline-variant hover:border-primary/50"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone number…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white text-sm font-semibold"
        >
          <option value="">All statuses</option>
          {activeTab.statusOptions.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                {tab === "gaming" && (
                  <>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Station</th>
                    <th className="px-6 py-3">When</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </>
                )}
                {tab === "seva" && (
                  <>
                    <th className="px-6 py-3">Applicant</th>
                    <th className="px-6 py-3">Service</th>
                    <th className="px-6 py-3">Requested</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </>
                )}
                {tab === "courses" && (
                  <>
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Course</th>
                    <th className="px-6 py-3">Enquired</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-on-surface-variant text-sm">
                    No records found.
                  </td>
                </tr>
              )}
              {tab === "gaming" &&
                items.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary">{b.customerName}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{b.station?.name}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {formatDateTime(b.startAt)} · {b.durationHours}h
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">₹{b.totalAmount}</td>
                    <td className="px-6 py-4 text-sm">
                      <CallLink phone={b.customerPhone} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <StatusSelect
                        id={b.id}
                        endpoint="/api/bookings"
                        currentStatus={b.status}
                        options={activeTab.statusOptions}
                      />
                    </td>
                  </tr>
                ))}
              {tab === "seva" &&
                items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary">{r.applicantName}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{r.serviceType}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDateTime(r.createdAt)}</td>
                    <td className="px-6 py-4 text-sm">
                      <CallLink phone={r.phone} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <StatusSelect
                        id={r.id}
                        endpoint="/api/seva"
                        currentStatus={r.status}
                        options={activeTab.statusOptions}
                      />
                    </td>
                  </tr>
                ))}
              {tab === "courses" &&
                items.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary">{e.studentName}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{e.courseName}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDateTime(e.createdAt)}</td>
                    <td className="px-6 py-4 text-sm">
                      <CallLink phone={e.phone} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <StatusSelect
                        id={e.id}
                        endpoint="/api/courses"
                        currentStatus={e.status}
                        options={activeTab.statusOptions}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="p-4 border-t border-slate-100 flex justify-center">
            <button
              onClick={() => fetchPage(false)}
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-surface-container text-primary font-bold text-sm hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load More"}
            </button>
          </div>
        )}
        {loading && items.length === 0 && (
          <p className="p-6 text-center text-sm text-on-surface-variant">Loading…</p>
        )}
      </div>
    </div>
  );
}
