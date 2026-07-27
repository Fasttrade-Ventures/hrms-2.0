import { MALAYSIAN_STATE_OPTIONS } from "@/lib/employees/malaysia-demographics";

/** Maps HRMS state labels to MyCal API state codes. */
export const MALAYSIAN_STATE_TO_MYCAL_CODE: Record<string, string> = {
  Johor: "johor",
  Kedah: "kedah",
  Kelantan: "kelantan",
  Melaka: "melaka",
  "Negeri Sembilan": "negeri-sembilan",
  Pahang: "pahang",
  Perak: "perak",
  Perlis: "perlis",
  "Pulau Pinang": "pulau-pinang",
  Sabah: "sabah",
  Sarawak: "sarawak",
  Selangor: "selangor",
  Terengganu: "terengganu",
  "Wilayah Persekutuan Kuala Lumpur": "kuala-lumpur",
  "Wilayah Persekutuan Labuan": "wp-labuan",
  "Wilayah Persekutuan Putrajaya": "wp-putrajaya",
};

export function toMycalStateCode(state: string | null | undefined): string | null {
  if (!state?.trim()) return null;
  return MALAYSIAN_STATE_TO_MYCAL_CODE[state.trim()] ?? null;
}

export function isValidMalaysianState(state: string | null | undefined): boolean {
  if (!state?.trim()) return false;
  return (MALAYSIAN_STATE_OPTIONS as readonly string[]).includes(state.trim());
}
