"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthCard, AuthFieldError, AuthFieldSuccess, AUTH_INPUT_CLASSNAME } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { signUpCustomer } from "@/lib/auth/actions";

export default function CustomerSignupPage() {
  const [state, formAction] = useActionState(signUpCustomer, undefined);

  return (
    <AuthCard
      title="Create your account"
      subtitle="Manish Cafe & Cyber Zone"
      accentClassName="bg-primary"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/customer/login" className="text-primary underline">
            Log in
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4" noValidate>
        <AuthFieldError message={state?.error} />
        <AuthFieldSuccess message={state?.success} />
        <div className="space-y-1">
          <label htmlFor="fullName" className="text-label-sm text-on-surface-variant">
            Full name
          </label>
          <input id="fullName" name="fullName" type="text" autoComplete="name" required className={AUTH_INPUT_CLASSNAME} />
        </div>
        <div className="space-y-1">
          <label htmlFor="phone" className="text-label-sm text-on-surface-variant">
            Mobile number
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={AUTH_INPUT_CLASSNAME} />
        </div>
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
            autoComplete="new-password"
            minLength={8}
            required
            className={AUTH_INPUT_CLASSNAME}
          />
        </div>
        <SubmitButton className="w-full rounded-lg bg-primary text-on-primary py-2 font-semibold disabled:opacity-60">
          Create account
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
