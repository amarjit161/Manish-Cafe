"use client";

import { useEffect, useState } from "react";

const INLINE_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * Renders a thumbnail + View/Download for one document via the secure
 * /api/admin/documents/[id] route -- the browser never touches R2 or the
 * Worker directly, here or in the full-size modal. "View" never triggers
 * a download: images open in an in-page modal (plain <img>, GET with
 * inline Content-Disposition), PDFs open in a new tab (browser's own
 * inline PDF viewer), and anything else shows a generic file icon with
 * only the explicit Download link (?download=1, which sets
 * Content-Disposition: attachment).
 */
export function AdminDocumentPreview({
  documentId,
  mimeType,
  documentName,
}: {
  documentId: string;
  mimeType: string;
  documentName: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [fullSizeFailed, setFullSizeFailed] = useState(false);
  const viewUrl = `/api/admin/documents/${documentId}`;
  const downloadUrl = `/api/admin/documents/${documentId}?download=1`;
  const isImage = INLINE_IMAGE_MIME_TYPES.includes(mimeType);
  const isPdf = mimeType === "application/pdf";

  useEffect(() => {
    if (!previewOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewOpen]);

  // The server-rendered <img> starts loading before hydration attaches
  // onError, so a fast failure (e.g. a 500 from the proxy route) can fire
  // and be missed entirely -- checking .complete/.naturalWidth as soon as
  // the ref mounts catches that already-failed state; onError below still
  // covers a failure that happens after mount.
  function checkAlreadyFailed(img: HTMLImageElement | null, onFail: () => void) {
    if (img && img.complete && img.naturalWidth === 0) onFail();
  }

  return (
    <div className="flex items-center gap-3">
      {isImage && !thumbnailFailed ? (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          aria-label={`Open preview of ${documentName}`}
          className="shrink-0 h-14 w-14 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low hover:border-primary transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(img) => checkAlreadyFailed(img, () => setThumbnailFailed(true))}
            src={viewUrl}
            alt={`Thumbnail of ${documentName}`}
            className="h-full w-full object-cover"
            onError={() => setThumbnailFailed(true)}
          />
        </button>
      ) : isImage ? (
        <span
          className="shrink-0 flex h-14 w-14 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low text-on-surface-variant"
          aria-hidden="true"
          title="Preview could not be loaded"
        >
          <span className="material-symbols-outlined text-[26px]">broken_image</span>
        </span>
      ) : (
        <span
          className="shrink-0 flex h-14 w-14 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low text-on-surface-variant"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[26px]">{isPdf ? "picture_as_pdf" : "description"}</span>
        </span>
      )}

      <div className="flex flex-col gap-1">
        {isImage ? (
          <button
            type="button"
            onClick={() => {
              setFullSizeFailed(false);
              setPreviewOpen(true);
            }}
            className="text-left text-label-sm text-primary underline underline-offset-2 w-fit"
          >
            View full size
          </button>
        ) : isPdf ? (
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-sm text-primary underline underline-offset-2 w-fit"
          >
            View
          </a>
        ) : (
          <span className="text-label-sm text-on-surface-variant italic">Preview unavailable</span>
        )}
        <a href={downloadUrl} className="text-label-sm text-primary underline underline-offset-2 w-fit">
          Download
        </a>
      </div>

      {previewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${documentName}`}
          onClick={() => setPreviewOpen(false)}
        >
          <div className="max-h-[90vh] max-w-[90vw] overflow-auto rounded-xl bg-surface-container-lowest p-3">
            {fullSizeFailed ? (
              <p
                className="flex h-40 w-64 max-w-full items-center justify-center text-center text-body-md text-on-surface-variant"
                onClick={(e) => e.stopPropagation()}
              >
                Preview could not be loaded. Try Download instead.
              </p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={(img) => checkAlreadyFailed(img, () => setFullSizeFailed(true))}
                src={viewUrl}
                alt={`Full-size preview of ${documentName}`}
                className="max-h-[80vh] max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
                onError={() => setFullSizeFailed(true)}
              />
            )}
            <button
              type="button"
              autoFocus
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
