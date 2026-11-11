import { createClient } from "@/lib/supabase/server";

import type { ComponentFlags } from "@hrms/domain";

export const EARNING_FLAGS: ComponentFlags = {
  isEpf: true,
  isSocso: true,
  isEis: true,
  isPcb: true,
  isHrdf: true,
};

export const REIMB_FLAGS: ComponentFlags = {
  isEpf: false,
  isSocso: false,
  isEis: false,
  isPcb: false,
  isHrdf: false,
};

export const DEDUCTION_FLAGS: ComponentFlags = {
  isEpf: false,
  isSocso: false,
  isEis: false,
  isPcb: false,
  isHrdf: false,
};

export type EmployeePayInput = {
  employeeId: string;
  joinDate: string;
  monthlyBasic: number;
  payBasis?: string;
  hourlyRate?: number | null;
  dailyRate?: number | null;
  otHourlyRate?: number | null;
};

export async function loadHolidayDates(organizationId: string): Promise<string[]> {
  const supabase = await createClient();
  const [{ data }, { data: org }] = await Promise.all([
    supabase.from("holidays").select("holiday_date").eq("organization_id", organizationId),
    supabase.from("organizations").select("country").eq("id", organizationId).maybeSingle(),
  ]);
  const dates = (data ?? []).map((row) => row.holiday_date as string);
  // Malaysia: if a PH falls on Sunday (KL/Selangor sat_sun), include Monday replacement
  // even when the source calendar omitted it.
  if ((org?.country ?? "MY") === "MY") {
    const { expandMalaysiaReplacementHolidayDates } = await import("@hrms/domain");
    return expandMalaysiaReplacementHolidayDates(dates, "sat_sun");
  }
  return dates;
}
