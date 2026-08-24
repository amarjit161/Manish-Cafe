/**
 * Whether a service_document_types row is currently required, given the
 * application's answers. condition_key === null means the requirement is
 * unconditional (matches every existing row's pre-PR-6 behavior exactly).
 * When set, the requirement only applies if `answers.update_fields`
 * contains that key -- e.g. address_proof for an Aadhaar update is only
 * required when the customer selected "Address" as something to update.
 */
export function isDocumentRequired(
  conditionKey: string | null,
  isMandatory: boolean,
  answers: Record<string, unknown> | null | undefined,
): boolean {
  if (!conditionKey) return isMandatory;

  const updateFields = Array.isArray(answers?.update_fields) ? (answers!.update_fields as unknown[]) : [];
  return updateFields.includes(conditionKey);
}
