"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationAnswers } from "@/lib/customer/actions";
import { AADHAAR_UPDATE_FIELDS } from "@/lib/applications/aadhaar-fields";

/**
 * Persists into applications.answers ({ update_fields, other_text }), the
 * same generic column isDocumentRequired() reads to decide whether
 * address_proof (or any other conditionally-required document) currently
 * applies. Selecting "Address" here is what turns Address Proof from
 * optional to required -- nothing about this is Aadhaar-specific in the
 * requirements engine itself, only this form's field list is.
 */
export function AadhaarUpdateFieldsForm({
  applicationId,
  initialFields,
  initialOtherText,
  disabled,
}: {
  applicationId: string;
  initialFields: string[];
  initialOtherText: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialFields);
  const [otherText, setOtherText] = useState(initialOtherText);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(nextSelected: string[], nextOtherText: string) {
    startTransition(async () => {
      const result = await updateApplicationAnswers(applicationId, nextSelected, nextOtherText);
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
    save(next, otherText);
  }

  function commitOtherText() {
    if (disabled || isPending) return;
    save(selected, otherText);
  }

  return (
    <div className="space-y-3 rounded-2xl bg-surface-container-low p-4">
      <p className="text-label-lg text-foreground">What do you want to update?</p>
      <div className="space-y-2">
        {AADHAAR_UPDATE_FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-body-md text-foreground">
            <input
              type="checkbox"
              checked={selected.includes(f.key)}
              disabled={disabled || isPending}
              onChange={() => toggle(f.key)}
              className="h-4 w-4 rounded border-outline-variant accent-primary disabled:opacity-60"
            />
            {f.label}
          </label>
        ))}
      </div>

      {selected.includes("other") ? (
        <div className="space-y-1 pl-6">
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
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground disabled:opacity-60"
          />
          {!disabled && !otherText.trim() ? (
            <p className="text-label-sm text-error">Required before you can submit your application.</p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-label-sm text-error">{error}</p> : null}
      {disabled ? (
        <p className="text-label-sm text-on-surface-variant">
          This can only be changed while the application is still a draft.
        </p>
      ) : null}
    </div>
  );
}
