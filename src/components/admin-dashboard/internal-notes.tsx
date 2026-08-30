"use client";

import { useActionState } from "react";
import { addInternalNote, type ActionState } from "@/lib/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { formatDate } from "@/lib/format";

type Note = {
  id: string;
  note: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

/**
 * Renders only from data that already passed application_internal_notes'
 * RLS select policy (admin/retailer only) -- there is no policy granting
 * customers access at all, so this component never receives customer data
 * to accidentally leak; the security boundary is the database, not this UI.
 */
export function InternalNotes({ applicationId, notes }: { applicationId: string; notes: Note[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addInternalNote.bind(null, applicationId),
    undefined,
  );

  return (
    <div className="flex flex-col h-full rounded-xl border border-warning-container bg-warning-container/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-on-warning-container text-[20px]" aria-hidden="true">
          lock
        </span>
        <p className="text-label-lg font-semibold text-foreground">Internal notes</p>
        <span className="ml-auto rounded-full bg-warning-container px-2.5 py-0.5 text-label-sm font-semibold text-on-warning-container uppercase tracking-wide">
          Staff only
        </span>
      </div>
      <p className="text-label-sm text-on-surface-variant mb-3">Never visible to the customer.</p>

      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        {notes.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No internal notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-surface-container-lowest border border-outline-variant p-3">
                <p className="text-label-sm text-on-surface-variant mb-0.5">
                  <span className="font-medium text-foreground">{n.profiles?.full_name ?? "Staff"}</span> ·{" "}
                  {formatDate(n.created_at)}
                </p>
                <p className="text-body-md text-foreground whitespace-pre-wrap">{n.note}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={formAction} className="space-y-1.5 pt-3 mt-3 border-t border-warning-container">
        <label htmlFor="internal-note" className="sr-only">
          Add an internal note (not visible to the customer)
        </label>
        <textarea
          id="internal-note"
          name="note"
          required
          placeholder="Add an internal note…"
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 text-body-md text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          rows={2}
        />
        {state?.error ? <p className="text-label-sm text-error">{state.error}</p> : null}
        <SubmitButton className="rounded-lg bg-surface-container-high text-foreground px-4 py-2 text-label-md font-medium hover:bg-surface-container-highest transition-colors disabled:opacity-60">
          Add note
        </SubmitButton>
      </form>
    </div>
  );
}
