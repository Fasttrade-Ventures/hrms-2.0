import { beforeEach, describe, expect, it, vi } from "vitest";

// Set environment variable for default org ID
process.env.DEFAULT_ORGANIZATION_ID = "org-456";

// Mock auth session to return our mock logged-in user
vi.mock("@/lib/auth/session", () => ({
  requireAuth: vi.fn(() =>
    Promise.resolve({
      user: { id: "user-123", email: "employee@example.com" },
      membership: { employeeId: "emp-123", roles: ["employee"] },
    })
  ),
  requireRole: vi.fn(() => Promise.resolve()),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock external services called within our library code to avoid side effects
vi.mock("@/lib/approvals/service", () => ({
  submitForApproval: vi.fn(),
}));

vi.mock("@/lib/leave/blackout", () => ({
  assertLeaveDatesAllowed: vi.fn(),
}));

vi.mock("@/lib/integrations/webhooks/emit", () => ({
  emitLeaveWebhook: vi.fn(),
}));

vi.mock("@/lib/audit/log-event", () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock("@/lib/entitlements", () => ({
  getEntitlements: vi.fn(() =>
    Promise.resolve({
      hasModule: () => true,
    })
  ),
}));

vi.mock("@/lib/attendance/geofence", () => ({
  validateGeofenceClockIn: vi.fn(() => ({ ok: true, status: "ok" })),
}));

import { createClient } from "@/lib/supabase/server";
import { clockOut, getTodayAttendance, clockIn, listRecentAttendance } from "@/lib/employee/attendance";
import { getEmployeeAttendanceContext } from "@/lib/employee/attendance-context";
import { listLeaveTypes, getLeaveBalances, createLeaveRequest, getLeaveRequest, listLeaveRequests } from "@/lib/employee/leave";
import { getApprovalTimeline, listClaims, getClaim, listOvertimeRequests, getOvertimeRequest, listLateReports, getLateReport, listAttendanceCorrections, getAttendanceCorrection } from "@/lib/employee/requests";
import { listMyDocuments, getMyDocumentComplianceSummary } from "@/lib/employee/documents";
import { listMyAssets, getMyAssetDetail } from "@/lib/assets/queries";
import { getEmployeePayrollDeclarations, upsertEmployeePayrollDeclarations } from "@/lib/employee/payroll-declarations";
import { listMyAppraisals, getMyAppraisal } from "@/lib/employee/performance";
import { listPayslips, getPayslip } from "@/lib/employee/payslips";

let mockAttendanceRecords: any[] = [];

// Mock Query Builder to inspect executed query parameters
class MockSupabaseQueryBuilder {
  tableName: string;
  calledSelect: string | null = null;
  calledEqs: Array<[string, any]> = [];
  calledIns: Array<[string, any[]]> = [];
  calledOrder: [string, any] | null = null;
  calledMaybeSingle = false;
  calledSingle = false;
  upsertPayload: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string) {
    this.calledSelect = fields;
    return this;
  }

  eq(column: string, value: any) {
    this.calledEqs.push([column, value]);
    return this;
  }

  in(column: string, values: any[]) {
    this.calledIns.push([column, values]);
    return this;
  }

  order(column: string, options?: any) {
    this.calledOrder = [column, options];
    return this;
  }

  limit(num: number) {
    return this;
  }

  is(column: string, value: any) {
    return this;
  }

  maybeSingle() {
    this.calledMaybeSingle = true;
    let mockData: any = null;
    if (this.tableName === "employees") {
      mockData = { annual_leave_entitlement: 14, annual_leave_carry_forward: 0, branch_id: "branch-abc" };
    } else if (this.tableName === "approval_requests") {
      mockData = { created_at: "2026-08-20T00:00:00Z", status: "pending", requester_employee_id: "emp-123" };
    } else if (this.tableName === "leave_types") {
      mockData = { name: "Annual Leave" };
    } else if (this.tableName === "branches") {
      mockData = { name: "HQ Branch", geofence_enabled: true, latitude: 3.1, longitude: 101.5, geofence_radius_m: 100 };
    } else if (this.tableName === "performance_appraisals") {
      mockData = { id: "app-123", employee_id: "emp-123", status: "draft" };
    }
    return Promise.resolve({ data: mockData, error: null });
  }

  single() {
    this.calledSingle = true;
    return Promise.resolve({ data: { id: "mock-id" }, error: null });
  }

  insert(record: any) {
    this.upsertPayload = record;
    return this;
  }

  update(record: any) {
    this.upsertPayload = record;
    return this;
  }

  upsert(record: any) {
    this.upsertPayload = record;
    return Promise.resolve({ error: null });
  }

  then(onfulfilled: any) {
    let mockData: any = [];
    if (this.tableName === "employee_allowed_leave_types") {
      mockData = [{ leave_type_id: "lt-999" }];
    } else if (this.tableName === "leave_types") {
      mockData = [{ id: "lt-999", name: "Annual Leave", entitlement_days: 14 }];
    } else if (this.tableName === "leave_requests") {
      mockData = [];
    } else if (this.tableName === "approval_steps") {
      mockData = [];
    } else if (this.tableName === "attendance_records") {
      mockData = [...mockAttendanceRecords];
      if (mockAttendanceRecords.length === 0) {
        mockAttendanceRecords = [{ id: "session-active", session: 1, clock_in_at: "2026-08-20T09:00:00Z", clock_out_at: null, status: "ok" }];
      }
    } else if (this.tableName === "employee_documents") {
      mockData = [];
    } else if (this.tableName === "required_documents") {
      mockData = [];
    } else if (this.tableName === "claims") {
      mockData = [];
    } else if (this.tableName === "overtime_requests") {
      mockData = [];
    } else if (this.tableName === "late_requests") {
      mockData = [];
    } else if (this.tableName === "attendance_requests") {
      mockData = [];
    } else if (this.tableName === "payroll_payrun_items") {
      mockData = [];
    } else if (this.tableName === "asset_assignments") {
      mockData = [];
    } else if (this.tableName === "performance_appraisals") {
      mockData = [];
    }
    return Promise.resolve(onfulfilled({ data: mockData, error: null }));
  }
}

describe("Employee RLS Query Security Audit", () => {
  let queries: MockSupabaseQueryBuilder[];
  const mockOrgId = "org-456";
  const mockEmployeeId = "emp-123";

  beforeEach(() => {
    queries = [];
    mockAttendanceRecords = [
      { id: "session-active", session: 1, clock_in_at: "2026-08-20T09:00:00Z", clock_out_at: null, status: "ok" }
    ];
    vi.clearAllMocks();

    vi.mocked(createClient).mockResolvedValue({
      from(tableName: string) {
        const builder = new MockSupabaseQueryBuilder(tableName);
        queries.push(builder);
        return builder;
      },
    } as any);
  });

  it("clockOut query incorporates both organization_id and employee_id", async () => {
    await clockOut();

    const updateQuery = queries.find(q => q.calledSingle);
    expect(updateQuery).toBeDefined();
    expect(updateQuery!.tableName).toBe("attendance_records");

    const eqs = new Map(updateQuery!.calledEqs);
    expect(eqs.get("organization_id")).toBe(mockOrgId);
    expect(eqs.get("employee_id")).toBe(mockEmployeeId);
    expect(eqs.get("id")).toBe("session-active");
  });

  it("getTodayAttendance query incorporates both organization_id and employee_id", async () => {
    await getTodayAttendance();

    const query = queries.find(q => q.tableName === "attendance_records");
    expect(query).toBeDefined();
    const eqs = new Map(query!.calledEqs);
    expect(eqs.get("organization_id")).toBe(mockOrgId);
    expect(eqs.get("employee_id")).toBe(mockEmployeeId);
  });

  it("clockIn inserts attendance_records with organization_id and employee_id", async () => {
    mockAttendanceRecords = [];
    await clockIn();

    const insertQuery = queries.find(q => q.tableName === "attendance_records" && q.calledSingle);
    expect(insertQuery).toBeDefined();
    expect(insertQuery!.upsertPayload).toBeDefined();
    expect(insertQuery!.upsertPayload.organization_id).toBe(mockOrgId);
    expect(insertQuery!.upsertPayload.employee_id).toBe(mockEmployeeId);
  });

  it("listRecentAttendance query incorporates both organization_id and employee_id", async () => {
    await listRecentAttendance();

    const query = queries.find(q => q.tableName === "attendance_records");
    expect(query).toBeDefined();
    const eqs = new Map(query!.calledEqs);
    expect(eqs.get("organization_id")).toBe(mockOrgId);
    expect(eqs.get("employee_id")).toBe(mockEmployeeId);
  });

  it("getEmployeeAttendanceContext queries employee and branch with organization_id", async () => {
    await getEmployeeAttendanceContext();

    const empQuery = queries.find(q => q.tableName === "employees");
    expect(empQuery).toBeDefined();
    const empEqs = new Map(empQuery!.calledEqs);
    expect(empEqs.get("organization_id")).toBe(mockOrgId);
    expect(empEqs.get("id")).toBe(mockEmployeeId);

    const branchQuery = queries.find(q => q.tableName === "branches");
    expect(branchQuery).toBeDefined();
    const branchEqs = new Map(branchQuery!.calledEqs);
    expect(branchEqs.get("organization_id")).toBe(mockOrgId);
    expect(branchEqs.get("id")).toBe("branch-abc");
  });

  it("listLeaveTypes query incorporates both organization_id and employee_id", async () => {
    await listLeaveTypes();

    const allowedQuery = queries.find(q => q.tableName === "employee_allowed_leave_types");
    expect(allowedQuery).toBeDefined();
    const allowedEqs = new Map(allowedQuery!.calledEqs);
    expect(allowedEqs.get("organization_id")).toBe(mockOrgId);
    expect(allowedEqs.get("employee_id")).toBe(mockEmployeeId);

    const leaveTypesQuery = queries.find(q => q.tableName === "leave_types");
    expect(leaveTypesQuery).toBeDefined();
    const typesEqs = new Map(leaveTypesQuery!.calledEqs);
    expect(typesEqs.get("organization_id")).toBe(mockOrgId);
  });

  it("listLeaveRequests query incorporates both organization_id and employee_id", async () => {
    await listLeaveRequests();

    const query = queries.find(q => q.tableName === "leave_requests");
    expect(query).toBeDefined();
    const eqs = new Map(query!.calledEqs);
    expect(eqs.get("organization_id")).toBe(mockOrgId);
    expect(eqs.get("employee_id")).toBe(mockEmployeeId);
  });

  it("getLeaveRequest query incorporates organization_id, employee_id, and request ID", async () => {
    await getLeaveRequest("req-111");

    const query = queries.find(q => q.tableName === "leave_requests");
    expect(query).toBeDefined();
    const eqs = new Map(query!.calledEqs);
    expect(eqs.get("organization_id")).toBe(mockOrgId);
    expect(eqs.get("employee_id")).toBe(mockEmployeeId);
    expect(eqs.get("id")).toBe("req-111");
  });

  it("getLeaveBalances query incorporates both organization_id and employee_id", async () => {
    await getLeaveBalances();

    const allowedQuery = queries.find(q => q.tableName === "employee_allowed_leave_types");
    expect(allowedQuery).toBeDefined();
    const allowedEqs = new Map(allowedQuery!.calledEqs);
    expect(allowedEqs.get("organization_id")).toBe(mockOrgId);
    expect(allowedEqs.get("employee_id")).toBe(mockEmployeeId);

    const employeeQuery = queries.find(q => q.tableName === "employees");
    expect(employeeQuery).toBeDefined();
    const employeeEqs = new Map(employeeQuery!.calledEqs);
    expect(employeeEqs.get("organization_id")).toBe(mockOrgId);
    expect(employeeEqs.get("id")).toBe(mockEmployeeId);

    const requestsQuery = queries.find(q => q.tableName === "leave_requests");
    expect(requestsQuery).toBeDefined();
    const requestsEqs = new Map(requestsQuery!.calledEqs);
    expect(requestsEqs.get("organization_id")).toBe(mockOrgId);
    expect(requestsEqs.get("employee_id")).toBe(mockEmployeeId);
  });

  it("createLeaveRequest query incorporates organization_id on leave_types and file_objects select", async () => {
    await createLeaveRequest({
      leaveTypeId: "lt-111",
      startDate: "2026-08-25",
      endDate: "2026-08-26",
      halfDay: false,
      reason: "Holiday",
      attachmentFileId: "file-999",
    });

    const leaveTypeQuery = queries.find(q => q.tableName === "leave_types");
    expect(leaveTypeQuery).toBeDefined();
    const typeEqs = new Map(leaveTypeQuery!.calledEqs);
    expect(typeEqs.get("organization_id")).toBe(mockOrgId);
    expect(typeEqs.get("id")).toBe("lt-111");

    const fileQuery = queries.find(q => q.tableName === "file_objects");
    expect(fileQuery).toBeDefined();
    const fileEqs = new Map(fileQuery!.calledEqs);
    expect(fileEqs.get("organization_id")).toBe(mockOrgId);
    expect(fileEqs.get("id")).toBe("file-999");
  });

  it("getApprovalTimeline restricts access strictly to requester employee's request", async () => {
    const timeline = await getApprovalTimeline("req-xyz");

    expect(timeline).toHaveLength(1); // The submitted step

    const requestQuery = queries.find(q => q.tableName === "approval_requests");
    expect(requestQuery).toBeDefined();
    const reqEqs = new Map(requestQuery!.calledEqs);
    expect(reqEqs.get("organization_id")).toBe(mockOrgId);
    expect(reqEqs.get("id")).toBe("req-xyz");
    expect(reqEqs.get("requester_employee_id")).toBe(mockEmployeeId); // Employee Isolation!

    const stepsQuery = queries.find(q => q.tableName === "approval_steps");
    expect(stepsQuery).toBeDefined();
    const stepsEqs = new Map(stepsQuery!.calledEqs);
    expect(stepsEqs.get("organization_id")).toBe(mockOrgId);
    expect(stepsEqs.get("approval_request_id")).toBe("req-xyz");
  });

  it("claims list and get incorporate organization_id and employee_id", async () => {
    await listClaims();
    const listQuery = queries.find(q => q.tableName === "claims");
    expect(listQuery).toBeDefined();
    const listEqs = new Map(listQuery!.calledEqs);
    expect(listEqs.get("organization_id")).toBe(mockOrgId);
    expect(listEqs.get("employee_id")).toBe(mockEmployeeId);

    queries = [];
    await getClaim("claim-123");
    const getQuery = queries.find(q => q.tableName === "claims");
    expect(getQuery).toBeDefined();
    const getEqs = new Map(getQuery!.calledEqs);
    expect(getEqs.get("organization_id")).toBe(mockOrgId);
    expect(getEqs.get("employee_id")).toBe(mockEmployeeId);
    expect(getEqs.get("id")).toBe("claim-123");
  });

  it("overtime requests list and get incorporate organization_id and employee_id", async () => {
    await listOvertimeRequests();
    const listQuery = queries.find(q => q.tableName === "overtime_requests");
    expect(listQuery).toBeDefined();
    const listEqs = new Map(listQuery!.calledEqs);
    expect(listEqs.get("organization_id")).toBe(mockOrgId);
    expect(listEqs.get("employee_id")).toBe(mockEmployeeId);

    queries = [];
    await getOvertimeRequest("ot-123");
    const getQuery = queries.find(q => q.tableName === "overtime_requests");
    expect(getQuery).toBeDefined();
    const getEqs = new Map(getQuery!.calledEqs);
    expect(getEqs.get("organization_id")).toBe(mockOrgId);
    expect(getEqs.get("employee_id")).toBe(mockEmployeeId);
    expect(getEqs.get("id")).toBe("ot-123");
  });

  it("late reports list and get incorporate organization_id and employee_id", async () => {
    await listLateReports();
    const listQuery = queries.find(q => q.tableName === "late_requests");
    expect(listQuery).toBeDefined();
    const listEqs = new Map(listQuery!.calledEqs);
    expect(listEqs.get("organization_id")).toBe(mockOrgId);
    expect(listEqs.get("employee_id")).toBe(mockEmployeeId);

    queries = [];
    await getLateReport("late-123");
    const getQuery = queries.find(q => q.tableName === "late_requests");
    expect(getQuery).toBeDefined();
    const getEqs = new Map(getQuery!.calledEqs);
    expect(getEqs.get("organization_id")).toBe(mockOrgId);
    expect(getEqs.get("employee_id")).toBe(mockEmployeeId);
    expect(getEqs.get("id")).toBe("late-123");
  });

  it("attendance corrections list and get incorporate organization_id and employee_id", async () => {
    await listAttendanceCorrections();
    const listQuery = queries.find(q => q.tableName === "attendance_requests");
    expect(listQuery).toBeDefined();
    const listEqs = new Map(listQuery!.calledEqs);
    expect(listEqs.get("organization_id")).toBe(mockOrgId);
    expect(listEqs.get("employee_id")).toBe(mockEmployeeId);

    queries = [];
    await getAttendanceCorrection("corr-123");
    const getQuery = queries.find(q => q.tableName === "attendance_requests");
    expect(getQuery).toBeDefined();
    const getEqs = new Map(getQuery!.calledEqs);
    expect(getEqs.get("organization_id")).toBe(mockOrgId);
    expect(getEqs.get("employee_id")).toBe(mockEmployeeId);
    expect(getEqs.get("id")).toBe("corr-123");
  });

  it("documents list and compliance summary incorporate organization_id and employee_id", async () => {
    await listMyDocuments();
    const docQuery = queries.find(q => q.tableName === "employee_documents");
    expect(docQuery).toBeDefined();
    const docEqs = new Map(docQuery!.calledEqs);
    expect(docEqs.get("organization_id")).toBe(mockOrgId);
    expect(docEqs.get("employee_id")).toBe(mockEmployeeId);

    const reqQuery = queries.find(q => q.tableName === "required_documents");
    expect(reqQuery).toBeDefined();
    const reqEqs = new Map(reqQuery!.calledEqs);
    expect(reqEqs.get("organization_id")).toBe(mockOrgId);

    queries = [];
    await getMyDocumentComplianceSummary();
    const sumDocQuery = queries.find(q => q.tableName === "employee_documents");
    expect(sumDocQuery).toBeDefined();
    const sumDocEqs = new Map(sumDocQuery!.calledEqs);
    expect(sumDocEqs.get("organization_id")).toBe(mockOrgId);
    expect(sumDocEqs.get("employee_id")).toBe(mockEmployeeId);
  });

  it("payslips list and get incorporate organization_id and employee_id", async () => {
    await listPayslips();
    const listQuery = queries.find(q => q.tableName === "payroll_payrun_items");
    expect(listQuery).toBeDefined();
    const listEqs = new Map(listQuery!.calledEqs);
    expect(listEqs.get("organization_id")).toBe(mockOrgId);
    expect(listEqs.get("employee_id")).toBe(mockEmployeeId);

    queries = [];
    await getPayslip("slip-123");
    const getQuery = queries.find(q => q.tableName === "payroll_payrun_items");
    expect(getQuery).toBeDefined();
    const getEqs = new Map(getQuery!.calledEqs);
    expect(getEqs.get("organization_id")).toBe(mockOrgId);
    expect(getEqs.get("employee_id")).toBe(mockEmployeeId);
    expect(getEqs.get("id")).toBe("slip-123");
  });

  it("assets list and get incorporate organization_id and employee_id", async () => {
    await listMyAssets();
    const listQuery = queries.find(q => q.tableName === "asset_assignments");
    expect(listQuery).toBeDefined();
    const listEqs = new Map(listQuery!.calledEqs);
    expect(listEqs.get("organization_id")).toBe(mockOrgId);
    expect(listEqs.get("employee_id")).toBe(mockEmployeeId);

    queries = [];
    await getMyAssetDetail("asset-123");
    const getQuery = queries.find(q => q.tableName === "asset_assignments");
    expect(getQuery).toBeDefined();
    const getEqs = new Map(getQuery!.calledEqs);
    expect(getEqs.get("organization_id")).toBe(mockOrgId);
    expect(getEqs.get("employee_id")).toBe(mockEmployeeId);
    expect(getEqs.get("asset_id")).toBe("asset-123");
  });

  it("payroll declarations incorporate organization_id and employee_id", async () => {
    await getEmployeePayrollDeclarations();
    const getQuery = queries.find(q => q.tableName === "employees");
    expect(getQuery).toBeDefined();
    const getEqs = new Map(getQuery!.calledEqs);
    expect(getEqs.get("organization_id")).toBe(mockOrgId);
    expect(getEqs.get("id")).toBe(mockEmployeeId);

    queries = [];
    await upsertEmployeePayrollDeclarations({
      zakatAnnual: 100,
      zakatMonthly: 10,
      otherReliefs: 50,
      voluntaryEpfExtraRate: 2,
    });

    const taxQuery = queries.find(q => q.tableName === "employee_tax_profiles");
    expect(taxQuery).toBeDefined();
    expect(taxQuery!.upsertPayload.organization_id).toBe(mockOrgId);
    expect(taxQuery!.upsertPayload.employee_id).toBe(mockEmployeeId);

    const compQuery = queries.find(q => q.tableName === "employee_compensation" && q.upsertPayload);
    expect(compQuery).toBeDefined();
    expect(compQuery!.upsertPayload.organization_id).toBe(mockOrgId);
    expect(compQuery!.upsertPayload.employee_id).toBe(mockEmployeeId);
  });

  it("appraisals list and get incorporate organization_id and employee_id", async () => {
    await listMyAppraisals();
    const listQuery = queries.find(q => q.tableName === "performance_appraisals");
    expect(listQuery).toBeDefined();
    const listEqs = new Map(listQuery!.calledEqs);
    expect(listEqs.get("organization_id")).toBe(mockOrgId);
    expect(listEqs.get("employee_id")).toBe(mockEmployeeId);

    queries = [];
    await getMyAppraisal("app-123");
    const getQuery = queries.find(q => q.tableName === "performance_appraisals");
    expect(getQuery).toBeDefined();
    const getEqs = new Map(getQuery!.calledEqs);
    expect(getEqs.get("organization_id")).toBe(mockOrgId);
    expect(getEqs.get("employee_id")).toBe(mockEmployeeId);
    expect(getEqs.get("id")).toBe("app-123");
  });
});
