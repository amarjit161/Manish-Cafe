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
    <div className="space-y-3 rounded-2xl border-2 border-dashed border-outline-variant p-4">
      <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide">
        Internal notes — never visible to the customer
      </p>
      {notes.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">No internal notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3">
              <p className="text-label-sm text-on-surface-variant">
                {n.profiles?.full_name ?? "Staff"} · {formatDate(n.created_at)}
              </p>
              <p className="text-body-md text-foreground whitespace-pre-wrap">{n.note}</p>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-1">
        <textarea
          name="note"
          required
          placeholder="Add an internal note…"
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground"
          rows={2}
        />
        {state?.error ? <p className="text-label-sm text-error">{state.error}</p> : null}
        <SubmitButton className="rounded-lg bg-surface-container-high text-foreground px-3 py-1.5 text-label-sm font-medium disabled:opacity-60">
          Add note
        </SubmitButton>
      </form>
    </div>
  );
}
