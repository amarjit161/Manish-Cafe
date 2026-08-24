const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
};

function formatMaxSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `Maximum file size: ${mb % 1 === 0 ? mb : mb.toFixed(1)} MB`;
}

/**
 * Builds the "what to upload" checklist shown to a customer, entirely from
 * document_types columns that already exist (description, allowed_mime_types,
 * max_file_size_bytes) -- no hardcoded per-document-type copy anywhere, so
 * this works the same way for every service/document type without special
 * cases.
 */
export function buildDocumentGuidance(docType: {
  description: string | null;
  allowed_mime_types: string[];
  max_file_size_bytes: number;
}): string[] {
  const guidance: string[] = [];
  if (docType.description) guidance.push(docType.description);

  const formats = docType.allowed_mime_types.map((m) => MIME_LABELS[m] ?? m).join("/");
  if (formats) guidance.push(`Accepted formats: ${formats}`);

  guidance.push(formatMaxSize(docType.max_file_size_bytes));
  return guidance;
}
