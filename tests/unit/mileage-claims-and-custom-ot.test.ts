import { describe, expect, it } from "vitest";
import { computeOtPay, money } from "@hrms/domain";
import { claimRequestSchema, createClaimTypeSchema } from "@hrms/validation";
import { aggregateOtPayByEmployee } from "../../apps/web/src/lib/payroll/feeds/overtime";
import { summarizeApprovalPayload } from "../../apps/web/src/lib/approvals/inbox";

describe("Custom Overtime Hourly Rates", () => {
  it("calculates overtime pay using custom hourly rate override", () => {
    // Basic RM 5,200/month, custom OT rate RM 30/hour, 2 hours @ 1.5x
    // Custom OT pay = 30 * 1.5 * 2 = RM 90.00
    const pay = computeOtPay(2, 1.5, money(5200), 26, money(30));
    expect(pay.toNumber()).toBe(90.00);
  });

  it("calculates rest day (2.0x) and public holiday (3.0x) OT with custom rate", () => {
    // Custom rate RM 25/hour, 4 hours on rest day (2.0x) = 25 * 2.0 * 4 = RM 200.00
    expect(computeOtPay(4, 2.0, money(5200), 26, money(25)).toNumber()).toBe(200.00);

    // Custom rate RM 25/hour, 3 hours on public holiday (3.0x) = 25 * 3.0 * 3 = RM 225.00
    expect(computeOtPay(3, 3.0, money(5200), 26, money(25)).toNumber()).toBe(225.00);
  });

  it("falls back to standard basic salary formula when custom rate is not set or null", () => {
    // Standard EA formula: 5200 / 26 * 2 * 1.5 = 600.00
    expect(computeOtPay(2, 1.5, money(5200), 26, null).toNumber()).toBe(600.00);
    expect(computeOtPay(2, 1.5, money(5200), 26, undefined).toNumber()).toBe(600.00);
  });

  it("aggregates OT pay across employees with and without overrides in payroll feed", () => {
    const employees = [
      {
        employeeId: "emp-standard",
        joinDate: "2026-01-01",
        monthlyBasic: 5200,
        otHourlyRate: null,
      },
      {
        employeeId: "emp-custom",
        joinDate: "2026-01-01",
        monthlyBasic: 5200,
        otHourlyRate: 35, // RM35/hr override
      },
    ];

    const rows = [
      { employee_id: "emp-standard", hours: 2, rate_type: "1.5" },
      { employee_id: "emp-custom", hours: 2, rate_type: "1.5" },
    ];

    const aggregated = aggregateOtPayByEmployee(rows, employees);

    // Standard: 5200 / 26 * 2 * 1.5 = 600.00
    expect(aggregated.get("emp-standard")).toBe(600.00);

    // Custom: 35 * 1.5 * 2 = 105.00
    expect(aggregated.get("emp-custom")).toBe(105.00);
  });
});

describe("Mileage Claims Schema & Calculations", () => {
  it("validates claim type schema with mileage configuration", () => {
    const validMileageType = createClaimTypeSchema.safeParse({
      name: "Mileage (Car)",
      isMileage: true,
      ratePerKm: "0.80",
      payrollTreatment: "reimbursement",
    });

    expect(validMileageType.success).toBe(true);
    if (validMileageType.success) {
      expect(validMileageType.data.isMileage).toBe(true);
      expect(validMileageType.data.ratePerKm).toBe(0.80);
      expect(validMileageType.data.payrollTreatment).toBe("reimbursement");
    }
  });

  it("validates claim request schema with trip and mileage fields", () => {
    const validClaim = claimRequestSchema.safeParse({
      claimTypeId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      amount: "80.00",
      receiptDate: "2026-10-05",
      isMileage: true,
      distanceKm: "100",
      ratePerKm: "0.80",
      origin: "HQ Kuala Lumpur",
      destination: "Site Cyberjaya",
      description: "Client on-site inspection",
    });

    expect(validClaim.success).toBe(true);
    if (validClaim.success) {
      expect(validClaim.data.distanceKm).toBe(100);
      expect(validClaim.data.origin).toBe("HQ Kuala Lumpur");
      expect(validClaim.data.destination).toBe("Site Cyberjaya");
    }
  });

  it("extracts and validates FormData correctly for mileage claim submissions", () => {
    const formData = new FormData();
    formData.set("claimTypeId", "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    formData.set("amount", "120.00");
    formData.set("receiptDate", "2026-10-06");
    formData.set("isMileage", "true");
    formData.set("distanceKm", "150");
    formData.set("ratePerKm", "0.80");
    formData.set("origin", "Penang Branch");
    formData.set("destination", "Ipoh Plant");
    formData.set("description", "Factory audit");

    const isMileage = formData.get("isMileage") === "true";
    const distanceKmRaw = formData.get("distanceKm");
    const ratePerKmRaw = formData.get("ratePerKm");
    const originRaw = formData.get("origin");
    const destinationRaw = formData.get("destination");

    const parsed = claimRequestSchema.safeParse({
      claimTypeId: String(formData.get("claimTypeId") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      receiptDate: String(formData.get("receiptDate") ?? ""),
      description: String(formData.get("description") ?? "").trim() || undefined,
      isMileage,
      distanceKm: distanceKmRaw ? String(distanceKmRaw) : undefined,
      ratePerKm: ratePerKmRaw ? String(ratePerKmRaw) : undefined,
      origin: originRaw ? String(originRaw).trim() : undefined,
      destination: destinationRaw ? String(destinationRaw).trim() : undefined,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isMileage).toBe(true);
      expect(parsed.data.distanceKm).toBe(150);
      expect(parsed.data.ratePerKm).toBe(0.80);
      expect(parsed.data.origin).toBe("Penang Branch");
      expect(parsed.data.destination).toBe("Ipoh Plant");
    }
  });

  it("formats mileage claim summary in approval workflows with trip route", () => {
    const payload = {
      claimTypeName: "Mileage (Car)",
      amount: "80.00",
      receiptDate: "2026-10-05",
      isMileage: true,
      distanceKm: 100,
      ratePerKm: 0.8,
      origin: "KL Office",
      destination: "Putrajaya MoF",
    };

    const summary = summarizeApprovalPayload("claim", payload);
    expect(summary).toBe("Mileage (Car) · RM 80.00 (100 km: KL Office → Putrajaya MoF)");
  });

  it("formats standard claim summary without trip route", () => {
    const payload = {
      claimTypeName: "Medical Claim",
      amount: "150.00",
      receiptDate: "2026-10-05",
    };

    const summary = summarizeApprovalPayload("claim", payload);
    expect(summary).toBe("Medical Claim · RM 150.00");
  });
});
