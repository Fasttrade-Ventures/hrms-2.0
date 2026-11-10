/**
 * Australian public holidays for 2026, stored as data. Nothing is fetched at runtime.
 *
 * Sources (checked against each other, all for 2026):
 * - Fair Work Ombudsman, 2026 public holidays by state and territory:
 *   https://www.fairwork.gov.au/employment-conditions/public-holidays/2026-public-holidays
 * - Fair Work Ombudsman, Easter public holidays 2026:
 *   https://www.fairwork.gov.au/newsroom/news/easter-public-holidays
 * - Western Australia: https://www.wa.gov.au/service/employment/workplace-arrangements/public-holidays-western-australia
 * - Tasmania: https://worksafe.tas.gov.au/topics/laws-and-compliance/public-holidays
 * - Victoria: https://business.vic.gov.au/business-information/public-holidays/victorian-public-holidays-2026
 *
 * Only state-wide days are listed. Regional and local days (for example Melbourne Cup,
 * Royal Queensland Show, Royal Hobart Regatta, Picnic Day, Reconciliation Day, Western
 * Australia Day, Adelaide Cup Day, Friday before the AFL Grand Final) are not loaded here.
 */

export const AUSTRALIAN_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;
export type AustralianState = (typeof AUSTRALIAN_STATES)[number];

export type AustralianHoliday = { holidayDate: string; name: string };

export type HolidayRowKey = {
  branchId: string | null;
  holidayDate: string;
  name: string;
};

/** Message the holiday screen shows when the branch has no Australian state. */
export const SET_BRANCH_STATE_FIRST = "Set the branch state first.";

/** National public holidays. Every state and territory observes these dates. */
const NATIONAL_2026: readonly AustralianHoliday[] = [
  { holidayDate: "2026-01-01", name: "New Year's Day" },
  { holidayDate: "2026-01-26", name: "Australia Day" },
  { holidayDate: "2026-04-03", name: "Good Friday" },
  { holidayDate: "2026-04-06", name: "Easter Monday" },
  { holidayDate: "2026-04-25", name: "Anzac Day" },
  { holidayDate: "2026-12-25", name: "Christmas Day" },
  { holidayDate: "2026-12-26", name: "Boxing Day" },
  { holidayDate: "2026-12-28", name: "Boxing Day holiday" },
];

/**
 * Anzac Day falls on Saturday 25 April 2026. Only these jurisdictions add Monday
 * 27 April (Fair Work Ombudsman, ACT, NSW and WA lists). VIC, QLD, SA, TAS and NT do not.
 */
const ANZAC_DAY_HOLIDAY_2026: AustralianHoliday = {
  holidayDate: "2026-04-27",
  name: "Anzac Day holiday",
};
const ANZAC_DAY_HOLIDAY_STATES: readonly AustralianState[] = ["NSW", "WA", "ACT"];

/** Easter Saturday (2026-04-04). WA and TAS do not observe it. */
const EASTER_SATURDAY_2026: AustralianHoliday = { holidayDate: "2026-04-04", name: "Easter Saturday" };
const EASTER_SATURDAY_STATES: readonly AustralianState[] = ["NSW", "VIC", "QLD", "SA", "NT", "ACT"];

const STATE_DAYS_2026: Record<AustralianState, readonly AustralianHoliday[]> = {
  NSW: [
    { holidayDate: "2026-06-08", name: "King's Birthday" },
    { holidayDate: "2026-10-05", name: "Labour Day" },
  ],
  VIC: [
    { holidayDate: "2026-03-09", name: "Labour Day" },
    { holidayDate: "2026-06-08", name: "King's Birthday" },
  ],
  QLD: [
    { holidayDate: "2026-05-04", name: "Labour Day" },
    { holidayDate: "2026-10-05", name: "King's Birthday" },
  ],
  SA: [
    { holidayDate: "2026-06-08", name: "King's Birthday" },
    { holidayDate: "2026-10-05", name: "Labour Day" },
  ],
  WA: [
    { holidayDate: "2026-03-02", name: "Labour Day" },
    { holidayDate: "2026-09-28", name: "King's Birthday" },
  ],
  TAS: [
    { holidayDate: "2026-03-09", name: "Eight Hours Day" },
    { holidayDate: "2026-06-08", name: "King's Birthday" },
  ],
  NT: [
    { holidayDate: "2026-05-04", name: "May Day" },
    { holidayDate: "2026-06-08", name: "King's Birthday" },
  ],
  ACT: [
    { holidayDate: "2026-03-09", name: "Canberra Day" },
    { holidayDate: "2026-06-08", name: "King's Birthday" },
    { holidayDate: "2026-10-05", name: "Labour Day" },
  ],
};

const STATE_NAMES: Record<string, AustralianState> = {
  "NEW SOUTH WALES": "NSW",
  VICTORIA: "VIC",
  QUEENSLAND: "QLD",
  "SOUTH AUSTRALIA": "SA",
  "WESTERN AUSTRALIA": "WA",
  TASMANIA: "TAS",
  "NORTHERN TERRITORY": "NT",
  "AUSTRALIAN CAPITAL TERRITORY": "ACT",
};

/** Maps a branch state value (code or full name) to an Australian state code, or null. */
export function normalizeAustralianState(value: string | null | undefined): AustralianState | null {
  const cleaned = (value ?? "").trim().toUpperCase();
  if (!cleaned) return null;
  if ((AUSTRALIAN_STATES as readonly string[]).includes(cleaned)) return cleaned as AustralianState;
  return STATE_NAMES[cleaned] ?? null;
}

/** National plus state or territory public holidays for 2026, sorted by date. */
export function australianHolidays2026(state: AustralianState): AustralianHoliday[] {
  const rows: AustralianHoliday[] = [...NATIONAL_2026, ...STATE_DAYS_2026[state]];
  if (ANZAC_DAY_HOLIDAY_STATES.includes(state)) rows.push(ANZAC_DAY_HOLIDAY_2026);
  if (EASTER_SATURDAY_STATES.includes(state)) rows.push(EASTER_SATURDAY_2026);
  return rows
    .map((row) => ({ ...row }))
    .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));
}

/**
 * Returns the incoming rows that are not already stored, so loading twice adds nothing.
 * A row is a duplicate when the branch, date and name match. The `holidays` table also has
 * a unique index on branch and date, so a date the branch already has under another name
 * is skipped too. Duplicates inside `incoming` are collapsed.
 */
export function holidayRowsToInsert<T extends HolidayRowKey>(
  existing: readonly HolidayRowKey[],
  incoming: readonly T[],
): T[] {
  const taken = new Set<string>();
  for (const row of existing) {
    taken.add(`${row.branchId ?? ""}|${row.holidayDate}`);
  }

  const result: T[] = [];
  for (const row of incoming) {
    const key = `${row.branchId ?? ""}|${row.holidayDate}`;
    if (taken.has(key)) continue;
    taken.add(key);
    result.push(row);
  }
  return result;
}
