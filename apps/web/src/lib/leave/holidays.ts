import { loadHolidayDates } from "@/lib/payroll/feeds/shared";

export async function loadLeaveHolidayDates(organizationId: string): Promise<string[]> {
  return loadHolidayDates(organizationId);
}
