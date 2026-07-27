import {
  formatAddress,
  formatConfirmationStatus,
  formatCurrency,
  formatEmploymentType,
  formatGender,
  formatMaritalStatus,
  formatPayBasis,
  formatPortalRole,
  formatProfileDate,
  tenureLabel,
} from "@/lib/employees/display-labels";
import { getEmployeeDetail, type EmployeeDetail } from "@/lib/employees/queries";
import { buildStyledPdf, type PdfField, type PdfSection } from "@/lib/files/styled-pdf";

export async function getEmployeeDossier(employeeId: string): Promise<EmployeeDetail | null> {
  return getEmployeeDetail(employeeId);
}

function countryLabel(country: string | null): string {
  if (!country) return "—";
  return country === "MY" ? "Malaysia" : country;
}

/** Shared with the on-screen dossier — keep PDF and web in sync. */
export function buildEmployeeDossierSections(employee: EmployeeDetail): PdfSection[] {
  const spouse = employee.dependents.find((item) => item.dependentType === "spouse");
  const children = employee.dependents.filter((item) => item.dependentType === "child");

  const familyFields: PdfField[] = spouse
    ? [
        { label: "Spouse name", value: spouse.fullName },
        { label: "Spouse IC no", value: spouse.icNumber ?? "—" },
        {
          label: "Spouse working",
          value: spouse.isWorking === null ? "—" : spouse.isWorking ? "Yes" : "No",
        },
      ]
    : [{ label: "Spouse", value: "No spouse on file" }];

  if (children.length > 0) {
    children.forEach((child, index) => {
      const details =
        [child.icNumber, formatProfileDate(child.dateOfBirth)]
          .filter((value) => value && value !== "—")
          .join(" · ") || "No details";
      familyFields.push({
        label: `Child ${index + 1}`,
        value: `${child.fullName} · ${details}`,
      });
    });
  } else {
    familyFields.push({ label: "Children", value: "No children on file" });
  }

  const leaveFields: PdfField[] =
    employee.allowedLeaveTypeNames.length > 0
      ? employee.allowedLeaveTypeNames.map((name) => ({ label: name, value: "Allowed" }))
      : [{ label: "Leave types", value: "None assigned" }];

  const emergencyFields: PdfField[] =
    employee.emergencyContacts.length > 0
      ? employee.emergencyContacts.map((contact) => ({
          label: contact.name,
          value: `${contact.relationship ?? "Contact"} · ${contact.phone}`,
        }))
      : [{ label: "Contacts", value: "None on file" }];

  return [
    {
      title: "Employment",
      fields: [
        { label: "Staff ID", value: employee.employeeNumber },
        { label: "Join date", value: formatProfileDate(employee.joinDate) },
        { label: "Job title", value: employee.jobTitle ?? "—" },
        { label: "Employment type", value: formatEmploymentType(employee.employmentType) },
        { label: "Branch", value: employee.branchName ?? "—" },
        { label: "Department", value: employee.departmentName ?? "—" },
        { label: "Manager", value: employee.managerName ?? "—" },
        { label: "Shift", value: employee.shiftName ?? "—" },
        { label: "Pay group", value: employee.payGroupName ?? "Default" },
        { label: "Portal role", value: formatPortalRole(employee.membership?.roles) },
        { label: "AL entitlement", value: `${employee.annualLeaveEntitlement} days` },
        { label: "Carry forward", value: `${employee.annualLeaveCarryForward} days` },
      ],
    },
    {
      title: "Personal",
      fields: [
        { label: "Mobile", value: employee.profile.phone ?? "—" },
        { label: "NRIC no", value: employee.profile.icNumber ?? "—" },
        { label: "Date of birth", value: formatProfileDate(employee.profile.dateOfBirth) },
        { label: "Gender", value: formatGender(employee.profile.gender) },
        { label: "Race", value: employee.profile.race ?? "—" },
        { label: "Religion", value: employee.profile.religion ?? "—" },
        { label: "Marital status", value: formatMaritalStatus(employee.profile.maritalStatus) },
        { label: "Confirmation", value: formatConfirmationStatus(employee.confirmationStatus) },
      ],
    },
    {
      title: "Address",
      fields: [
        { label: "Address line 1", value: employee.profile.addressLine1 ?? "—" },
        { label: "Address line 2", value: employee.profile.addressLine2 ?? "—" },
        { label: "City", value: employee.profile.city ?? "—" },
        { label: "State", value: employee.profile.state ?? "—" },
        { label: "Postcode", value: employee.profile.postcode ?? "—" },
        { label: "Country", value: countryLabel(employee.profile.country) },
        { label: "Formatted address", value: formatAddress(employee.profile) },
      ],
    },
    {
      title: "Payroll & statutory",
      fields: [
        { label: "Pay basis", value: formatPayBasis(employee.profile.payBasis) },
        { label: "Basic salary", value: formatCurrency(employee.profile.basicSalary) },
        { label: "Working days / month", value: String(employee.profile.workingDaysPerMonth) },
        { label: "Bank", value: employee.profile.bankName ?? "—" },
        { label: "Account no", value: employee.profile.bankAccountNumber ?? "—" },
        { label: "EPF no", value: employee.profile.epfNumber ?? "—" },
        { label: "SOCSO no", value: employee.profile.socsoNumber ?? "—" },
        { label: "Tax no", value: employee.profile.taxNumber ?? "—" },
      ],
    },
    {
      title: "Leave access",
      fields: leaveFields,
    },
    {
      title: "Family",
      fields: familyFields,
    },
    {
      title: "Emergency contacts",
      fields: emergencyFields,
    },
  ];
}

export function buildEmployeeDossierPdf(employee: EmployeeDetail): Uint8Array {
  const assignment =
    [employee.branchName, employee.departmentName].filter(Boolean).join(" · ") || "Unassigned";
  const hasLogin = Boolean(employee.membership?.userId);

  return buildStyledPdf({
    brandTitle: "HRMS",
    documentTitle: employee.fullName,
    subtitleLines: [
      `${employee.jobTitle?.trim() || "No job title"} · ${employee.employeeNumber}`,
      assignment,
      employee.email,
    ],
    badges: [
      employee.status === "active" ? "Active" : employee.status,
      hasLogin ? "Login linked" : "No login",
      formatConfirmationStatus(employee.confirmationStatus),
    ],
    stats: [
      { label: "Joined", value: formatProfileDate(employee.joinDate) },
      { label: "Tenure", value: tenureLabel(employee.joinDate) },
      { label: "Annual leave", value: `${employee.annualLeaveEntitlement} days` },
      { label: "Employment", value: formatEmploymentType(employee.employmentType) },
    ],
    sections: buildEmployeeDossierSections(employee),
    footer: `Generated ${new Date().toLocaleString("en-GB")} · HRMS Employee Dossier`,
    compact: true,
  });
}

export function dossierFilename(employee: EmployeeDetail): string {
  const safe = employee.employeeNumber.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `employee-dossier-${safe}.pdf`;
}
