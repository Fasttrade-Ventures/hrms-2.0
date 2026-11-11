export type AnalyticsPeriod = "month" | "6m" | "ytd";

export type AnalyticsFilterInput = {
  period: AnalyticsPeriod;
  branchId: string | null;
  departmentId: string | null;
};

export type PeriodRange = {
  start: Date;
  end: Date;
  months: string[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAnalyticsPeriod(raw: string | null | undefined): AnalyticsPeriod {
  if (raw === "month" || raw === "6m" || raw === "ytd") return raw;
  return "6m";
}

function ymd(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/** Inclusive calendar months for charts; start is first day of first month (UTC date). */
export function periodRange(period: AnalyticsPeriod, now: Date = new Date()): PeriodRange {
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const end = ymd(year, monthIndex + 1, 0);

  let startYear = year;
  let startMonth = monthIndex;
  if (period === "month") {
    startYear = year;
    startMonth = monthIndex;
  } else if (period === "6m") {
    const cursor = new Date(Date.UTC(year, monthIndex - 5, 1));
    startYear = cursor.getUTCFullYear();
    startMonth = cursor.getUTCMonth();
  } else {
    startYear = year;
    startMonth = 0;
  }

  const start = ymd(startYear, startMonth, 1);
  const months: string[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < year || (y === year && m <= monthIndex)) {
    months.push(monthKey(y, m));
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }

  return { start, end, months };
}

export function parseAnalyticsFilters(input: {
  period?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
}): AnalyticsFilterInput {
  const branchId = input.branchId?.trim() || null;
  const departmentId = input.departmentId?.trim() || null;
  return {
    period: parseAnalyticsPeriod(input.period),
    branchId: branchId && UUID_RE.test(branchId) ? branchId : null,
    departmentId: departmentId && UUID_RE.test(departmentId) ? departmentId : null,
  };
}

export function toMonthKey(isoDate: string): string | null {
  if (!isoDate || isoDate.length < 7) return null;
  return isoDate.slice(0, 7);
}
