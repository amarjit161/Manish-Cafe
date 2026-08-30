"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";

const INPUT_CLASSNAME =
  "w-full min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest p-2.5 text-body-md text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none";

/**
 * Reuses the exact same updatePassword action already used by the
 * forgot-password reset flow (supabase.auth.updateUser({ password })) --
 * that call works for any authenticated session, not just a password-reset
 * one, so this is real, working functionality, not a new mechanism.
 */
export function ChangePasswordForm() {
  const [state, formAction] = useActionState(updatePassword, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="new-password" className="text-label-sm text-on-surface-variant">
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={INPUT_CLASSNAME}
        />
        <p className="text-label-sm text-on-surface-variant">At least 8 characters.</p>
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-lg bg-error-container text-on-error-container text-label-sm px-3 py-2">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="rounded-lg bg-success-container text-on-success-container text-label-sm px-3 py-2">
          {state.success}
        </p>
      ) : null}

      <SubmitButton className="min-h-11 rounded-xl bg-primary text-on-primary px-5 text-label-lg font-medium hover:brightness-110 transition-all disabled:opacity-60">
        Update password
      </SubmitButton>
    </form>
  );
}
