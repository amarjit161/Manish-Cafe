import type { ApplicationProgress } from "@/lib/applications/progress";

const TERMINAL_COPY: Record<NonNullable<ApplicationProgress["terminal"]>, { icon: string; label: string }> = {
  completed: { icon: "✓", label: "Application completed" },
  rejected: { icon: "✕", label: "Application rejected" },
  cancelled: { icon: "○", label: "Application cancelled" },
};

function StepMarker({ state }: { state: "done" | "current" | "upcoming" }) {
  if (state === "done") return <span className="text-tertiary">✓</span>;
  if (state === "current") return <span className="text-primary">●</span>;
  return <span className="text-on-surface-variant">○</span>;
}

/**
 * The PRIMARY status indicator for the customer -- derived purely from the
 * real application/document state (computeApplicationProgress), never from
 * hardcoded per-application text. The detailed timestamped timeline stays
 * available underneath as "Activity history", but a customer should never
 * have to read it just to know what to do next.
 */
export function ApplicationProgressView({ progress }: { progress: ApplicationProgress }) {
  if (progress.terminal) {
    const copy = TERMINAL_COPY[progress.terminal];
    return (
      <div className="rounded-2xl bg-surface-container-low p-4">
        <p className="text-body-lg font-medium text-foreground">
          {copy.icon} {copy.label}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface-container-low p-4 space-y-3">
      <p className="text-label-lg text-foreground">Application progress</p>
      <ol className="space-y-2">
        {progress.steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2 text-body-md">
            <StepMarker state={step.state} />
            <span className={step.state === "upcoming" ? "text-on-surface-variant" : "text-foreground"}>
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The high-visibility banner shown above everything else when at least one
 * currently-required document needs the customer's attention. This is the
 * first thing a customer should see -- not something they discover by
 * reading a timeline.
 */
export function ActionRequiredBanner({ progress }: { progress: ApplicationProgress }) {
  if (progress.actionRequired.length === 0) return null;

  return (
    <div className="rounded-2xl border border-error bg-error-container/30 p-4 space-y-2">
      <p className="text-label-lg font-semibold text-error">🟠 Action required</p>
      <p className="text-body-md text-foreground">
        Your application needs{" "}
        {progress.actionRequired.length === 1
          ? "one document to be replaced"
          : `${progress.actionRequired.length} documents to be replaced`}
        .
      </p>
      <ul className="list-disc pl-5 text-body-md text-foreground space-y-0.5">
        {progress.actionRequired.map((item) => (
          <li key={item.documentId}>{item.documentTypeName}</li>
        ))}
      </ul>
    </div>
  );
}
