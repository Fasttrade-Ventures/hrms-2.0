import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireRole: vi.fn(),
  requireRoleOrPermission: vi.fn(() => ({ user: { id: "user-1" } })),
}));

vi.mock("@/lib/entitlements", () => ({
  requireModule: vi.fn(),
}));

vi.mock("@/lib/hr/payroll", () => ({
  lockPayrun: vi.fn(),
}));

vi.mock("@/lib/payroll/compensation", () => ({
  deleteRecurringAllowance: vi.fn(),
  setEmployeePcbManualAmount: vi.fn(),
  setYtdOpeningBalance: vi.fn(),
  upsertEmployeeCompensation: vi.fn(),
  upsertEmployeeTaxProfile: vi.fn(),
  upsertRecurringAllowance: vi.fn(),
}));

vi.mock("@/lib/payroll/edit", () => ({
  overridePayrunPcb: vi.fn(),
}));

vi.mock("@/lib/payroll/generate", () => ({
  generateDraftPayrun: vi.fn(),
}));

vi.mock("@/lib/payroll/workflow", () => ({
  approvePayrun: vi.fn(),
  deletePayrun: vi.fn(),
  submitPayrunForReview: vi.fn(),
}));

import {
  overridePayrunPcbAction,
  setEmployeePcbManualAmountAction,
} from "@/app/(hr)/hr/payroll/actions";
import { setEmployeePcbManualAmount } from "@/lib/payroll/compensation";
import { overridePayrunPcb } from "@/lib/payroll/edit";

describe("PCB action amount validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["", "   ", "not-a-number"])(
    "rejects profile manual amount %j without persisting it",
    async (amount) => {
      const formData = new FormData();
      formData.set("employeeId", "employee-1");
      formData.set("pcbMode", "manual");
      formData.set("pcbManualAmount", amount);

      const result = await setEmployeePcbManualAmountAction({}, formData);

      expect(result.error).toMatch(/Enter a .*PCB amount/i);
      expect(setEmployeePcbManualAmount).not.toHaveBeenCalled();
    },
  );

  it.each(["", "   ", "not-a-number"])(
    "rejects draft manual amount %j without persisting it",
    async (amount) => {
      const formData = new FormData();
      formData.set("payrunItemId", "item-1");
      formData.set("pcbMode", "manual");
      formData.set("amount", amount);

      const result = await overridePayrunPcbAction({}, formData);

      expect(result.error).toMatch(/Enter a .*PCB amount/i);
      expect(overridePayrunPcb).not.toHaveBeenCalled();
    },
  );
});
