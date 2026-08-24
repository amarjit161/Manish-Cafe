"use client";

import { useActionState } from "react";
import { sendAdminMessage, type ActionState } from "@/lib/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { formatDate } from "@/lib/format";

type Message = {
  id: string;
  message: string;
  sender_role: string;
  created_at: string;
  profiles: { full_name: string | null; role: string } | null;
};

export function AdminMessageThread({ applicationId, messages }: { applicationId: string; messages: Message[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    sendAdminMessage.bind(null, applicationId),
    undefined,
  );

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">No messages yet.</p>
      ) : (
        <ul className="space-y-2">
          {messages.map((m) => {
            const fromAdmin = m.sender_role === "admin";
            return (
              <li key={m.id} className={`flex ${fromAdmin ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl border p-3 ${
                    fromAdmin ? "border-primary/30 bg-primary-container" : "border-outline-variant bg-surface-container-lowest"
                  }`}
                >
                  <p className="text-label-sm text-on-surface-variant">
                    {fromAdmin ? (m.profiles?.full_name ?? "You") : (m.profiles?.full_name ?? "Customer")} ·{" "}
                    {formatDate(m.created_at)}
                  </p>
                  <p className="text-body-md text-foreground whitespace-pre-wrap">{m.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form action={formAction} className="space-y-1">
        <textarea
          name="message"
          required
          placeholder="Message the customer…"
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
