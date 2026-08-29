"use client";

import { useActionState } from "react";
import { submitApplication, type ActionState } from "@/lib/customer/actions";
import { SubmitButton } from "@/components/auth/submit-button";

export function SubmitApplicationButton({ applicationId }: { applicationId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    submitApplication.bind(null, applicationId),
    undefined,
  );

  return (
    <form action={formAction} className="space-y-2">
      {state?.error ? (
        <p role="alert" className="rounded-lg bg-error-container text-on-error-container text-label-sm px-3 py-2">
          {state.error}
        </p>
      ) : null}
      <SubmitButton className="w-full rounded-lg bg-primary text-on-primary py-3 font-semibold disabled:opacity-60">
        Review & submit →
      </SubmitButton>
    </form>
  );
}
