/**
 * The single source of truth for Aadhaar update-field keys and their
 * human-readable labels -- both the customer checkbox form
 * (aadhaar-update-fields-form.tsx) and the admin detail page's "Requested
 * updates" summary read from this list, so relabeling or adding a field
 * only has to happen in one place.
 */
export const AADHAAR_UPDATE_FIELDS = [
  { key: "name", label: "Name" },
  { key: "father_name", label: "Father's Name" },
  { key: "mother_name", label: "Mother's Name" },
  { key: "spouse_name", label: "Husband/Wife Name" },
  { key: "dob", label: "Date of Birth" },
  { key: "gender", label: "Gender" },
  { key: "mobile", label: "Mobile Number" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
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

export type MobileRegisteredAnswer = "yes" | "no" | "unknown" | "registered_other";

export const MOBILE_REGISTERED_OPTIONS: {
  value: MobileRegisteredAnswer;
  label: string;
  info?: string[];
}[] = [
  { value: "yes", label: "Yes" },
  {
    value: "no",
    label: "No",
    info: [
      "No mobile number is registered with your Aadhaar.",
      "Additional assistance may be required to complete this service.",
    ],
  },
  {
    value: "unknown",
    label: "I don't know",
    info: ["That's okay. You don't need to know right now.", "We can help confirm what is required during processing."],
  },
  {
    value: "registered_other",
    label: "I know a number is registered, but it isn't my current number",
    info: ["You may need to update the mobile number linked to your Aadhaar."],
  },
];

/**
 * The mapping from a specific answer VALUE to the generic "flags" array
 * that both the client-side price preview (computePriceBreakdown) and the
 * server-side price snapshot (change_application_status(), via the same
 * flags array) read -- one small mapping, reused by both, so a flag never
 * means something different in two places.
 */
export function deriveAnswerFlags(answers: { mobile_registered?: MobileRegisteredAnswer }): string[] {
  const flags: string[] = [];
  if (answers.mobile_registered === "no") flags.push("mobile_not_registered");
  if (answers.mobile_registered === "registered_other") flags.push("mobile_registered_other");
  return flags;
}
