import Link from "next/link";
import { getAdminReportsData, REPORT_RANGE_LABELS, type ReportRange } from "@/lib/admin/queries";
import { ReportStatCard } from "@/components/admin-dashboard/report-stat-card";
import { ReportBarList } from "@/components/admin-dashboard/report-bar-list";
import { ReportVolumeChart } from "@/components/admin-dashboard/report-volume-chart";
import { STATUS_LABELS } from "@/components/customer/status-badge";
import { APPOINTMENT_STATUS_CHIP, type AppointmentStatus } from "@/lib/applications/appointments";
import type { Database } from "@/lib/supabase/database.types";

const REPORT_RANGES: ReportRange[] = ["today", "7d", "30d", "90d", "all"];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range: ReportRange = REPORT_RANGES.includes(rawRange as ReportRange) ? (rawRange as ReportRange) : "30d";

  const data = await getAdminReportsData(range);

  const avgCompletionValue = data.avgCompletionDays !== null ? data.avgCompletionDays.toFixed(1) : null;

  const statusItems = data.statusDistribution
    .map((s) => ({
      label: STATUS_LABELS[s.status as Database["public"]["Enums"]["application_status"]] ?? s.status,
      value: s.count,
    }))
    .sort((a, b) => b.value - a.value);

  const appointmentStatusItems = data.appointmentsByStatus
    .map((a) => ({ label: APPOINTMENT_STATUS_CHIP[a.status as AppointmentStatus] ?? a.status, value: a.count }))
    .sort((a, b) => b.value - a.value);

  const pendingRows = [
    {
      name: "Documents pending review",
      count: data.pending.documentsPendingReview,
      status: "Needs attention",
      tone: "warning" as const,
    },
    {
      name: "Action required by customer",
      count: data.pending.actionRequiredByCustomer,
      status: "Waiting on customer",
      tone: "info" as const,
    },
    {
      name: "Aadhaar applications with unregistered mobile",
      count: data.pending.unregisteredAadhaarMobiles,
      status: "Flag at check-in",
      tone: "error" as const,
    },
  ];
  const toneClasses = {
    warning: "bg-warning-container text-on-warning-container",
    info: "bg-info-container text-on-info-container",
    error: "bg-error-container text-on-error-container",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline-lg text-foreground">Reports &amp; Analytics</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Real application, service, and appointment data for {REPORT_RANGE_LABELS[range].toLowerCase()}.
          </p>
        </div>
        <a
          href={`/api/admin/reports/export?range=${range}`}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-on-primary px-4 text-label-lg font-medium hover:brightness-110 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            download
          </span>
          Export CSV
        </a>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Reporting period">
        {REPORT_RANGES.map((r) => (
          <Link
            key={r}
            href={`?range=${r}`}
            aria-current={range === r ? "page" : undefined}
            className={`min-h-11 flex items-center rounded-full border px-4 text-label-md font-medium transition-colors ${
              range === r ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-foreground hover:bg-surface-container-low"
            }`}
          >
            {REPORT_RANGE_LABELS[r]}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <ReportStatCard label="Total Applications" value={data.totalApplications.toLocaleString("en-IN")} icon="description" />
        <ReportStatCard
          label="Total Application Value"
          value={`₹${data.totalValue.toLocaleString("en-IN")}`}
          icon="payments"
        />
        <ReportStatCard
          label="Completion Rate"
          value={data.completionRate !== null ? data.completionRate : null}
          suffix="%"
          icon="task_alt"
          emptyHint="No applications in this period."
        />
        <ReportStatCard
          label="Avg. Completion Time"
          value={avgCompletionValue}
          suffix="days"
          icon="schedule"
          emptyHint="No completed applications yet."
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4 sm:p-5">
          <h2 className="text-label-lg font-semibold text-foreground mb-4">Applications by Service</h2>
          <ReportBarList items={data.applicationsByService.map((s) => ({ label: s.name, value: s.count }))} />
        </section>

        <section className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4 sm:p-5">
          <h2 className="text-label-lg font-semibold text-foreground mb-4">Daily Application Volume</h2>
          <ReportVolumeChart dailyVolume={data.dailyVolume} truncated={data.dailyVolumeTruncated} />
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4 sm:p-5">
          <h2 className="text-label-lg font-semibold text-foreground mb-4">Application Status Distribution</h2>
          <ReportBarList items={statusItems} />
        </section>

        <section className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-label-lg font-semibold text-foreground">Appointments</h2>
            <span className="text-label-sm text-on-surface-variant">{data.totalAppointments} total</span>
          </div>
          <ReportBarList items={appointmentStatusItems} />
        </section>
      </div>

      <section className="rounded-xl bg-surface-container-lowest border border-outline-variant overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-outline-variant">
          <h2 className="text-label-lg font-semibold text-foreground">Pending Operational Metrics</h2>
          <p className="text-label-sm text-on-surface-variant mt-0.5">
            Current queue, as of now &mdash; not limited to the selected period.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-md">
            <thead className="text-label-sm text-on-surface-variant">
              <tr>
                <th className="px-4 sm:px-5 py-2.5 font-medium">Metric</th>
                <th className="px-4 sm:px-5 py-2.5 font-medium text-right">Count</th>
                <th className="px-4 sm:px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {pendingRows.map((row) => (
                <tr key={row.name}>
                  <td className="px-4 sm:px-5 py-3">{row.name}</td>
                  <td className="px-4 sm:px-5 py-3 text-right font-semibold text-foreground">{row.count}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-label-sm font-medium ${toneClasses[row.tone]}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
