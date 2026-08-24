export type ProgressStepState = "done" | "current" | "upcoming";
export type ProgressStep = { label: string; state: ProgressStepState };

export type ActionRequiredItem = {
  documentTypeName: string;
  documentId: string;
  status: "rejected" | "reupload_required";
  reason: string | null;
};

export type ApplicationProgress = {
  /** Set when the application is in a terminal, non-standard-progress state. */
  terminal: "rejected" | "cancelled" | "completed" | null;
  steps: ProgressStep[];
  actionRequired: ActionRequiredItem[];
};

const IN_REVIEW_STATUSES = new Set(["submitted", "under_review", "documents_required"]);

/**
 * Derives a customer-facing progress view purely from real database state
 * (application.status + each currently-required document's current row) --
 * nothing here is specific to any one application or service. This keeps
 * the single overall APPLICATION status distinct from individual DOCUMENT
 * statuses: an application can read "Documents Required" overall while one
 * document is already Approved and another needs a re-upload -- that
 * distinction is what actionRequired surfaces.
 */
export function computeApplicationProgress(params: {
  applicationStatus: string;
  currentRequiredDocuments: {
    id: string;
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
      documentId: d.id,
      status: d.status as "rejected" | "reupload_required",
      reason: d.status === "rejected" ? d.rejection_reason : d.reupload_message,
    }));

  if (applicationStatus === "rejected" || applicationStatus === "cancelled" || applicationStatus === "completed") {
    return { terminal: applicationStatus, steps: [], actionRequired };
  }

  const submitted = applicationStatus !== "draft";
  const hasActionRequired = actionRequired.length > 0;
  const isProcessing = applicationStatus === "processing";
  const isInReview = IN_REVIEW_STATUSES.has(applicationStatus);

  const steps: ProgressStep[] = [
    { label: "Application submitted", state: submitted ? "done" : "current" },
    { label: "Documents submitted", state: submitted ? "done" : "upcoming" },
  ];

  if (hasActionRequired) {
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

  return { terminal: null, steps, actionRequired };
}
