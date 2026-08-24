export type TimelineEvent = { at: string; title: string; detail?: string };

const APPLICATION_STATUS_EVENT_TITLES: Record<string, string> = {
  submitted: "Application submitted",
  under_review: "Application under review",
  documents_required: "Documents required",
  processing: "Application moved to processing",
  completed: "Application completed",
  rejected: "Application rejected",
  cancelled: "Application cancelled",
};

const DOCUMENT_VERIFIED_DETAILS: Record<string, string> = {
  approved: "Approved",
  verified: "Approved",
  rejected: "Rejected",
  reupload_required: "Re-upload requested",
};

/**
 * Merges application_status_history with document upload/review events into
 * a single chronological feed, assembled at query time from existing data
 * rather than a new dedicated events table (there is no gap to fill --
 * every event already has a timestamped source row). Event text is written
 * in plain, customer-facing language -- no raw enum values or DB jargon.
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
    // "draft" is the initial state, never a transition worth showing.
    if (h.new_status === "draft") continue;
    events.push({ at: h.created_at, title: APPLICATION_STATUS_EVENT_TITLES[h.new_status] ?? h.new_status });
  }

  for (const d of params.documents) {
    const docName = d.document_types?.name ?? "Document";
    events.push({ at: d.uploaded_at, title: docName, detail: "Document uploaded" });

    const verifiedDetail = DOCUMENT_VERIFIED_DETAILS[d.status];
    if (d.verified_at && verifiedDetail) {
      events.push({ at: d.verified_at, title: docName, detail: verifiedDetail });
    }
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
