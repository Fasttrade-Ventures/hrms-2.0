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
};

export async function loadHolidayDates(organizationId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holidays")
    .select("holiday_date")
    .eq("organization_id", organizationId);
  return (data ?? []).map((row) => row.holiday_date);
}
