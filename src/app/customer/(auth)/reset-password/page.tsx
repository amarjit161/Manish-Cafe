"use client";

import { useActionState } from "react";
import { AuthCard, AuthFieldError, AuthFieldSuccess, AUTH_INPUT_CLASSNAME } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { updatePassword } from "@/lib/auth/actions";

export default function CustomerResetPasswordPage() {
  const [state, formAction] = useActionState(updatePassword, undefined);

  return (
    <AuthCard title="Set a new password" subtitle="Manish Cafe & Cyber Zone" accentClassName="bg-primary">
      <form action={formAction} className="space-y-4" noValidate>
        <AuthFieldError message={state?.error} />
        <AuthFieldSuccess message={state?.success} />
        <div className="space-y-1">
          <label htmlFor="password" className="text-label-sm text-on-surface-variant">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className={AUTH_INPUT_CLASSNAME}
          />
        </div>
        <SubmitButton className="w-full rounded-lg bg-primary text-on-primary py-2 font-semibold disabled:opacity-60">
          Update password
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
