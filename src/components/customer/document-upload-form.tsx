"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DocumentUploadForm({
  applicationId,
  documentTypeId,
}: {
  applicationId: string;
  documentTypeId: string;
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
          setError(body.error ?? "Upload failed. Please try again.");
          return;
        }
        router.refresh();
      } catch {
        setError("Upload failed. Please check your connection and try again.");
      }
    });
  }

  return (
    <div className="space-y-1">
      <label
        className={`inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-label-sm text-primary ${
          isPending ? "opacity-60" : "cursor-pointer hover:bg-surface-container-low"
        }`}
      >
        {isPending ? "Uploading…" : "Upload"}
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
