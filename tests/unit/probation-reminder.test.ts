import { describe, expect, it } from "vitest";

import {
  buildConfirmationLetterPdf,
  confirmedOnForStatus,
  daysUntilDate,
  planProbationReminder,
  probationReminderMessage,
} from "@/lib/employees/probation";

describe("planProbationReminder", () => {
  const base = {
    organizationId: "org-1",
    employeeId: "emp-1",
    employeeName: "Aina Rahman",
    probationEndDate: "2026-10-13",
    asOfDate: "2026-10-06",
  };

  it("reminds HR when probation ends within 7 days", () => {
    const plan = planProbationReminder(base);

    expect(plan?.daysUntilEnd).toBe(7);
    expect(plan?.idempotencyKey).toBe("probation-reminder:org-1:emp-1:2026-10-13");
    expect(probationReminderMessage(plan!)).toContain("7 day(s) left");
  });

  it("reminds on the end date and skips dates further out or already past", () => {
    expect(planProbationReminder({ ...base, asOfDate: "2026-10-13" })?.daysUntilEnd).toBe(0);
    expect(planProbationReminder({ ...base, asOfDate: "2026-10-05" })).toBeNull();
    expect(planProbationReminder({ ...base, asOfDate: "2026-10-14" })).toBeNull();
    expect(daysUntilDate("2026-10-06", "2026-10-13")).toBe(7);
  });

  it("keeps an existing confirmation date and stamps today when confirming", () => {
    expect(confirmedOnForStatus("confirmed", "2026-09-01", "2026-10-06")).toBe("2026-09-01");
    expect(confirmedOnForStatus("confirmed", null, "2026-10-06")).toBe("2026-10-06");
    expect(confirmedOnForStatus("probation", "2026-09-01", "2026-10-06")).toBeNull();
  });

  it("builds a one-page confirmation letter", () => {
    const pdf = buildConfirmationLetterPdf({
      organizationName: "Fasttrade Sdn Bhd",
      employeeName: "Aina Rahman",
      employeeNumber: "EMP-001",
      jobTitle: "Executive",
      confirmedOn: "2026-10-06",
    });
    const text = new TextDecoder().decode(pdf);

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Confirmation of employment");
    expect(text).toContain("Aina Rahman");
  });
});
