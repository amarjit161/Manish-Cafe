export type ProgressStepState = "done" | "current" | "upcoming";
export type ProgressStep = { label: string; state: ProgressStepState };

export type ActionRequiredItem = {
  documentTypeName: string;
  documentTypeId: string;
  documentId: string;
  status: "rejected" | "reupload_required";
  reason: string | null;
};

/**
 * The one canonical customer-facing stage. This is deliberately NOT the
 * same thing as the raw applications.status enum value -- e.g. the DB can
 * say "submitted" while a document has already been rejected, in which
 * case the customer-facing stage is "documents_required" (there is
 * something for them to do right now), not "submitted" (which reads as
 * "nothing to do, just wait"). Every surface that shows a status --
 * customer portal, admin portal, the timeline, badges, the action banner
 * -- must derive it from here rather than inventing its own mapping.
 */
export type ApplicationStage =
  | "draft"
  | "documents_required"
  | "submitted"
  | "under_review"
  | "processing"
  | "completed"
  | "rejected"
  | "cancelled";

export type ApplicationProgress = {
  stage: ApplicationStage;
  /** Set when the stage is a terminal, non-standard-progress state. */
  terminal: "rejected" | "cancelled" | "completed" | null;
  steps: ProgressStep[];
  actionRequired: ActionRequiredItem[];
};

const TERMINAL_STATUSES = new Set(["completed", "rejected", "cancelled"]);

/**
 * Short, plain-language chip text -- never a raw database enum value, but
 * deliberately compact (1-3 words) because this renders inside a
 * whitespace-nowrap pill next to the application/service name. A full
 * sentence here caused a real overflow at 360px (found via visual QA, not
 * theoretical) once combined with a long service name. The fuller
 * sentence for the same stage lives in STAGE_DESCRIPTIONS instead, used in
 * banners and body copy where wrapping is fine.
 */
export const STAGE_LABELS: Record<ApplicationStage, string> = {
  draft: "Draft",
  documents_required: "Action required",
  submitted: "Submitted",
  under_review: "Under review",
  processing: "Processing",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/** The longer, friendly sentence for the same stage -- for body copy, never a pill/badge. */
export const STAGE_DESCRIPTIONS: Partial<Record<ApplicationStage, string>> = {
  draft: "Continue your application whenever you're ready.",
  submitted: "Your application is currently being reviewed by Manish Cafe.",
  under_review: "Your application is currently being reviewed by Manish Cafe.",
  processing: "Your application is being processed by Manish Cafe.",
  completed: "Your application is complete.",
  rejected: "Your application was not approved.",
  cancelled: "This application was cancelled.",
};

export const STAGE_TONES: Record<ApplicationStage, "success" | "warning" | "info" | "neutral" | "error"> = {
  draft: "neutral",
  documents_required: "warning",
  submitted: "info",
  under_review: "info",
  processing: "info",
  completed: "success",
  rejected: "error",
  cancelled: "neutral",
};

/**
 * Derives the single canonical progress view purely from real database
 * state (application.status + each currently-required document's current
 * row) -- nothing here is specific to any one application or service.
 * This is the ONLY place that decides "does the customer need to do
 * something right now" -- every UI surface calls this instead of
 * re-deriving its own answer from raw enum values.
 *
 * The stepper has four stages -- Application / Documents / Review /
 * Completed -- where the fourth slot's label reads "Processing" while
 * that stage is actually in progress and "Completed" once it's done, so
 * there is never a fifth row on screen. "Documents" is kept distinct from
 * "Application" (even though they usually become done together) because,
 * unlike a one-shot submission, a document can cycle back into needing
 * the customer's attention after submission -- that's a real, separate
 * lifecycle worth its own row, not a redundant one.
 */
export function getApplicationProgress(params: {
  applicationStatus: string;
  currentRequiredDocuments: {
    id: string;
    documentTypeId: string;
    status: string;
    rejection_reason: string | null;
    reupload_message: string | null;
    documentTypeName: string;
  }[];
}): ApplicationProgress {
  const { applicationStatus, currentRequiredDocuments } = params;

  const actionRequired: ActionRequiredItem[] = currentRequiredDocuments
    .filter((d) => d.status === "rejected" || d.status === "reupload_required")
    .map((d) => ({
      documentTypeName: d.documentTypeName,
      documentTypeId: d.documentTypeId,
      documentId: d.id,
      status: d.status as "rejected" | "reupload_required",
      reason: d.status === "rejected" ? d.rejection_reason : d.reupload_message,
    }));

  if (TERMINAL_STATUSES.has(applicationStatus)) {
    const stage = applicationStatus as ApplicationStage;
    return { stage, terminal: applicationStatus as "completed" | "rejected" | "cancelled", steps: [], actionRequired };
  }

  const stage: ApplicationStage = actionRequired.length > 0 ? "documents_required" : (applicationStatus as ApplicationStage);
  const isProcessing = stage === "processing";
  const isDraft = stage === "draft";
  const needsAttention = stage === "documents_required";

  const steps: ProgressStep[] = [
    { label: "Application", state: isDraft ? "current" : "done" },
    {
      label: "Documents",
      state: isDraft ? "upcoming" : needsAttention ? "current" : "done",
    },
    {
      label: "Review",
      state: isDraft || needsAttention ? "upcoming" : isProcessing ? "done" : "current",
    },
    {
      label: isProcessing ? "Processing" : "Completed",
      state: isProcessing ? "current" : "upcoming",
    },
  ];

  return { stage, terminal: null, steps, actionRequired };
}
