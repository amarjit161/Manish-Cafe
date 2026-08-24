import { STAGE_DESCRIPTIONS, type ApplicationProgress } from "@/lib/applications/progress";
import { DocumentUploadForm } from "@/components/customer/document-upload-form";

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
 * real application/document state (getApplicationProgress), never from
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
 * currently-required document needs the customer's attention -- with a
 * direct "Replace document" control for each so the customer can act
 * immediately without scrolling to find the matching document card. This
 * is the first thing a customer should see, not something they discover by
 * reading a timeline. When nothing needs attention, this renders nothing
 * (the calm state is communicated by NoActionRequiredBanner instead).
 */
export function ActionRequiredBanner({
  applicationId,
  progress,
  canUpload,
}: {
  applicationId: string;
  progress: ApplicationProgress;
  canUpload: boolean;
}) {
  if (progress.actionRequired.length === 0) return null;

  return (
    <div className="rounded-2xl border border-error bg-error-container/30 p-4 space-y-3">
      <p className="text-label-lg font-semibold text-error">🔴 Action required</p>
      {progress.actionRequired.length > 1 ? (
        <p className="text-body-md text-foreground">{progress.actionRequired.length} documents need your attention.</p>
      ) : null}
      {progress.actionRequired.map((item) => (
        <div key={item.documentId} className="space-y-1.5 rounded-xl bg-surface-container-lowest/60 p-3">
          <p className="text-body-md font-medium text-foreground">
            Your {item.documentTypeName} needs to be uploaded again.
          </p>
          {item.reason ? (
            <p className="text-body-md text-foreground">
              <span className="font-medium">Reason from Manish Cafe:</span> &ldquo;{item.reason}&rdquo;
            </p>
          ) : null}
          {canUpload ? (
            <DocumentUploadForm
              applicationId={applicationId}
              documentTypeId={item.documentTypeId}
              label="Replace document"
              fullWidth
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * The positive counterpart to ActionRequiredBanner -- shown instead of it
 * whenever nothing needs the customer's attention, so the page never reads
 * as just "Documents required" with no further explanation. Never rendered
 * for draft (nothing submitted yet) or a terminal stage (those get their
 * own messaging from ApplicationProgressView). Reuses STAGE_DESCRIPTIONS
 * rather than keeping a second copy of the same sentences.
 */
export function NoActionRequiredBanner({ progress }: { progress: ApplicationProgress }) {
  if (progress.actionRequired.length > 0 || progress.terminal || progress.stage === "draft") return null;
  const detail = STAGE_DESCRIPTIONS[progress.stage];
  if (!detail) return null;

  return (
    <div className="rounded-2xl border border-tertiary/40 bg-tertiary-container/30 p-4">
      <p className="text-body-lg font-medium text-tertiary">✓ No action required</p>
      <p className="text-body-md text-foreground mt-1">{detail}</p>
    </div>
  );
}
