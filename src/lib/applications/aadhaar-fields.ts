/**
 * The single source of truth for Aadhaar update-field keys and their
 * human-readable labels -- both the customer checkbox form
 * (aadhaar-update-fields-form.tsx) and the admin detail page's "Requested
 * updates" summary read from this list, so relabeling or adding a field
 * only has to happen in one place.
 */
export const AADHAAR_UPDATE_FIELDS = [
  { key: "name", label: "Name" },
  { key: "dob", label: "Date of Birth" },
  { key: "gender", label: "Gender" },
  { key: "address", label: "Address" },
  { key: "mobile", label: "Mobile Number" },
  { key: "email", label: "Email" },
  { key: "other", label: "Other" },
] as const;

const LABEL_BY_KEY = new Map(AADHAAR_UPDATE_FIELDS.map((f) => [f.key, f.label]));

/**
 * Renders applications.answers into the same plain-language summary for
 * both the customer form's own state and the admin's read-only view --
 * e.g. "Address, Other (Fix spelling in father's name)".
 */
export function formatRequestedUpdates(answers: Record<string, unknown> | null | undefined): string[] {
  const updateFields = Array.isArray(answers?.update_fields) ? (answers!.update_fields as unknown[]) : [];
  const otherText = typeof answers?.other_text === "string" ? answers!.other_text : "";

  return updateFields
    .filter((key): key is string => typeof key === "string")
    .map((key) => {
      const label = LABEL_BY_KEY.get(key as (typeof AADHAAR_UPDATE_FIELDS)[number]["key"]) ?? key;
      return key === "other" && otherText ? `${label} (${otherText})` : label;
    });
}
