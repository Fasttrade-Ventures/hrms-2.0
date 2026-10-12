import { describe, expect, it } from "vitest";
import {
  applyBehalfClaimSchema,
  applyBehalfLateSchema,
  applyBehalfLeaveSchema,
  applyBehalfListFilterSchema,
  applyBehalfOvertimeSchema,
  applyBehalfReplacementCreditSchema,
} from "@hrms/validation";
import { getBehalfApplicationPath } from "../../apps/web/src/lib/hr/apply-behalf-shared";

describe("Apply on Behalf Validation Schemas", () => {
  const dummyUuid1 = "11111111-1111-4111-8111-111111111111";
  const dummyUuid2 = "22222222-2222-4222-8222-222222222222";

  describe("applyBehalfClaimSchema", () => {
    it("validates standard claim input successfully", () => {
      const result = applyBehalfClaimSchema.safeParse({
        employeeId: dummyUuid1,
        claimTypeId: dummyUuid2,
        amount: "150.50",
        receiptDate: "2026-10-10",
        description: "Team lunch meeting",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe("150.50");
        expect(result.data.isMileage).toBe(false);
      }
    });

    it("validates mileage claim input successfully", () => {
      const result = applyBehalfClaimSchema.safeParse({
        employeeId: dummyUuid1,
        claimTypeId: dummyUuid2,
        amount: "80.00",
        receiptDate: "2026-10-10",
        isMileage: true,
        distanceKm: "100",
        ratePerKm: "0.80",
        origin: "HQ Office",
        destination: "Branch Office",
        description: "Client site audit",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isMileage).toBe(true);
        expect(result.data.origin).toBe("HQ Office");
        expect(result.data.destination).toBe("Branch Office");
      }
    });

    it("fails when required fields are missing", () => {
      const result = applyBehalfClaimSchema.safeParse({
        employeeId: "not-a-uuid",
        claimTypeId: dummyUuid2,
        amount: "",
        receiptDate: "invalid-date",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("applyBehalfOvertimeSchema", () => {
    it("validates overtime input with rate types (1.5, 2.0, 3.0)", () => {
      const res1 = applyBehalfOvertimeSchema.safeParse({
        employeeId: dummyUuid1,
        workDate: "2026-10-10",
        hours: "3.5",
        rateType: "1.5",
        reason: "Year end closing",
      });
      expect(res1.success).toBe(true);

      const res2 = applyBehalfOvertimeSchema.safeParse({
        employeeId: dummyUuid1,
        workDate: "2026-10-11",
        hours: "4.0",
        rateType: "2.0",
      });
      expect(res2.success).toBe(true);

      const res3 = applyBehalfOvertimeSchema.safeParse({
        employeeId: dummyUuid1,
        workDate: "2026-10-12",
        hours: "2.0",
        rateType: "3.0",
      });
      expect(res3.success).toBe(true);

      const invalidRate = applyBehalfOvertimeSchema.safeParse({
        employeeId: dummyUuid1,
        workDate: "2026-10-10",
        hours: "2.0",
        rateType: "4.0",
      });
      expect(invalidRate.success).toBe(false);
    });
  });

  describe("applyBehalfReplacementCreditSchema", () => {
    it("validates replacement credit input successfully", () => {
      const result = applyBehalfReplacementCreditSchema.safeParse({
        employeeId: dummyUuid1,
        workDate: "2026-10-10",
        creditDays: "1.0",
        description: "Worked on Saturday expo",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.creditDays).toBe("1.0");
      }
    });

    it("rejects invalid credit days", () => {
      const result = applyBehalfReplacementCreditSchema.safeParse({
        employeeId: dummyUuid1,
        workDate: "2026-10-10",
        creditDays: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("applyBehalfListFilterSchema", () => {
    it("accepts all 5 application types plus all", () => {
      for (const t of ["all", "leave", "late", "claim", "overtime", "replacement"] as const) {
        const result = applyBehalfListFilterSchema.safeParse({ type: t });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe(t);
        }
      }
    });
  });

  describe("getBehalfApplicationPath", () => {
    it("generates correct paths for HR and branch admin base paths", () => {
      expect(getBehalfApplicationPath("leave", "123", "/hr/apply-behalf")).toBe(
        "/hr/apply-behalf/leave/123",
      );
      expect(getBehalfApplicationPath("claim", "456", "/branch-admin/apply-behalf")).toBe(
        "/branch-admin/apply-behalf/claim/456",
      );
      expect(getBehalfApplicationPath("overtime", "789", "/branch-admin/apply-behalf")).toBe(
        "/branch-admin/apply-behalf/overtime/789",
      );
      expect(getBehalfApplicationPath("replacement", "999", "/branch-admin/apply-behalf")).toBe(
        "/branch-admin/apply-behalf/replacement/999",
      );
    });
  });
});
