export type TimelineEvent = { at: string; label: string };

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  documents_required: "Documents required",
  processing: "Processing",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const DOCUMENT_VERIFIED_LABELS: Record<string, string> = {
  approved: "approved",
  verified: "approved",
  rejected: "rejected",
  reupload_required: "sent back for re-upload",
};

/**
 * Merges application_status_history with document upload/review events into
 * a single chronological feed, assembled at query time from existing data
 * rather than a new dedicated events table (there is no gap to fill --
 * every event already has a timestamped source row).
 */
export function buildApplicationTimeline(params: {
  history: { id: string; created_at: string; new_status: string }[];
  documents: {
    id: string;
    original_filename: string;
    uploaded_at: string;
    status: string;
    verified_at: string | null;
    document_types?: { name: string | null } | null;
  }[];
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const h of params.history) {
    events.push({ at: h.created_at, label: `Application status changed to "${STATUS_LABELS[h.new_status] ?? h.new_status}"` });
  }

  for (const d of params.documents) {
    const docName = d.document_types?.name ?? "Document";
    events.push({ at: d.uploaded_at, label: `${docName} uploaded (${d.original_filename})` });

    const verifiedLabel = DOCUMENT_VERIFIED_LABELS[d.status];
    if (d.verified_at && verifiedLabel) {
      events.push({ at: d.verified_at, label: `${docName}: ${verifiedLabel}` });
    }
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
