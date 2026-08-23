"use client";

import { useActionState } from "react";
import { createApplication, type ActionState } from "@/lib/customer/actions";
import { SubmitButton } from "@/components/auth/submit-button";

export function ApplyButton({ serviceId }: { serviceId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createApplication.bind(null, serviceId),
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
        Apply for this service
      </SubmitButton>
    </form>
  );
}
