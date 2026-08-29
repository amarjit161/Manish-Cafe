"use client";

import { useState } from "react";

/**
 * Both the thumbnail and the full preview load through
 * /api/customer/documents/[id] -- an authenticated, RLS-scoped route, not
 * a public storage URL. The browser never learns the R2 object key or any
 * direct storage endpoint.
 */
export function DocumentThumbnail({
  documentId,
  isImage,
  filename,
  onOpen,
}: {
  documentId: string;
  isImage: boolean;
  filename: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest"
      aria-label={`Preview ${filename}`}
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- authenticated same-origin route, not a static asset Next can optimize
        <img src={`/api/customer/documents/${documentId}`} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="material-symbols-outlined text-[28px] text-on-surface-variant">description</span>
      )}
    </button>
  );
}

/**
 * The single client island a DocumentReviewCard (a server component)
 * mounts for preview -- owns its own open/closed state so the rest of the
 * card can stay server-rendered.
 */
export function DocumentPreviewTrigger({
  documentId,
  isImage,
  filename,
}: {
  documentId: string;
  isImage: boolean;
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DocumentThumbnail documentId={documentId} isImage={isImage} filename={filename} onOpen={() => setOpen(true)} />
      {open ? (
        <DocumentPreviewModal documentId={documentId} isImage={isImage} filename={filename} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function DocumentPreviewModal({
  documentId,
  isImage,
  filename,
  onClose,
}: {
  documentId: string;
  isImage: boolean;
  filename: string;
  onClose: () => void;
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const src = `/api/customer/documents/${documentId}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${filename}`}
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface-container-lowest"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-outline-variant p-3">
          <p className="truncate text-body-md font-medium text-foreground">{filename}</p>
          <button type="button" onClick={onClose} aria-label="Close preview" className="p-1 text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-surface-container-low p-2">
          {loadFailed ? (
            <p className="p-6 text-center text-body-md text-on-surface-variant">
              We couldn&rsquo;t load this preview. Try again in a moment.
            </p>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={filename} className="mx-auto max-h-[70vh] w-auto object-contain" onError={() => setLoadFailed(true)} />
          ) : (
            <iframe src={src} title={filename} className="h-[70vh] w-full rounded-lg" onError={() => setLoadFailed(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
