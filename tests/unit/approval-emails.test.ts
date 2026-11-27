import { describe, expect, it } from "vitest";
import {
  buildApprovalPendingEmail,
  buildApprovalConfirmationEmail,
  buildApprovalDecisionEmail,
} from "@hrms/platform";
import { extractApprovalEmailDetails } from "../../apps/web/src/lib/approvals/service";

describe("Approval Email Builders", () => {
  it("builds a pending approval email with correct claim details and action URL", () => {
    const { subject, html, text } = buildApprovalPendingEmail({
      recipientName: "Jane Manager",
      requesterName: "Ali bin Ahmad",
      requesterEmployeeNumber: "EMP-042",
      requestTypeLabel: "Claim",
      requestSummary: "Medical Claim · RM 150.00",
      details: [
        { label: "Category", value: "Medical" },
        { label: "Amount", value: "RM 150.00" },
        { label: "Receipt Date", value: "2026-11-12" },
        { label: "Receipt", value: "clinic-receipt.pdf" },
      ],
      actionUrl: "https://app.bukuhr.com/manager/approvals/step-123",
      dueDate: "2026-11-15T12:00:00Z",
      isEscalated: false,
    });

    expect(subject).toBe("Action needed: Claim request from Ali bin Ahmad (Medical Claim · RM 150.00)");
    expect(html).toContain("Review &amp; Action in Hirix HR");
    expect(html).toContain("https://app.bukuhr.com/manager/approvals/step-123");
    expect(html).toContain("clinic-receipt.pdf");
    expect(html).toContain("Ali bin Ahmad");
    expect(html).toContain("EMP-042");
    expect(text).toContain("Hi Jane Manager");
    expect(text).toContain("Summary: Medical Claim · RM 150.00");
    expect(text).toContain("• Receipt: clinic-receipt.pdf");
  });

  it("adds [Escalated] prefix to subject and changes intro text for escalated approvals", () => {
    const { subject, text, html } = buildApprovalPendingEmail({
      recipientName: "HR Director",
      requesterName: "Siti Aminah",
      requestTypeLabel: "Claim",
      requestSummary: "Travel Claim · RM 320.00",
      actionUrl: "https://app.bukuhr.com/manager/approvals/step-456",
      isEscalated: true,
    });

    expect(subject).toContain("[Escalated]");
    expect(subject).toBe("[Escalated] Action needed: Claim request from Siti Aminah (Travel Claim · RM 320.00)");
    expect(html).toContain("timed out and has been escalated to you");
    expect(text).toContain("timed out and has been escalated to you");
  });

  it("builds employee submission confirmation email", () => {
    const { subject, html, text } = buildApprovalConfirmationEmail({
      employeeName: "Ali bin Ahmad",
      requestTypeLabel: "Claim",
      requestSummary: "Dental Claim · RM 200.00",
      details: [
        { label: "Category", value: "Dental" },
        { label: "Amount", value: "RM 200.00" },
      ],
      viewUrl: "https://app.bukuhr.com/employee/claims",
    });

    expect(subject).toBe("Request submitted: Your claim is pending approval");
    expect(html).toContain("Dental Claim · RM 200.00");
    expect(html).toContain("View in Employee Portal");
    expect(html).toContain("https://app.bukuhr.com/employee/claims");
    expect(text).toContain("Hi Ali bin Ahmad");
    expect(text).toContain("Your claim request was submitted successfully and is pending approval.");
  });

  it("builds approved decision email for employee", () => {
    const { subject, html, text } = buildApprovalDecisionEmail({
      employeeName: "Ali bin Ahmad",
      requestTypeLabel: "Claim",
      requestSummary: "Medical Claim · RM 150.00",
      status: "approved",
      viewUrl: "https://app.bukuhr.com/employee/claims",
    });

    expect(subject).toBe("Your claim request was approved (Medical Claim · RM 150.00)");
    expect(html).toContain("Status: Approved");
    expect(text).toContain("Your claim request has been approved.");
  });

  it("builds rejected decision email with remarks for employee", () => {
    const { subject, html, text } = buildApprovalDecisionEmail({
      employeeName: "Ali bin Ahmad",
      requestTypeLabel: "Claim",
      requestSummary: "Entertainment Claim · RM 500.00",
      status: "rejected",
      approverComment: "Receipt is missing itemized tax invoice.",
      viewUrl: "https://app.bukuhr.com/employee/claims",
    });

    expect(subject).toBe("Your claim request was rejected (Entertainment Claim · RM 500.00)");
    expect(html).toContain("Status: Rejected");
    expect(html).toContain("Receipt is missing itemized tax invoice.");
    expect(text).toContain('Approver remarks: "Receipt is missing itemized tax invoice."');
  });

  it("extracts details for mileage and standard expense claims accurately", () => {
    const standardDetails = extractApprovalEmailDetails("claim", {
      claimTypeName: "Office Supplies",
      amount: "85.50",
      receiptDate: "2026-11-10",
      attachmentFileName: "staples.pdf",
      description: "Printer paper and ink",
    });

    expect(standardDetails).toEqual([
      { label: "Category", value: "Office Supplies" },
      { label: "Amount", value: "RM 85.50" },
      { label: "Receipt Date", value: "2026-11-10" },
      { label: "Receipt", value: "staples.pdf" },
      { label: "Description", value: "Printer paper and ink" },
    ]);

    const mileageDetails = extractApprovalEmailDetails("claim", {
      claimTypeName: "Mileage",
      amount: "120.00",
      receiptDate: "2026-11-11",
      isMileage: true,
      distanceKm: "150",
      origin: "Kuala Lumpur",
      destination: "Ipoh",
    });

    expect(mileageDetails).toEqual([
      { label: "Category", value: "Mileage" },
      { label: "Amount", value: "RM 120.00" },
      { label: "Receipt Date", value: "2026-11-11" },
      { label: "Distance", value: "150 km" },
      { label: "Route", value: "Kuala Lumpur → Ipoh" },
    ]);
  });

  it("extracts details for leave (AL / EL), overtime, replacement credit, late, and attendance", () => {
    const leaveDetails = extractApprovalEmailDetails("leave", {
      leaveTypeName: "Emergency Leave",
      startDate: "2026-11-20",
      endDate: "2026-11-20",
      days: 1,
      reason: "Family emergency",
      attachmentFileName: "hospital-admission.pdf",
    });

    expect(leaveDetails).toEqual([
      { label: "Leave Type", value: "Emergency Leave" },
      { label: "Period", value: "2026-11-20" },
      { label: "Duration", value: "1 day(s)" },
      { label: "Reason", value: "Family emergency" },
      { label: "Attachment", value: "hospital-admission.pdf" },
    ]);

    const otDetails = extractApprovalEmailDetails("overtime", {
      workDate: "2026-11-18",
      hours: 3.5,
      rateType: "1.5",
      reason: "Month-end closing support",
    });

    expect(otDetails).toEqual([
      { label: "Work Date", value: "2026-11-18" },
      { label: "Hours", value: "3.5h" },
      { label: "Rate", value: "1.5x" },
      { label: "Reason", value: "Month-end closing support" },
    ]);

    const rcDetails = extractApprovalEmailDetails("replacement_credit", {
      workDate: "2026-11-15",
      creditDays: 1,
      description: "Weekend deployment support",
    });

    expect(rcDetails).toEqual([
      { label: "Work Date", value: "2026-11-15" },
      { label: "Credit Days", value: "1 day(s)" },
      { label: "Description", value: "Weekend deployment support" },
    ]);

    const lateDetails = extractApprovalEmailDetails("late", {
      requestDate: "2026-11-16",
      actualArrivalTime: "09:45 AM",
      reason: "LRT breakdown at KL Sentral",
    });

    expect(lateDetails).toEqual([
      { label: "Date", value: "2026-11-16" },
      { label: "Arrival Time", value: "09:45 AM" },
      { label: "Reason", value: "LRT breakdown at KL Sentral" },
    ]);

    const attendanceDetails = extractApprovalEmailDetails("attendance", {
      requestDate: "2026-11-14",
      clockInTime: "08:55",
      clockOutTime: "18:10",
      reason: "Biometric scanner failed to recognize fingerprint",
    });

    expect(attendanceDetails).toEqual([
      { label: "Date", value: "2026-11-14" },
      { label: "Clock In", value: "08:55" },
      { label: "Clock Out", value: "18:10" },
      { label: "Reason", value: "Biometric scanner failed to recognize fingerprint" },
    ]);
  });

  it("builds a pending approval email for Annual Leave with dates and duration", () => {
    const { subject, html, text } = buildApprovalPendingEmail({
      recipientName: "Hafiz Manager",
      requesterName: "Nurul Huda",
      requesterEmployeeNumber: "EMP-088",
      requestTypeLabel: "Leave",
      requestSummary: "Annual Leave · 2026-12-22 → 2026-12-24",
      details: [
        { label: "Leave Type", value: "Annual Leave" },
        { label: "Period", value: "2026-12-22 to 2026-12-24" },
        { label: "Duration", value: "3 day(s)" },
        { label: "Reason", value: "Family vacation" },
      ],
      actionUrl: "https://app.bukuhr.com/manager/approvals/step-999",
      dueDate: "2026-12-20T23:59:59Z",
    });

    expect(subject).toBe("Action needed: Leave request from Nurul Huda (Annual Leave · 2026-12-22 → 2026-12-24)");
    expect(html).toContain("Nurul Huda");
    expect(html).toContain("Annual Leave");
    expect(html).toContain("Family vacation");
    expect(text).toContain("Summary: Annual Leave · 2026-12-22 → 2026-12-24");
    expect(text).toContain("• Period: 2026-12-22 to 2026-12-24");
    expect(text).toContain("• Duration: 3 day(s)");
  });
});

