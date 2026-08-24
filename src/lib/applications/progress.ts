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

const IN_REVIEW_STATUSES = new Set(["submitted", "under_review", "documents_required"]);
const TERMINAL_STATUSES = new Set(["completed", "rejected", "cancelled"]);

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  draft: "Draft",
  documents_required: "Action required",
  submitted: "Submitted",
  under_review: "Documents under review",
  processing: "Processing",
  completed: "Completed",
  rejected: "Application rejected",
  cancelled: "Application cancelled",
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

  const submitted = applicationStatus !== "draft";
  const isProcessing = stage === "processing";
  const isInReview = IN_REVIEW_STATUSES.has(applicationStatus) && actionRequired.length === 0;

  const steps: ProgressStep[] = [
    { label: "Application submitted", state: submitted ? "done" : "current" },
    { label: "Documents submitted", state: submitted ? "done" : "upcoming" },
  ];

  if (stage === "documents_required") {
    steps.push({ label: "Action required", state: "current" });
    steps.push({ label: "Documents approved", state: "upcoming" });
  } else if (isProcessing) {
    steps.push({ label: "Documents approved", state: "done" });
  } else if (isInReview) {
    steps.push({ label: "Documents under review", state: "current" });
    steps.push({ label: "Documents approved", state: "upcoming" });
  } else {
    steps.push({ label: "Documents under review", state: "upcoming" });
    steps.push({ label: "Documents approved", state: "upcoming" });
  }

  steps.push({ label: "Processing", state: isProcessing ? "current" : "upcoming" });
  steps.push({ label: "Completed", state: "upcoming" });

  return { stage, terminal: null, steps, actionRequired };
}
