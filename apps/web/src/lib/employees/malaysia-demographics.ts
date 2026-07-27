/** Common race/ethnicity options used on Malaysian HR forms. */
export const MALAYSIAN_RACE_OPTIONS = [
  "Malay",
  "Chinese",
  "Indian",
  "Bumiputera Sabah",
  "Bumiputera Sarawak",
  "Orang Asli",
  "Other",
] as const;

/** Common religion options used on Malaysian HR forms. */
export const MALAYSIAN_RELIGION_OPTIONS = [
  "Islam",
  "Buddhism",
  "Christianity",
  "Hinduism",
  "Sikhism",
  "Taoism",
  "Confucianism",
  "Other",
  "No religion",
] as const;

/** Malaysian states and federal territories for address forms. */
export const MALAYSIAN_STATE_OPTIONS = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Wilayah Persekutuan Kuala Lumpur",
  "Wilayah Persekutuan Labuan",
  "Wilayah Persekutuan Putrajaya",
] as const;

export function withCurrentDemographicsOption(
  options: readonly string[],
  currentValue?: string | null,
): string[] {
  const normalized = currentValue?.trim();
  if (normalized && !options.includes(normalized)) {
    return [...options, normalized];
  }
  return [...options];
}
