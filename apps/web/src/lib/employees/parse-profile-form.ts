import { createEmployeeSchema, type CreateEmployeeInput } from "@hrms/validation";

function readOptionalUuid(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value : null;
}

function readCheckbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export function parseEmployeeProfileFormData(formData: FormData): {
  success: true;
  data: CreateEmployeeInput;
} | {
  success: false;
  error: string;
} {
  const emergencyContacts = [0, 1, 2, 3, 4]
    .map((index) => {
      const name = String(formData.get(`emergencyName_${index}`) ?? "").trim();
      const phone = String(formData.get(`emergencyPhone_${index}`) ?? "").trim();
      const relationship = String(formData.get(`emergencyRelationship_${index}`) ?? "").trim();
      if (!name && !phone) return null;
      return { name, phone, relationship: relationship || undefined };
    })
    .filter(Boolean) as Array<{ name: string; phone: string; relationship?: string }>;

  const dependents: CreateEmployeeInput["dependents"] = [];
  const spouseName = String(formData.get("spouseName") ?? "").trim();
  if (spouseName) {
    dependents.push({
      dependentType: "spouse",
      fullName: spouseName,
      icNumber: String(formData.get("spouseIc") ?? "").trim() || null,
      isWorking: String(formData.get("spouseWorking") ?? "") === "yes",
      dateOfBirth: null,
    });
  }

  for (let index = 0; index < 5; index += 1) {
    const fullName = String(formData.get(`childName_${index}`) ?? "").trim();
    if (!fullName) continue;
    dependents.push({
      dependentType: "child",
      fullName,
      icNumber: String(formData.get(`childIc_${index}`) ?? "").trim() || null,
      isWorking: null,
      dateOfBirth: String(formData.get(`childDob_${index}`) ?? "").trim() || null,
    });
  }

  const allowedLeaveTypeIds = formData
    .getAll("allowedLeaveTypeIds")
    .map((value) => String(value))
    .filter(Boolean);

  const parsed = createEmployeeSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    employeeNumber: String(formData.get("employeeNumber") ?? "").trim() || undefined,
    branchId: readOptionalUuid(formData, "branchId"),
    departmentId: readOptionalUuid(formData, "departmentId"),
    managerEmployeeId: readOptionalUuid(formData, "managerEmployeeId"),
    payGroupId: readOptionalUuid(formData, "payGroupId"),
    shiftId: readOptionalUuid(formData, "shiftId"),
    joinDate: String(formData.get("joinDate") ?? "").trim(),
    employmentType: emptyToNull(formData.get("employmentType")),
    jobTitle: emptyToNull(formData.get("jobTitle")),
    confirmationStatus: emptyToNull(formData.get("confirmationStatus")),
    annualLeaveEntitlement: String(formData.get("annualLeaveEntitlement") ?? "").trim() || undefined,
    annualLeaveCarryForward: String(formData.get("annualLeaveCarryForward") ?? "").trim() || undefined,
    allowedLeaveTypeIds,
    portalRole: String(formData.get("portalRole") ?? "employee").trim() || "employee",
    sendActivationEmail: readCheckbox(formData, "sendActivationEmail"),
    phone: emptyToNull(formData.get("phone")),
    icNumber: emptyToNull(formData.get("icNumber")),
    dateOfBirth: emptyToNull(formData.get("dateOfBirth")),
    gender: emptyToNull(formData.get("gender")),
    race: emptyToNull(formData.get("race")),
    religion: emptyToNull(formData.get("religion")),
    maritalStatus: emptyToNull(formData.get("maritalStatus")),
    residentialAddress: emptyToNull(formData.get("residentialAddress")),
    addressLine1: emptyToNull(formData.get("addressLine1")),
    city: emptyToNull(formData.get("city")),
    state: emptyToNull(formData.get("state")),
    postcode: emptyToNull(formData.get("postcode")),
    country: emptyToNull(formData.get("country")) ?? "MY",
    payBasis: emptyToNull(formData.get("payBasis")),
    workingDaysPerMonth: String(formData.get("workingDaysPerMonth") ?? "").trim() || undefined,
    basicSalary: String(formData.get("basicSalary") ?? "").trim() || undefined,
    bankName: emptyToNull(formData.get("bankName")),
    bankAccountNumber: emptyToNull(formData.get("bankAccountNumber")),
    epfNumber: emptyToNull(formData.get("epfNumber")),
    socsoNumber: emptyToNull(formData.get("socsoNumber")),
    taxNumber: emptyToNull(formData.get("taxNumber")),
    dependents,
    emergencyContacts,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid employee details." };
  }

  return { success: true, data: parsed.data };
}
