"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationAnswers } from "@/lib/customer/actions";
import {
  AADHAAR_UPDATE_FIELDS,
  MOBILE_REGISTERED_OPTIONS,
  deriveAnswerFlags,
  type MobileRegisteredAnswer,
} from "@/lib/applications/aadhaar-fields";
import { isDocumentRequired } from "@/lib/applications/requirements";
import { computePriceBreakdown } from "@/lib/applications/pricing";

type ExtraCharge = { condition_key: string; label: string; amount: number };
type DocRequirement = { typeId: string; name: string; conditionKey: string | null; isMandatory: boolean };

const FIELD_DESCRIPTIONS: Partial<Record<(typeof AADHAAR_UPDATE_FIELDS)[number]["key"], string>> = {
  name: "Update the name on your Aadhaar",
  father_name: "Update your father's name",
  mother_name: "Update your mother's name",
  spouse_name: "Update your husband/wife's name",
  dob: "Update your date of birth",
  gender: "Update your gender",
  mobile: "Link or update your mobile number",
  email: "Add or update your email address",
  address: "Update your address",
  other: "Something else not listed here",
};

/**
 * Everything in this form is local-client state until "Save & continue" is
 * pressed. It used to fire a Server Action (a DB update, then
 * router.refresh() re-rendering the whole page) on every single checkbox
 * toggle, radio choice, or text-field blur -- on this deployment, each of
 * those round-trips measured 4-8 seconds, so five quick clicks meant five
 * multi-second stalls. Real interactions should feel instant; only an
 * explicit save should ever touch the network.
 *
 * The price preview and document-requirement hints below run
 * computePriceBreakdown()/isDocumentRequired() -- the exact same pure,
 * shared functions the server uses -- against this local state, so the
 * preview is never a second, divergent pricing implementation. It is only
 * ever a preview: change_application_status() independently recomputes
 * and snapshots the real price server-side at submission regardless of
 * what this component ever showed.
 */
