"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile, type ActionState } from "@/lib/customer/actions";
import { SubmitButton } from "@/components/auth/submit-button";

const INPUT_CLASSNAME =
  "w-full min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest p-2.5 text-body-md text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none";
const DISABLED_INPUT_CLASSNAME =
  "w-full min-h-11 rounded-xl border border-outline-variant bg-surface-container-high p-2.5 text-body-md text-on-surface-variant cursor-not-allowed";

type Props = {
  initialFullName: string;
  email: string | null;
  initialPhone: string;
  initialAddress: string;
  initialDateOfBirth: string;
};

export function EditProfileForm({ initialFullName, email, initialPhone, initialAddress, initialDateOfBirth }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(updateMyProfile, undefined);
  const [justSaved, setJustSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setJustSaved(true);
      router.refresh();
      const t = setTimeout(() => setJustSaved(false), 4000);
      return () => clearTimeout(t);
    }
    wasPending.current = isPending;
  }, [isPending, state, router]);

  const initial = (initialFullName.trim()[0] ?? "?").toUpperCase();

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="relative">
          <span
            className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-on-primary text-headline-lg font-semibold"
            aria-hidden="true"
          >
            {initial}
          </span>
          <button
            type="button"
            disabled
            aria-label="Photo upload isn't available yet"
            title="Photo upload isn't available yet"
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant border-2 border-surface-container-lowest cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              photo_camera
            </span>
          </button>
        </div>
        <p className="text-label-sm text-on-surface-variant">Photo upload isn&rsquo;t available yet</p>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 sm:p-5 space-y-4">
        <p className="text-label-lg font-semibold text-primary uppercase tracking-wide text-[13px]">
          Personal information
        </p>

        <div className="space-y-1.5">
          <label htmlFor="fullName" className="text-label-sm text-on-surface-variant">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            maxLength={200}
            defaultValue={initialFullName}
            className={INPUT_CLASSNAME}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-label-sm text-on-surface-variant">
            Email address
          </label>
          <input id="email" type="email" value={email ?? ""} disabled readOnly className={DISABLED_INPUT_CLASSNAME} />
          <p className="text-label-sm text-on-surface-variant">Your login email. Contact us to change this.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-label-sm text-on-surface-variant">
            Phone number
          </label>
          <input id="phone" name="phone" type="tel" defaultValue={initialPhone} className={INPUT_CLASSNAME} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dateOfBirth" className="text-label-sm text-on-surface-variant">
            Date of birth
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={initialDateOfBirth}
            className={INPUT_CLASSNAME}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 sm:p-5 space-y-4">
        <p className="text-label-lg font-semibold text-primary uppercase tracking-wide text-[13px]">
          Address
        </p>
        <div className="space-y-1.5">
          <label htmlFor="address" className="text-label-sm text-on-surface-variant">
            Address
          </label>
          <textarea
            id="address"
            name="address"
            rows={3}
            defaultValue={initialAddress}
            placeholder="House / street, area, city, state, PIN"
            className={`${INPUT_CLASSNAME} resize-none`}
          />
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-error-container text-on-error-container text-body-md px-4 py-3">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            error
          </span>
          {state.error}
        </p>
      ) : null}
      {justSaved ? (
        <p className="flex items-center gap-2 rounded-xl bg-success-container text-on-success-container text-body-md px-4 py-3">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            check_circle
          </span>
          Your changes have been saved.
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2">
        <SubmitButton className="flex-1 min-h-11 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:brightness-110 transition-all disabled:opacity-60">
          Save changes
        </SubmitButton>
        <button
          type="button"
          onClick={() => router.push("/customer/account")}
          disabled={isPending}
          className="min-h-11 rounded-xl border border-outline-variant text-foreground px-6 text-label-lg font-medium hover:bg-surface-container-low transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
