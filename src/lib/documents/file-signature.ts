/**
 * Server-side file validation. Never trust a browser-reported file.type
 * alone -- it's just whatever the client claims. This checks the claimed
 * type against the file's actual leading bytes (magic numbers) and against
 * its extension, on top of whatever document_types.allowed_mime_types says.
 *
 * Only these three formats are ever accepted, full stop -- there is no
 * path to upload anything else, regardless of what a service's
 * document_types configuration might otherwise claim to allow.
 */

type Signature = { bytes: number[]; offset?: number };

const SIGNATURES: Record<string, Signature[]> = {
  "application/pdf": [{ bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }], // %PDF-
  "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
};

const EXTENSION_TO_MIME: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
};

export const SUPPORTED_MIME_TYPES = Object.keys(SIGNATURES);

export function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function extensionMatchesMimeType(filename: string, mimeType: string): boolean {
  const ext = getExtension(filename);
  const allowed = EXTENSION_TO_MIME[ext];
  return !!allowed && allowed.includes(mimeType);
}

export function matchesFileSignature(mimeType: string, bytes: Uint8Array): boolean {
  const signatures = SIGNATURES[mimeType];
  if (!signatures) return false;

  return signatures.some((sig) => {
    const offset = sig.offset ?? 0;
    if (bytes.length < offset + sig.bytes.length) return false;
    return sig.bytes.every((byte, i) => bytes[offset + i] === byte);
  });
}

/**
 * Safe extension to use in the R2 object key -- derived from a fixed
 * allowlist keyed by the *validated* mime type, never from the client's
 * original filename string directly.
 */
export function safeExtensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    default:
      return "bin";
  }
}
