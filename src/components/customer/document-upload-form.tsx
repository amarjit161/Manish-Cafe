"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const VARIANT_CLASSES: Record<"primary" | "secondary", string> = {
  primary: "bg-primary text-on-primary",
  secondary: "border border-outline-variant bg-surface-container-lowest text-primary",
};

export function DocumentUploadForm({
  applicationId,
  documentTypeId,
  label = "Choose file",
  variant = "primary",
  fullWidth = false,
}: {
  applicationId: string;
  documentTypeId: string;
  label?: string;
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
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

  return (
    <div className="space-y-1">
      <label
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-label-lg font-medium ${
          fullWidth ? "w-full" : ""
        } ${VARIANT_CLASSES[variant]} ${isPending ? "opacity-60" : "cursor-pointer"}`}
      >
        {isPending ? "Uploading…" : label}
        <input
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={handleChange}
          disabled={isPending}
        />
      </label>
      {error ? (
        <p role="alert" className="text-label-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
