/**
 * The Reports page's own KPI card -- distinct from the shared
 * customer/stat-card.tsx because these values need a bit more formatting
 * flexibility (a "days" suffix, an em-dash when a metric genuinely has no
 * data for the period) that the generic dashboard StatCard doesn't need.
 * `value === null` renders as "—" rather than 0, since a metric with no
 * underlying data (e.g. no completed applications in range) is not the
 * same real-world fact as "0 days to complete".
 */
export function ReportStatCard({
  label,
  value,
  suffix,
  icon,
  emptyHint,
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
  icon: string;
  emptyHint?: string;
}) {
  const isEmpty = value === null;
  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container/15 text-primary" aria-hidden="true">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className={`text-headline-lg font-bold ${isEmpty ? "text-on-surface-variant" : "text-foreground"}`}>
          {isEmpty ? "—" : value}
        </span>
        {!isEmpty && suffix ? <span className="text-label-md text-on-surface-variant">{suffix}</span> : null}
      </p>
      {isEmpty && emptyHint ? <p className="text-label-sm text-on-surface-variant">{emptyHint}</p> : null}
    </div>
  );
}
