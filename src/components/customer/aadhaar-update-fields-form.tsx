"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationAnswers } from "@/lib/customer/actions";

const FIELDS = [
  { key: "name", label: "Name" },
  { key: "dob", label: "Date of Birth" },
  { key: "gender", label: "Gender" },
  { key: "address", label: "Address" },
  { key: "mobile", label: "Mobile Number" },
  { key: "email", label: "Email" },
  { key: "other", label: "Other" },
];

/**
 * Persists into applications.answers.update_fields, the same generic
 * column isDocumentRequired() reads to decide whether address_proof (or
 * any other conditionally-required document) currently applies. Selecting
 * "Address" here is what turns Address Proof from optional to required.
 */
export function AadhaarUpdateFieldsForm({
  applicationId,
  initialFields,
  disabled,
}: {
  applicationId: string;
  initialFields: string[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialFields);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(key: string) {
    if (disabled || isPending) return;
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    setSelected(next);
    startTransition(async () => {
      const result = await updateApplicationAnswers(applicationId, next);
      if (result?.error) {
        setError(result.error);
        setSelected(selected);
      } else {
        setError(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2 rounded-2xl bg-surface-container-low p-4">
      <p className="text-label-lg text-foreground">What do you want to update?</p>
      <div className="flex flex-wrap gap-2">
        {FIELDS.map((f) => (
          <button
            key={f.key}
            type="button"
            disabled={disabled || isPending}
            onClick={() => toggle(f.key)}
            className={`rounded-full px-3 py-1.5 text-label-sm border transition-colors disabled:opacity-60 ${
              selected.includes(f.key)
                ? "bg-primary text-on-primary border-primary"
                : "bg-surface-container-lowest text-foreground border-outline-variant"
            }`}
          >
            {f.label}
          </button>
        ))}
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
