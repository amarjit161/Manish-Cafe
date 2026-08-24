export type ExtraCharge = { label: string; amount: number };

/**
 * Computes the live price breakdown (base + applicable extra charges) from
 * a service's configured service_extra_charges and the application's
 * current answers -- the same array-membership check
 * isDocumentRequired()/service_document_types.condition_key already uses,
 * just applied to answers.flags instead of answers.update_fields. This is
 * the ONLY place price is computed client-side; the final snapshot at
 * submission is computed independently, server-side, inside
 * change_application_status() so a customer can never submit at a price
 * they didn't actually see.
 */
export function computePriceBreakdown(params: {
  basePrice: number;
  answers: Record<string, unknown> | null | undefined;
  extraCharges: { condition_key: string; label: string; amount: number }[];
}): { base: number; extras: ExtraCharge[]; total: number } {
  const flags = Array.isArray(params.answers?.flags) ? (params.answers!.flags as unknown[]) : [];
  const extras = params.extraCharges
    .filter((c) => flags.includes(c.condition_key))
    .map((c) => ({ label: c.label, amount: c.amount }));

  const total = params.basePrice + extras.reduce((sum, e) => sum + e.amount, 0);
  return { base: params.basePrice, extras, total };
}
