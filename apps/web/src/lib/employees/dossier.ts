import { getEmployeeDetail, type EmployeeDetail } from "@/lib/employees/queries";
import { buildSimplePdf } from "@/lib/files/simple-pdf";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value: number): string {
  return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function getEmployeeDossier(employeeId: string): Promise<EmployeeDetail | null> {
  return getEmployeeDetail(employeeId);
}

export function buildEmployeeDossierPdf(employee: EmployeeDetail): Uint8Array {
  const lines = [
    "HRMS — EMPLOYEE DOSSIER",
    "========================================",
    "",
    `Name: ${employee.fullName}`,
    `Employee No: ${employee.employeeNumber}`,
    `Email: ${employee.email}`,
    `Status: ${employee.status}`,
    `Joined: ${formatDate(employee.joinDate)}`,
    `Branch: ${employee.branchName ?? "—"}`,
    `Department: ${employee.departmentName ?? "—"}`,
    `Manager: ${employee.managerName ?? "—"}`,
    `Roles: ${employee.membership?.roles?.join(", ") || "employee"}`,
    "",
    "PERSONAL",
    "----------------------------------------",
    `Phone: ${employee.profile.phone ?? "—"}`,
    `IC / Passport: ${employee.profile.icNumber ?? "—"}`,
    "",
    "ADDRESS",
    "----------------------------------------",
    `Line 1: ${employee.profile.addressLine1 ?? "—"}`,
    `Line 2: ${employee.profile.addressLine2 ?? "—"}`,
    `City: ${employee.profile.city ?? "—"}`,
    `State: ${employee.profile.state ?? "—"}`,
    `Postcode: ${employee.profile.postcode ?? "—"}`,
    `Country: ${employee.profile.country ?? "—"}`,
    "",
    "BANK & STATUTORY",
    "----------------------------------------",
    `Bank: ${employee.profile.bankName ?? "—"}`,
    `Account: ${employee.profile.bankAccountNumber ?? "—"}`,
    `EPF: ${employee.profile.epfNumber ?? "—"}`,
    `SOCSO: ${employee.profile.socsoNumber ?? "—"}`,
    `Tax: ${employee.profile.taxNumber ?? "—"}`,
    `Basic salary: ${money(employee.profile.basicSalary)}`,
    "",
    "EMERGENCY CONTACTS",
    "----------------------------------------",
    ...(employee.emergencyContacts.length > 0
      ? employee.emergencyContacts.map(
          (contact) =>
            `${contact.name} · ${contact.relationship ?? "Contact"} · ${contact.phone}`,
        )
      : ["None on file"]),
    "",
    `Generated: ${new Date().toLocaleString("en-GB")}`,
  ];

  return buildSimplePdf(lines);
}

export function dossierFilename(employee: EmployeeDetail): string {
  const safe = employee.employeeNumber.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `employee-dossier-${safe}.pdf`;
}
