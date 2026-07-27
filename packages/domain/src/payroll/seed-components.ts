/** Seeded Malaysian payroll component catalog (spec §7). */

export type SeedComponent = {
  code: string;
  name: string;
  componentType: "earning" | "deduction" | "employer";
  isEpf: boolean;
  isSocso: boolean;
  isEis: boolean;
  isPcb: boolean;
  isHrdf: boolean;
  isSystem: boolean;
  sortOrder: number;
};

export const PAYROLL_SEED_COMPONENTS: SeedComponent[] = [
  { code: "BASIC", name: "Basic salary", componentType: "earning", isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true, isSystem: true, sortOrder: 10 },
  { code: "ALLOW_TRANSPORT", name: "Transport allowance", componentType: "earning", isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true, isSystem: true, sortOrder: 20 },
  { code: "ALLOW_PHONE", name: "Phone allowance", componentType: "earning", isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true, isSystem: true, sortOrder: 21 },
  { code: "ALLOW_MEAL", name: "Meal allowance", componentType: "earning", isEpf: false, isSocso: true, isEis: true, isPcb: false, isHrdf: true, isSystem: true, sortOrder: 22 },
  { code: "ALLOW_ATTEND", name: "Attendance incentive", componentType: "earning", isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true, isSystem: true, sortOrder: 23 },
  { code: "ALLOW_SHIFT", name: "Shift allowance", componentType: "earning", isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true, isSystem: true, sortOrder: 24 },
  { code: "ALLOW_HOUSING", name: "Housing allowance", componentType: "earning", isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true, isSystem: true, sortOrder: 25 },
  { code: "ALLOW_PETROL", name: "Petrol allowance", componentType: "earning", isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true, isSystem: true, sortOrder: 26 },
  { code: "OT_PAY", name: "Overtime pay", componentType: "earning", isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true, isSystem: true, sortOrder: 30 },
  { code: "CLAIM_TAXABLE", name: "Taxable claim", componentType: "earning", isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true, isSystem: true, sortOrder: 31 },
  { code: "CLAIM_REIMB", name: "Reimbursement", componentType: "earning", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 32 },
  { code: "BONUS", name: "Bonus", componentType: "earning", isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true, isSystem: true, sortOrder: 33 },
  { code: "BACKPAY", name: "Salary backpay", componentType: "earning", isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true, isSystem: true, sortOrder: 34 },
  { code: "DED_UNPAID_LEAVE", name: "Unpaid leave", componentType: "deduction", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 50 },
  { code: "DED_ZAKAT", name: "Zakat deduction", componentType: "deduction", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 52 },
  { code: "DED_LINDUNG", name: "LINDUNG 24 Jam", componentType: "deduction", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 53 },
  { code: "DED_OTHER", name: "Other deduction", componentType: "deduction", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 54 },
  { code: "DED_PCB", name: "PCB / MTD", componentType: "deduction", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 60 },
  { code: "DED_EPF", name: "EPF employee", componentType: "deduction", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 61 },
  { code: "DED_SOCSO", name: "SOCSO employee", componentType: "deduction", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 62 },
  { code: "DED_EIS", name: "EIS employee", componentType: "deduction", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 63 },
  { code: "ER_EPF", name: "EPF employer", componentType: "employer", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 70 },
  { code: "ER_SOCSO", name: "SOCSO employer", componentType: "employer", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 71 },
  { code: "ER_EIS", name: "EIS employer", componentType: "employer", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 72 },
  { code: "ER_HRDF", name: "HRDF levy", componentType: "employer", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 73 },
  { code: "ER_LINDUNG", name: "LINDUNG 24 Jam employer", componentType: "employer", isEpf: false, isSocso: false, isEis: false, isPcb: false, isHrdf: false, isSystem: true, sortOrder: 74 },
];
