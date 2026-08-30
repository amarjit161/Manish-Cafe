/**
 * A plain-CSS horizontal bar list -- no chart library, since none is
 * installed and this phase explicitly avoids adding a new dependency for
 * something a few styled <div>s already do. Bar width is relative to the
 * largest value in THIS list (not a fixed scale), matching how
 * "Applications by Service" reads in the Stitch reference. The numeric
 * value is always printed next to the bar, so the real number is never
 * conveyed by bar length alone.
 */
export function ReportBarList({ items }: { items: { label: string; value: number }[] }) {
  if (items.length === 0) {
    return <p className="text-body-md text-on-surface-variant">No data for this period.</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-center justify-between text-body-md mb-1">
            <span className="text-foreground truncate pr-2">{item.label}</span>
            <span className="font-semibold text-foreground shrink-0">{item.value.toLocaleString("en-IN")}</span>
          </div>
          <div
            className="h-2 rounded-full bg-surface-container-high overflow-hidden"
            role="img"
            aria-label={`${item.label}: ${item.value}`}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((item.value / max) * 100, 3)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
