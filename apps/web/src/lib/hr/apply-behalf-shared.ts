export type BehalfApplicationRow = {
  id: string;
  type: "leave" | "late";
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

export type BehalfApplicationDetail = BehalfLeaveDetail | BehalfLateDetail;

export type BehalfListData = {
  rows: BehalfApplicationRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    total: number;
    leaveCount: number;
    lateCount: number;
  };
};

export function getBehalfApplicationPath(type: "leave" | "late", id: string) {
  return `/hr/apply-behalf/${type}/${id}`;
}
