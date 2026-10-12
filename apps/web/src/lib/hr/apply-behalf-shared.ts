export type BehalfApplicationType = "leave" | "late" | "claim" | "overtime" | "replacement";

export type BehalfApplicationRow = {
  id: string;
  type: BehalfApplicationType;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  details: string;
  status: string;
  appliedAt: string;
  appliedOnBehalfBy: string | null;
};

export type BehalfLeaveDetail = {
  type: "leave";
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  days: number;
  reason: string | null;
  status: string;
  appliedAt: string;
  appliedOnBehalfBy: string | null;
  submittedByName: string | null;
};

export type BehalfLateDetail = {
  type: "late";
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  requestDate: string;
  actualArrivalTime: string;
  reason: string | null;
  status: string;
  appliedAt: string;
  appliedOnBehalfBy: string | null;
  submittedByName: string | null;
};

export type BehalfClaimDetail = {
  type: "claim";
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  claimTypeName: string;
  amount: number;
  receiptDate: string;
  description: string | null;
  isMileage: boolean;
  distanceKm: number | null;
  ratePerKm: number | null;
  origin: string | null;
  destination: string | null;
  status: string;
  appliedAt: string;
  appliedOnBehalfBy: string | null;
  submittedByName: string | null;
};

export type BehalfOvertimeDetail = {
  type: "overtime";
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  workDate: string;
  hours: number;
  rateType: string;
  reason: string | null;
  status: string;
  appliedAt: string;
  appliedOnBehalfBy: string | null;
  submittedByName: string | null;
};

export type BehalfReplacementDetail = {
  type: "replacement";
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  workDate: string;
  creditDays: number;
  description: string | null;
  status: string;
  appliedAt: string;
  appliedOnBehalfBy: string | null;
  submittedByName: string | null;
};

export type BehalfApplicationDetail =
  | BehalfLeaveDetail
  | BehalfLateDetail
  | BehalfClaimDetail
  | BehalfOvertimeDetail
  | BehalfReplacementDetail;

export type BehalfListData = {
  rows: BehalfApplicationRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    total: number;
    leaveCount: number;
    lateCount: number;
    claimCount: number;
    otCount: number;
    replacementCount: number;
  };
};

export function getBehalfApplicationPath(
  type: BehalfApplicationType,
  id: string,
  basePath = "/hr/apply-behalf",
) {
  return `${basePath}/${type}/${id}`;
}

