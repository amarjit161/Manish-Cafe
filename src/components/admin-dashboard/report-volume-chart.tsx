/** "2026-08-30" -> "30 Aug" */
function formatDayLabel(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Plain-CSS daily volume bars (no chart library -- none is installed and
 * this phase avoids adding one). Each bar carries a real aria-label with
 * its date and count, and the container is announced as a single chart
 * with a text summary, so the data is available to assistive tech, not
 * just implied by bar height. Real applications only -- an empty range
 * renders the empty state instead of a chart with nothing on it.
 */
export function ReportVolumeChart({
  dailyVolume,
  truncated,
}: {
  dailyVolume: { day: string; count: number }[];
  truncated: boolean;
}) {
  if (dailyVolume.length === 0) {
    return <p className="text-body-md text-on-surface-variant">No applications were created in this period.</p>;
  }

  const max = Math.max(...dailyVolume.map((d) => d.count), 1);
  const total = dailyVolume.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      <div
        role="img"
        aria-label={`Daily application volume: ${total} applications across ${dailyVolume.length} day${dailyVolume.length === 1 ? "" : "s"} shown, from ${formatDayLabel(dailyVolume[0].day)} to ${formatDayLabel(dailyVolume[dailyVolume.length - 1].day)}.`}
        className="flex items-end gap-1 h-40 overflow-x-auto pb-1"
      >
        {dailyVolume.map((d) => (
          <div
            key={d.day}
            className="flex-1 min-w-[6px] shrink-0 flex flex-col items-center justify-end h-full"
            title={`${formatDayLabel(d.day)}: ${d.count} application${d.count === 1 ? "" : "s"}`}
          >
            <div
              className={`w-full rounded-t ${d.count > 0 ? "bg-primary" : "bg-surface-container-high"}`}
              style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 1)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-label-sm text-on-surface-variant mt-1.5">
        <span>{formatDayLabel(dailyVolume[0].day)}</span>
        <span>{formatDayLabel(dailyVolume[dailyVolume.length - 1].day)}</span>
      </div>
      {truncated ? (
        <p className="text-label-sm text-on-surface-variant mt-2">
          Showing the most recent {dailyVolume.length} days with activity; earlier days in this range aren&rsquo;t charted.
        </p>
      ) : null}
    </div>
  );
}
