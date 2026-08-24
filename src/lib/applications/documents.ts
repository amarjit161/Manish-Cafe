/**
 * Splits a flat list of application_documents rows (which can contain
 * multiple rows per document_type_id -- every re-upload keeps the old row
 * for audit history, see the pr6 migration) into one "current" row per
 * type plus the rest as read-only history. Nothing in the UI should ever
 * offer review actions (approve/reject/request re-upload) on a historical
 * row -- only the current one is live.
 */
export function groupDocumentsByType<T extends { document_type_id: string; uploaded_at: string }>(
  documents: T[],
): Map<string, { current: T; history: T[] }> {
  const byType = new Map<string, T[]>();
  for (const doc of documents) {
    const list = byType.get(doc.document_type_id) ?? [];
    list.push(doc);
    byType.set(doc.document_type_id, list);
  }

  const result = new Map<string, { current: T; history: T[] }>();
  for (const [typeId, list] of byType) {
    const sorted = [...list].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    result.set(typeId, { current: sorted[0], history: sorted.slice(1) });
  }
  return result;
}
