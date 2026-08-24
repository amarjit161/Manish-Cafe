"use client";

import { useActionState, useState } from "react";
import {
  approveDocument,
  rejectDocument,
  requestDocumentReupload,
  type ActionState,
} from "@/lib/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";

/**
 * Status-aware: an already-approved (or deleted) document gets no review
 * actions at all -- just a confirmation line -- both here and, redundantly,
 * enforced server-side in admin/actions.ts (loadReviewableDocument). The UI
 * hiding these buttons is a convenience, not the security boundary.
 */
export function DocumentReviewActions({
  documentId,
  applicationId,
  status,
}: {
  documentId: string;
  applicationId: string;
  status: string;
}) {
  const [approveState, approveAction] = useActionState<ActionState, FormData>(
    approveDocument.bind(null, documentId, applicationId),
    undefined,
  );
  const [rejectState, rejectAction] = useActionState<ActionState, FormData>(
    rejectDocument.bind(null, documentId, applicationId),
    undefined,
  );
  const [reuploadState, reuploadAction] = useActionState<ActionState, FormData>(
    requestDocumentReupload.bind(null, documentId, applicationId),
    undefined,
  );

  const [openPanel, setOpenPanel] = useState<"reject" | "reupload" | null>(null);

  if (status === "approved") {
    return <p className="text-label-sm text-tertiary font-medium">✓ Approved — no further action needed.</p>;
  }
  if (status === "deleted") {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <form action={approveAction}>
          <SubmitButton className="rounded-lg bg-tertiary text-on-tertiary px-3 py-1.5 text-label-sm font-medium disabled:opacity-60">
            Approve
          </SubmitButton>
        </form>
        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === "reject" ? null : "reject")}
          className="rounded-lg bg-error-container text-on-error-container px-3 py-1.5 text-label-sm font-medium"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === "reupload" ? null : "reupload")}
          className="rounded-lg bg-surface-container-high text-foreground px-3 py-1.5 text-label-sm font-medium"
        >
          Request re-upload
        </button>
      </div>

      {approveState?.error ? <p className="text-label-sm text-error">{approveState.error}</p> : null}

      {openPanel === "reject" ? (
        <form action={rejectAction} className="space-y-1">
          <textarea
            name="reason"
            required
            placeholder="Reason for rejection (shown to the customer)"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground"
            rows={2}
          />
          {rejectState?.error ? <p className="text-label-sm text-error">{rejectState.error}</p> : null}
          <SubmitButton className="rounded-lg bg-error-container text-on-error-container px-3 py-1.5 text-label-sm font-medium disabled:opacity-60">
            Confirm rejection
          </SubmitButton>
        </form>
      ) : null}

      {openPanel === "reupload" ? (
        <form action={reuploadAction} className="space-y-1">
          <textarea
            name="message"
            required
            placeholder="What does the customer need to re-upload, and why?"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground"
            rows={2}
          />
          {reuploadState?.error ? <p className="text-label-sm text-error">{reuploadState.error}</p> : null}
          <SubmitButton className="rounded-lg bg-surface-container-high text-foreground px-3 py-1.5 text-label-sm font-medium disabled:opacity-60">
            Send re-upload request
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
