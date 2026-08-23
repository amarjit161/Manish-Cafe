"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthCard, AuthFieldError, AuthFieldSuccess, AUTH_INPUT_CLASSNAME } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { requestPasswordReset } from "@/lib/auth/actions";

export default function CustomerForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordReset.bind(null, "customer"), undefined);

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Manish Cafe & Cyber Zone"
      accentClassName="bg-primary"
      footer={
        <Link href="/customer/login" className="text-primary underline">
          Back to login
        </Link>
      }
    >
      <form action={formAction} className="space-y-4" noValidate>
        <AuthFieldError message={state?.error} />
        <AuthFieldSuccess message={state?.success} />
        <div className="space-y-1">
          <label htmlFor="email" className="text-label-sm text-on-surface-variant">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className={AUTH_INPUT_CLASSNAME} />
        </div>
        <SubmitButton className="w-full rounded-lg bg-primary text-on-primary py-2 font-semibold disabled:opacity-60">
          Send reset link
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
