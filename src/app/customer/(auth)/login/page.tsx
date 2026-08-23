"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthCard, AuthFieldError, AUTH_INPUT_CLASSNAME } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { signInCustomer } from "@/lib/auth/actions";

export default function CustomerLoginPage() {
  const [state, formAction] = useActionState(signInCustomer, undefined);

  return (
    <AuthCard
      title="Customer Login"
      subtitle="Manish Cafe & Cyber Zone"
      accentClassName="bg-primary"
      footer={
        <>
          <Link href="/customer/forgot-password" className="text-primary underline">
            Forgot password?
          </Link>
          <span className="mx-2">·</span>
          <Link href="/customer/signup" className="text-primary underline">
            Create an account
          </Link>
        </>
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
        <SubmitButton className="w-full rounded-lg bg-primary text-on-primary py-2 font-semibold disabled:opacity-60">
          Log in
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
