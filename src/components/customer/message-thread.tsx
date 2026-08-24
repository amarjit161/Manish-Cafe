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

  // "New" is derived, not stored: an admin message counts as new to the
  // customer if it arrived after the customer's own last reply (or if the
  // customer hasn't replied at all yet). This needs no schema/RLS change --
  // application_messages has no UPDATE policy, and adding one just to track
  // read state isn't justified for a cosmetic badge.
  const lastCustomerMessageAt = [...messages]
    .reverse()
    .find((m) => m.sender_role === "customer")?.created_at;
  const isNew = (m: Message) =>
    m.sender_role !== "customer" && (!lastCustomerMessageAt || m.created_at > lastCustomerMessageAt);

  return (
    <div className="space-y-3">
      {messages.length > 0 ? (
        <ul className="space-y-2">
          {messages.map((m) => {
            const fromCustomer = m.sender_role === "customer";
            return (
              <li key={m.id} className={`flex ${fromCustomer ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl border p-3 ${
                    fromCustomer
                      ? "border-primary/30 bg-primary-container"
                      : "border-outline-variant bg-surface-container-lowest"
                  }`}
                >
                  <p className="text-label-sm text-on-surface-variant flex items-center gap-1.5">
                    {fromCustomer ? "You" : "Manish Cafe Team"} · {formatDate(m.created_at)}
                    {isNew(m) ? (
                      <span className="rounded-full bg-error px-1.5 py-0.5 text-[10px] font-semibold text-on-error">
                        NEW
                      </span>
                    ) : null}
                  </p>
                  <p className="text-body-md text-foreground whitespace-pre-wrap">{m.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

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
