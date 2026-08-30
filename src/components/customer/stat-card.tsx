type Tone = "primary" | "info" | "warning" | "error" | "success";

const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-primary-container/15 text-primary",
  info: "bg-info-container text-on-info-container",
  warning: "bg-warning-container text-on-warning-container",
  error: "bg-error-container text-on-error-container",
  success: "bg-success-container text-on-success-container",
};

export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
}: {
  label: string;
  value: number | string;
  icon?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-label-sm text-on-surface-variant uppercase tracking-wide truncate">{label}</p>
        <p className="text-headline-lg text-foreground font-bold mt-1">{value}</p>
      </div>
      {icon ? (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[tone]}`}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
      ) : null}
    </div>
  );
}
