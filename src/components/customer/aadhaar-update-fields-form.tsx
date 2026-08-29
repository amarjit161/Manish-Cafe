"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationAnswers } from "@/lib/customer/actions";
import { AADHAAR_UPDATE_FIELDS, MOBILE_REGISTERED_OPTIONS, type MobileRegisteredAnswer } from "@/lib/applications/aadhaar-fields";

type ExtraCharge = { condition_key: string; label: string; amount: number };

const FLAG_BY_MOBILE_ANSWER: Partial<Record<MobileRegisteredAnswer, string>> = {
  no: "mobile_not_registered",
  registered_other: "mobile_registered_other",
};

/**
 * Persists into applications.answers ({ update_fields, other_text,
 * mobile_registered, flags }), the same generic column isDocumentRequired()
 * and computePriceBreakdown() read. Selecting "Address" is what turns
 * Address Proof from optional to required; the mobile-number answer is
 * what can add a configured extra charge -- nothing about this is
 * Aadhaar-specific in the requirements/pricing engines, only this form's
 * field list is.
 */
export function AadhaarUpdateFieldsForm({
  applicationId,
  initialFields,
  initialOtherText,
  initialMobileRegistered,
  initialContactMobile,
  initialContactAltMobile,
  initialContactEmail,
  extraCharges,
  disabled,
}: {
  applicationId: string;
  initialFields: string[];
  initialOtherText: string;
  initialMobileRegistered: MobileRegisteredAnswer | null;
  initialContactMobile: string;
  initialContactAltMobile: string;
  initialContactEmail: string;
  extraCharges: ExtraCharge[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialFields);
  const [otherText, setOtherText] = useState(initialOtherText);
  const [mobileRegistered, setMobileRegistered] = useState<MobileRegisteredAnswer | null>(initialMobileRegistered);
  const [contactMobile, setContactMobile] = useState(initialContactMobile);
  const [contactAltMobile, setContactAltMobile] = useState(initialContactAltMobile);
  const [contactEmail, setContactEmail] = useState(initialContactEmail);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(next: {
    updateFields: string[];
    otherText: string;
    mobileRegistered: MobileRegisteredAnswer | null;
    contactMobile: string;
    contactAltMobile: string;
    contactEmail: string;
  }) {
    startTransition(async () => {
      const result = await updateApplicationAnswers(applicationId, {
        updateFields: next.updateFields,
        otherText: next.otherText,
        mobileRegistered: next.mobileRegistered ?? undefined,
        contactMobile: next.contactMobile,
        contactAltMobile: next.contactAltMobile,
        contactEmail: next.contactEmail,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        router.refresh();
      }
    });
  }

  function toggle(key: string) {
    if (disabled || isPending) return;
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    setSelected(next);
    save({ updateFields: next, otherText, mobileRegistered, contactMobile, contactAltMobile, contactEmail });
  }

  function commitOtherText() {
    if (disabled || isPending) return;
    save({ updateFields: selected, otherText, mobileRegistered, contactMobile, contactAltMobile, contactEmail });
  }

  function chooseMobileRegistered(value: MobileRegisteredAnswer) {
    if (disabled || isPending) return;
    setMobileRegistered(value);
    save({ updateFields: selected, otherText, mobileRegistered: value, contactMobile, contactAltMobile, contactEmail });
  }

  function commitContactInfo() {
    if (disabled || isPending) return;
    save({ updateFields: selected, otherText, mobileRegistered, contactMobile, contactAltMobile, contactEmail });
  }

  function chargeFor(value: MobileRegisteredAnswer): ExtraCharge | undefined {
    const flag = FLAG_BY_MOBILE_ANSWER[value];
    if (!flag) return undefined;
    return extraCharges.find((c) => c.condition_key === flag);
  }

  return (
    <div className="space-y-4 rounded-2xl bg-surface-container-low p-4">
      <div className="space-y-3">
        <p className="text-label-lg text-foreground">What would you like to update?</p>
        <div className="space-y-1">
          {AADHAAR_UPDATE_FIELDS.map((f) => (
            <label
              key={f.key}
              className="flex min-h-11 items-center gap-3 rounded-lg px-1 py-1.5 text-body-md text-foreground"
            >
              <input
                type="checkbox"
                checked={selected.includes(f.key)}
                disabled={disabled || isPending}
                onChange={() => toggle(f.key)}
                className="h-5 w-5 rounded border-outline-variant accent-primary disabled:opacity-60"
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      {selected.includes("other") ? (
        <div className="space-y-1">
          <label className="text-label-sm text-on-surface-variant">
            Please specify <span className="text-error">*</span>
          </label>
          <input
            type="text"
            required
            value={otherText}
            disabled={disabled || isPending}
            onChange={(e) => setOtherText(e.target.value)}
            onBlur={commitOtherText}
            placeholder="What else do you want to update?"
            className="w-full min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground disabled:opacity-60"
          />
          {!disabled && !otherText.trim() ? (
            <p className="text-label-sm text-error">Required before you can submit your application.</p>
          ) : null}
        </div>
      ) : null}

      {selected.includes("mobile") ? (
        <div className="space-y-2 border-t border-outline-variant pt-3">
          <p className="text-body-md font-medium text-foreground">
            Is a mobile number already registered with your Aadhaar?
          </p>
          <div className="space-y-1">
            {MOBILE_REGISTERED_OPTIONS.map((opt) => {
              const charge = chargeFor(opt.value);
              return (
                <div key={opt.value}>
                  <label className="flex min-h-11 items-center gap-3 rounded-lg px-1 py-1.5 text-body-md text-foreground">
                    <input
                      type="radio"
                      name="mobile_registered"
                      checked={mobileRegistered === opt.value}
                      disabled={disabled || isPending}
                      onChange={() => chooseMobileRegistered(opt.value)}
                      className="h-5 w-5 border-outline-variant accent-primary disabled:opacity-60"
                    />
                    <span>{opt.label}</span>
                    {charge ? (
                      <span className="ml-auto text-label-sm text-on-surface-variant whitespace-nowrap">
                        +₹{charge.amount}
                      </span>
                    ) : null}
                  </label>
                  {mobileRegistered === opt.value && opt.info ? (
                    <div className="ml-8 mt-1 space-y-0.5 rounded-lg bg-surface-container-lowest p-2">
                      {opt.info.map((line) => (
                        <p key={line} className="text-label-sm text-on-surface-variant">
                          {line}
                        </p>
                      ))}
                      {charge ? (
                        <p className="text-label-sm text-foreground font-medium">
                          Additional charge: ₹{charge.amount} ({charge.label})
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-outline-variant pt-3">
        <div>
          <p className="text-body-md font-medium text-foreground">How can we reach you?</p>
          <p className="text-label-sm text-on-surface-variant">
            We may use this number to contact you about your application.
          </p>
        </div>
        <div className="space-y-1">
          <label className="text-label-sm text-on-surface-variant">
            Mobile number <span className="text-error">*</span>
          </label>
          <input
            type="tel"
            required
            value={contactMobile}
            disabled={disabled || isPending}
            onChange={(e) => setContactMobile(e.target.value)}
            onBlur={commitContactInfo}
            placeholder="10-digit mobile number"
            className="w-full min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground disabled:opacity-60"
          />
        </div>
        <div className="space-y-1">
          <label className="text-label-sm text-on-surface-variant">Alternative mobile number (optional)</label>
          <input
            type="tel"
            value={contactAltMobile}
            disabled={disabled || isPending}
            onChange={(e) => setContactAltMobile(e.target.value)}
            onBlur={commitContactInfo}
            className="w-full min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground disabled:opacity-60"
          />
        </div>
        <div className="space-y-1">
          <label className="text-label-sm text-on-surface-variant">Email (optional)</label>
          <input
            type="email"
            value={contactEmail}
            disabled={disabled || isPending}
            onChange={(e) => setContactEmail(e.target.value)}
            onBlur={commitContactInfo}
            className="w-full min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground disabled:opacity-60"
          />
        </div>
      </div>

      {error ? <p className="text-label-sm text-error">{error}</p> : null}
      {disabled ? (
        <p className="text-label-sm text-on-surface-variant">
          This can only be changed while the application is still a draft.
        </p>
      ) : null}
    </div>
  );
}
