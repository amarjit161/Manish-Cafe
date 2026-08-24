"use client";

import { useActionState } from "react";
import { sendCustomerMessage, type ActionState } from "@/lib/customer/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { formatDate } from "@/lib/format";

type Message = { id: string; message: string; sender_role: string; created_at: string };

export function CustomerMessageThread({ applicationId, messages }: { applicationId: string; messages: Message[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    sendCustomerMessage.bind(null, applicationId),
    undefined,
  );

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">No messages yet.</p>
      ) : (
        <ul className="space-y-2">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-xl border border-outline-variant p-3 ${
                m.sender_role === "customer" ? "bg-primary-container" : "bg-surface-container-lowest"
              }`}
            >
              <p className="text-label-sm text-on-surface-variant">
                {m.sender_role === "customer" ? "You" : "Manish Cafe team"} · {formatDate(m.created_at)}
              </p>
              <p className="text-body-md text-foreground whitespace-pre-wrap">{m.message}</p>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-1">
        <textarea
          name="message"
          required
          placeholder="Message the Manish Cafe team…"
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground"
          rows={2}
        />
        {state?.error ? <p className="text-label-sm text-error">{state.error}</p> : null}
        <SubmitButton className="rounded-lg bg-primary text-on-primary px-3 py-1.5 text-label-sm font-medium disabled:opacity-60">
          Send
        </SubmitButton>
      </form>
    </div>
  );
}
