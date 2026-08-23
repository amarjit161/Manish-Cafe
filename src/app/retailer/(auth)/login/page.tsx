"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthCard, AuthFieldError, AUTH_INPUT_CLASSNAME } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { signInRetailer } from "@/lib/auth/actions";

export default function RetailerLoginPage() {
  const [state, formAction] = useActionState(signInRetailer, undefined);

  return (
    <AuthCard
      title="Retailer Login"
      subtitle="Manish Cafe & Cyber Zone"
      accentClassName="bg-secondary-container"
      footer={
        <Link href="/retailer/forgot-password" className="text-primary underline">
          Forgot password?
        </Link>
      }
    >
      <form action={formAction} className="space-y-4" noValidate>
        <AuthFieldError message={state?.error} />
        <div className="space-y-1">
          <label htmlFor="email" className="text-label-sm text-on-surface-variant">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className={AUTH_INPUT_CLASSNAME} />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-label-sm text-on-surface-variant">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={AUTH_INPUT_CLASSNAME}
          />
        </div>
        <SubmitButton className="w-full rounded-lg bg-secondary-container text-on-secondary-container py-2 font-semibold disabled:opacity-60">
          Log in
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
