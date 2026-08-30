"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const VARIANT_CLASSES: Record<"primary" | "secondary", string> = {
  primary: "bg-primary text-on-primary",
  secondary: "border border-outline-variant bg-surface-container-lowest text-primary",
};

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export function DocumentUploadForm({
  applicationId,
  documentTypeId,
  label = "Choose file",
  variant = "primary",
  fullWidth = false,
  dropzone,
}: {
  applicationId: string;
  documentTypeId: string;
  label?: string;
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  /** Renders the whole control as a dashed-border tap-to-upload dropzone (for the "no document uploaded yet" state) instead of a pill button. `guidance` is the small helper text shown under the label. */
  dropzone?: { guidance?: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("applicationId", applicationId);
    formData.append("documentTypeId", documentTypeId);

    startTransition(async () => {
      try {
        const res = await fetch("/api/customer/documents/upload", {
          method: "POST",
          body: formData,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body.error ?? "We couldn't upload your document. Please try again.");
          return;
        }
        router.refresh();
      } catch {
        setError("We couldn't upload your document. Please check your connection and try again.");
      }
    });
  }

  if (dropzone) {
    return (
      <div className="space-y-1">
        <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low px-4 py-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-[20px]">{isPending ? "hourglass_top" : "add_a_photo"}</span>
          </span>
          <span className="text-label-lg font-medium text-primary">{isPending ? "Uploading…" : label}</span>
          {dropzone.guidance ? <span className="text-label-sm text-on-surface-variant">{dropzone.guidance}</span> : null}
          <input type="file" className="hidden" accept={ACCEPT} onChange={handleChange} disabled={isPending} />
        </label>
        {error ? (
          <p role="alert" className="text-label-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-label-lg font-medium ${
          fullWidth ? "w-full sm:w-auto" : ""
        } ${VARIANT_CLASSES[variant]} ${isPending ? "opacity-60" : "cursor-pointer"}`}
      >
        {isPending ? "Uploading…" : label}
        <input type="file" className="hidden" accept={ACCEPT} onChange={handleChange} disabled={isPending} />
      </label>
      {error ? (
        <p role="alert" className="text-label-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
