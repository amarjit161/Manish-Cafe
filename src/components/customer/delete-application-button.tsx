"use client";

import { useState, useTransition } from "react";
import { deleteDraftApplication } from "@/lib/customer/actions";

/**
 * Draft-only, matching delete_draft_application()'s own independent check
 * -- this button simply isn't rendered for any other status (see the
 * caller), so there's no client-side gate to bypass in the first place.
 */
export function DeleteApplicationButton({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteDraftApplication(applicationId);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-label-sm font-medium text-error underline-offset-2 hover:underline"
      >
        Delete application
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-application-title"
          className="fixed inset-0 z-60 flex items-end justify-center bg-black/40 p-0 pb-20 sm:items-center sm:p-4 sm:pb-4"
        >
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-surface-container-lowest p-5 space-y-3">
            <p id="delete-application-title" className="text-body-lg font-semibold text-foreground">
              Delete this application?
            </p>
            <p className="text-body-md text-on-surface-variant">
              This draft and the information you&rsquo;ve entered will be removed. This cannot be undone.
            </p>
            {error ? <p className="text-label-sm text-error">{error}</p> : null}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 min-h-11 rounded-lg border border-outline-variant text-label-lg font-medium text-foreground disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPending}
                className="flex-1 min-h-11 rounded-lg bg-error text-on-error text-label-lg font-medium disabled:opacity-60"
              >
                {isPending ? "Deleting…" : "Delete application"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