export function AadhaarUpdateFieldsForm({
  applicationId,
  initialFields,
  initialOtherText,
  initialMobileRegistered,
  initialContactMobile,
  initialContactAltMobile,
  initialContactEmail,
  basePrice,
  extraCharges,
  requiredDocs,
  disabled,
}: {
  applicationId: string;
  initialFields: string[];
  initialOtherText: string;
  initialMobileRegistered: MobileRegisteredAnswer | null;
  initialContactMobile: string;
  initialContactAltMobile: string;
  initialContactEmail: string;
  basePrice: number;
  extraCharges: ExtraCharge[];
  requiredDocs: DocRequirement[];
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
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  function markDirty() {
    setDirty(true);
    setSaveState("idle");
  }

  function toggle(key: string) {
    if (disabled) return;
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    markDirty();
  }

  function saveAndContinue() {
    if (disabled || isPending) return;
    startTransition(async () => {
      const result = await updateApplicationAnswers(applicationId, {
        updateFields: selected,
        otherText,
        mobileRegistered: mobileRegistered ?? undefined,
        contactMobile,
        contactAltMobile,
        contactEmail,
      });
      if (result?.error) {
        // Local selections are left exactly as the customer made them --
        // a failed save must never erase what they picked.
        setError(result.error);
        setSaveState("error");
        return;
      }
      setError(null);
      setSaveState("saved");
      setDirty(false);
      router.refresh();
      document.getElementById("documents-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const localFlags = deriveAnswerFlags({ mobile_registered: mobileRegistered ?? undefined });
  const preview = computePriceBreakdown({ basePrice, answers: { flags: localFlags }, extraCharges });
  const neededDocs = requiredDocs.filter((d) => isDocumentRequired(d.conditionKey, d.isMandatory, { update_fields: selected }));

  return (
    <div className="space-y-4 rounded-2xl bg-surface-container-low p-4">
      <div className="space-y-3">
        <p className="text-label-lg text-foreground">What would you like to update?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {AADHAAR_UPDATE_FIELDS.map((f) => {
            const isSelected = selected.includes(f.key);
            return (
              <label
                key={f.key}
                className={`flex min-h-11 items-start gap-3 rounded-xl border p-3 transition-colors ${
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                } ${isSelected ? "border-primary bg-primary-container/30" : "border-outline-variant bg-surface-container-lowest"}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => toggle(f.key)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-outline-variant accent-primary disabled:opacity-60"
                />
                <span className="min-w-0">
                  <span className="block text-body-md font-medium text-foreground">{f.label}</span>
                  <span className="block text-label-sm text-on-surface-variant">{FIELD_DESCRIPTIONS[f.key]}</span>
                </span>
              </label>
            );
          })}
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
            disabled={disabled}
            onChange={(e) => {
              setOtherText(e.target.value);
              markDirty();
            }}
            placeholder="What else do you want to update?"
            className="w-full min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground disabled:opacity-60"
          />
          {!disabled && !otherText.trim() ? (
            <p className="text-label-sm text-error">Required before you can save.</p>
          ) : null}
        </div>
      ) : null}

      {selected.includes("mobile") ? (
        <div className="space-y-2 border-t border-outline-variant pt-3">
          <p className="text-body-md font-medium text-foreground">
            Is a mobile number already registered with your Aadhaar?
          </p>
          <div className="space-y-1.5">
            {MOBILE_REGISTERED_OPTIONS.map((opt) => {
              const flag = opt.value === "no" ? "mobile_not_registered" : opt.value === "registered_other" ? "mobile_registered_other" : null;
              const charge = flag ? extraCharges.find((c) => c.condition_key === flag) : undefined;
              const isChosen = mobileRegistered === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`block rounded-xl border p-3 transition-colors ${
                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  } ${isChosen ? "border-primary bg-primary-container/30" : "border-outline-variant bg-surface-container-lowest"}`}
                >
                  <span className="flex min-h-11 items-center gap-3">
                    <input
                      type="radio"
                      name="mobile_registered"
                      checked={isChosen}
                      disabled={disabled}
                      onChange={() => {
                        setMobileRegistered(opt.value);
                        markDirty();
                      }}
                      className="h-5 w-5 shrink-0 border-outline-variant accent-primary disabled:opacity-60"
                    />
                    <span className="text-body-md text-foreground">{opt.label}</span>
                    {charge ? (
                      <span className="ml-auto text-label-sm text-on-surface-variant whitespace-nowrap">
                        +₹{charge.amount}
                      </span>
                    ) : null}
                  </span>
                  {isChosen && opt.info ? (
                    <span className="mt-1 block space-y-0.5 rounded-lg bg-surface-container-lowest p-2">
                      {opt.info.map((line) => (
                        <span key={line} className="block text-label-sm text-on-surface-variant">
                          {line}
                        </span>
                      ))}
                      {charge ? (
                        <span className="block text-label-sm font-medium text-foreground">
                          Additional charge: ₹{charge.amount} ({charge.label})
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-outline-variant pt-3">
        <div>
          <p className="text-body-md font-medium text-foreground">How can we reach you?</p>
          <p className="text-label-sm text-on-surface-variant">
            We&rsquo;ll use this number for application and appointment updates.
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
            disabled={disabled}
            onChange={(e) => {
              setContactMobile(e.target.value);
              markDirty();
            }}
            placeholder="10-digit mobile number"
            className="w-full min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground disabled:opacity-60"
          />
        </div>
        <div className="space-y-1">
          <label className="text-label-sm text-on-surface-variant">Alternative mobile number (optional)</label>
          <input
            type="tel"
            value={contactAltMobile}
            disabled={disabled}
            onChange={(e) => {
              setContactAltMobile(e.target.value);
              markDirty();
            }}
            className="w-full min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground disabled:opacity-60"
          />
        </div>
        <div className="space-y-1">
          <label className="text-label-sm text-on-surface-variant">Email (optional)</label>
          <input
            type="email"
            value={contactEmail}
            disabled={disabled}
            onChange={(e) => {
              setContactEmail(e.target.value);
              markDirty();
            }}
            className="w-full min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground disabled:opacity-60"
          />
        </div>
      </div>

      {selected.length > 0 || preview.extras.length > 0 ? (
        <div className="space-y-1 rounded-xl bg-surface-container-lowest p-3">
          <div className="flex items-center justify-between text-body-md">
            <span className="text-on-surface-variant">Base service</span>
            <span className="text-foreground">₹{preview.base}</span>
          </div>
          {preview.extras.map((extra) => (
            <div key={extra.label} className="flex items-center justify-between text-body-md text-on-surface-variant">
              <span>{extra.label}</span>
              <span>₹{extra.amount}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-outline-variant pt-1.5 mt-1">
            <span className="text-body-md font-semibold text-foreground">Current total</span>
            <span className="text-headline-md font-semibold text-foreground">₹{preview.total}</span>
          </div>
          {neededDocs.length > 0 ? (
            <p className="text-label-sm text-on-surface-variant pt-1">
              Documents needed: {neededDocs.map((d) => d.name).join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {!disabled ? (
        saveState === "saved" && !dirty && !isPending ? (
          // Nothing left to do here -- no lingering clickable button next
          // to "Review & submit" further down the page. A subtle
          // confirmation is all this section needs once it's done its job;
          // editing anything again brings the button back.
          <p className="text-label-sm font-medium text-tertiary">✓ Saved just now</p>
        ) : (
          <div className="sticky bottom-20 md:static z-10 -mx-1 rounded-xl bg-surface-container-low/95 px-1 py-1 backdrop-blur md:mx-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
            {error ? (
              <p role="alert" className="mb-2 text-label-sm text-error">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={saveAndContinue}
              disabled={isPending}
              className="flex w-full md:w-auto min-h-11 items-center justify-center rounded-lg bg-primary px-6 text-label-lg font-medium text-on-primary disabled:opacity-60"
            >
              {isPending ? "Saving…" : saveState === "error" ? "Try again" : "Save & continue"}
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
