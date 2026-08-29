import type { Database } from "@/lib/supabase/database.types";
import { STAGE_LABELS, STAGE_TONES, type ApplicationStage } from "@/lib/applications/progress";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  submitted: "bg-secondary-container text-on-secondary-container",
  under_review: "bg-secondary-container text-on-secondary-container",
  // A nudge, not a failure -- warning-amber, matching STAGE_TONES'
  // existing "warning" classification for this same stage.
  documents_required: "bg-warning-container text-on-warning-container",
  // Grouped with the other in-progress states rather than tertiary
  // (Stitch's tertiary is a saffron accent color, not "in progress").
  processing: "bg-secondary-container text-on-secondary-container",
  completed: "bg-success text-on-success",
  rejected: "bg-error-container text-on-error-container",
  cancelled: "bg-surface-container-high text-on-surface-variant",
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  documents_required: "Documents required",
  processing: "Processing",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-label-sm font-medium whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

type DocumentStatus = Database["public"]["Enums"]["document_status"];

const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, string> = {
  uploaded: "bg-secondary-container text-on-secondary-container",
  under_review: "bg-secondary-container text-on-secondary-container",
  approved: "bg-success text-on-success",
  verified: "bg-success text-on-success",
  rejected: "bg-error-container text-on-error-container",
  reupload_required: "bg-error-container text-on-error-container",
  deleted: "bg-surface-container-high text-on-surface-variant",
};

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "Uploaded",
  under_review: "Under review",
  approved: "Approved",
  verified: "Verified",
  rejected: "Rejected",
  reupload_required: "Re-upload required",
  deleted: "Deleted",
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-label-sm font-medium whitespace-nowrap ${DOCUMENT_STATUS_STYLES[status]}`}
    >
      {DOCUMENT_STATUS_LABELS[status]}
    </span>
  );
}

const STAGE_TONE_STYLES: Record<(typeof STAGE_TONES)[ApplicationStage], string> = {
  success: "bg-success text-on-success",
  warning: "bg-warning-container text-on-warning-container",
  info: "bg-primary-container text-on-primary-container",
  neutral: "bg-surface-container-high text-on-surface-variant",
  error: "bg-error-container text-on-error-container",
};

/**
 * The one canonical application-status badge -- driven by
 * getApplicationProgress()'s derived stage, not the raw applications.status
 * enum. This is what a customer should see; the raw enum is an
 * implementation detail (e.g. DB "submitted" + a rejected document reads
 * to the customer as "Action required", not "Submitted").
 */
export function ApplicationStageBadge({ stage }: { stage: ApplicationStage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-label-sm font-medium whitespace-nowrap ${STAGE_TONE_STYLES[STAGE_TONES[stage]]}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
