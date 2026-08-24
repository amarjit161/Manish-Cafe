"use client";

import { useActionState, useState } from "react";
import {
  approveDocument,
  rejectDocument,
  requestDocumentReupload,
  type ActionState,
} from "@/lib/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";

const DECISION_PENDING_STATUSES = new Set(["uploaded", "under_review"]);
const REUPLOAD_ONLY_STATUSES = new Set(["rejected", "reupload_required"]);

/**
 * Status-aware: which buttons render here must always match
 * ALLOWED_SOURCE_STATUSES in admin/actions.ts exactly -- the server enforces
 * the same matrix independently, so this is a convenience for the admin,
 * never the security boundary.
 *
 *   uploaded / under_review  -> Approve, Reject, Request re-upload
 *   rejected / reupload_required -> Request re-upload only (the decision
 *                                    already happened; approving or
 *                                    re-rejecting a document nobody has
 *                                    replaced yet isn't a real transition)
 *   approved / deleted       -> no actions at all
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

  const reuploadPanel = (
    <>
      <button
        type="button"
        onClick={() => setOpenPanel(openPanel === "reupload" ? null : "reupload")}
        className="rounded-lg bg-surface-container-high text-foreground px-3 py-1.5 text-label-sm font-medium"
      >
        Request re-upload
      </button>
      {openPanel === "reupload" ? (
        <form action={reuploadAction} className="w-full space-y-1 mt-2">
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
    </>
  );

  if (REUPLOAD_ONLY_STATUSES.has(status)) {
    return <div className="flex flex-wrap items-center gap-2">{reuploadPanel}</div>;
  }

  if (!DECISION_PENDING_STATUSES.has(status)) {
    // Any future/unknown status: fail safe by showing no actions rather
    // than guessing.
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
        {reuploadPanel}
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
    </div>
  );
}
