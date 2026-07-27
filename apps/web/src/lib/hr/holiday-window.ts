export const HOLIDAY_YEAR_WINDOW = 2;

export function getHolidayYearRange(baseYear = new Date().getFullYear()) {
  return {
    minYear: baseYear - HOLIDAY_YEAR_WINDOW,
    maxYear: baseYear + HOLIDAY_YEAR_WINDOW,
  };
}

export function getHolidayYearOptions(baseYear = new Date().getFullYear()) {
  const { minYear, maxYear } = getHolidayYearRange(baseYear);
  const years: number[] = [];
  for (let year = minYear; year <= maxYear; year += 1) {
    years.push(year);
  }
  return years;
}

export function isHolidayYearAllowed(year: number, baseYear = new Date().getFullYear()) {
  const { minYear, maxYear } = getHolidayYearRange(baseYear);
  return year >= minYear && year <= maxYear;
}

export function isHolidayDateAllowed(date: string, baseYear = new Date().getFullYear()) {
  const year = Number(date.slice(0, 4));
  if (!Number.isFinite(year)) return false;
  return isHolidayYearAllowed(year, baseYear);
}

export function holidayYearRangeMessage(baseYear = new Date().getFullYear()) {
  const { minYear, maxYear } = getHolidayYearRange(baseYear);
  return `Holidays can only be stored for ${minYear}–${maxYear}.`;
}
