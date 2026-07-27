import { toMycalStateCode } from "@/lib/hr/malaysia-state-codes";

const MYCAL_API_BASE =
  process.env.MYCAL_API_BASE_URL ?? "https://mycal-api.huijun00100101.workers.dev";

type MycalHoliday = {
  id: string;
  date: string;
  name: { en?: string; ms?: string; zh?: string };
  status: string;
  isPublicHoliday?: boolean;
};

type MycalHolidaysResponse = {
  data?: MycalHoliday[];
  meta?: { total?: number; year?: number; state?: string };
};

export type FetchedMalaysiaHoliday = {
  name: string;
  holidayDate: string;
};

function holidayDisplayName(name: MycalHoliday["name"]): string {
  return name.en?.trim() || name.ms?.trim() || name.zh?.trim() || "Public holiday";
}

export function mergeHolidayNames(existing: string, incoming: string): string {
  if (existing === incoming) return existing;
  const parts = new Set(
    `${existing} · ${incoming}`
      .split(" · ")
      .map((part) => part.trim())
      .filter(Boolean),
  );
  return [...parts].join(" · ");
}

function groupHolidaysByDate(
  rows: Array<{ name: string; holidayDate: string }>,
): FetchedMalaysiaHoliday[] {
  const byDate = new Map<string, FetchedMalaysiaHoliday>();

  for (const row of rows) {
    const current = byDate.get(row.holidayDate);
    if (!current) {
      byDate.set(row.holidayDate, row);
      continue;
    }

    byDate.set(row.holidayDate, {
      holidayDate: row.holidayDate,
      name: mergeHolidayNames(current.name, row.name),
    });
  }

  return [...byDate.values()].sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));
}

export async function fetchMalaysiaHolidaysForState(
  stateLabel: string,
  year: number,
): Promise<FetchedMalaysiaHoliday[]> {
  const stateCode = toMycalStateCode(stateLabel);
  if (!stateCode) {
    throw new Error(`Unsupported state for holiday import: ${stateLabel}`);
  }

  const url = new URL("/v1/holidays", MYCAL_API_BASE);
  url.searchParams.set("year", String(year));
  url.searchParams.set("state", stateCode);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    throw new Error(`Holiday API returned ${response.status}. Try again later.`);
  }

  const payload = (await response.json()) as MycalHolidaysResponse;
  const rows = payload.data ?? [];

  const normalized = rows
    .filter((row) => row.isPublicHoliday !== false && row.status === "confirmed")
    .map((row) => ({
      name: holidayDisplayName(row.name),
      holidayDate: row.date,
    }));

  return groupHolidaysByDate(normalized);
}
