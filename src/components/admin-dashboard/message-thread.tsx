"use client";

import { useActionState } from "react";
import { sendAdminMessage, type ActionState } from "@/lib/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";

type Message = {
  id: string;
  message: string;
  sender_role: string;
  created_at: string;
  profiles: { full_name: string | null; role: string } | null;
};

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function formatDayDivider(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function AdminMessageThread({ applicationId, messages }: { applicationId: string; messages: Message[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    sendAdminMessage.bind(null, applicationId),
    undefined,
  );

  // Precomputed (not mutated during the render map below) -- index i needs
  // a day divider when its day differs from the previous message's day.
  const showDividerAt = messages.map((m, i) => i === 0 || dayKey(m.created_at) !== dayKey(messages[i - 1].created_at));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3 overflow-y-auto min-h-0">
        {messages.length === 0 ? (
          <p className="text-body-md text-on-surface-variant py-4 text-center">No messages yet.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => {
              const fromAdmin = m.sender_role === "admin";
              const showDivider = showDividerAt[i];
              return (
                <li key={m.id}>
                  {showDivider ? (
                    <div className="flex justify-center my-2">
                      <span className="text-label-sm text-on-surface-variant bg-surface-container-low rounded-full px-3 py-1">
                        {formatDayDivider(m.created_at)}
                      </span>
                    </div>
                  ) : null}
                  <div className={`flex ${fromAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] flex flex-col ${fromAdmin ? "items-end" : "items-start"}`}>
                      <span className="text-label-sm font-medium text-on-surface-variant mb-1">
                        {fromAdmin ? (m.profiles?.full_name ?? "Manish Cafe Team") : (m.profiles?.full_name ?? "Customer")}
                      </span>
                      <div
                        className={`rounded-xl px-3.5 py-2.5 ${
                          fromAdmin
                            ? "bg-primary text-on-primary rounded-tr-sm"
                            : "border border-outline-variant bg-surface-container-lowest text-foreground rounded-tl-sm"
                        }`}
                      >
                        <p className="text-body-md whitespace-pre-wrap">{m.message}</p>
                      </div>
                      <span className="text-label-sm text-on-surface-variant mt-1">{formatTime(m.created_at)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form action={formAction} className="space-y-1.5 pt-3 mt-3 border-t border-outline-variant">
        <label htmlFor="admin-message" className="sr-only">
          Message the customer
        </label>
        <textarea
          id="admin-message"
          name="message"
          required
          placeholder="Message the customer…"
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 text-body-md text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          rows={2}
        />
        {state?.error ? <p className="text-label-sm text-error">{state.error}</p> : null}
        <SubmitButton className="rounded-lg bg-primary text-on-primary px-4 py-2 text-label-md font-medium hover:brightness-110 transition-all disabled:opacity-60">
          Send
        </SubmitButton>
      </form>
    </div>
  );
}
