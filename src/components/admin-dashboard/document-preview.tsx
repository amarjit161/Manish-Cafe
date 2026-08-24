"use client";

import { useState } from "react";

const INLINE_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * Renders View/Download for one document via the secure
 * /api/admin/documents/[id] route -- the browser never touches R2 or the
 * Worker directly. "View" never triggers a download: images open in an
 * in-page modal (plain <img>, GET with inline Content-Disposition),
 * PDFs open in a new tab (browser's own inline PDF viewer), and anything
 * else shows "Preview unavailable" with only the explicit Download link
 * (?download=1, which sets Content-Disposition: attachment).
 */
export function AdminDocumentPreview({ documentId, mimeType }: { documentId: string; mimeType: string }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const viewUrl = `/api/admin/documents/${documentId}`;
  const downloadUrl = `/api/admin/documents/${documentId}?download=1`;
  const isImage = INLINE_IMAGE_MIME_TYPES.includes(mimeType);
  const isPdf = mimeType === "application/pdf";

  return (
    <div className="flex items-center gap-2">
      {isImage ? (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="text-label-sm text-primary underline underline-offset-2"
        >
          View
        </button>
      ) : isPdf ? (
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-label-sm text-primary underline underline-offset-2"
        >
          View
        </a>
      ) : (
        <span className="text-label-sm text-on-surface-variant italic">Preview unavailable</span>
      )}
      <a href={downloadUrl} className="text-label-sm text-primary underline underline-offset-2">
        Download
      </a>

      {previewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewOpen(false)}
        >
          <div className="max-h-[90vh] max-w-[90vw] overflow-auto rounded-xl bg-surface-container-lowest p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewUrl}
              alt="Document preview"
              className="max-h-[80vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="mt-2 w-full rounded-lg bg-surface-container-high py-2 text-label-sm text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
