import { describe, expect, it } from "vitest";

import {
  resolveApprovalChain,
  type ResolvedApprovalStep,
} from "../../apps/web/src/lib/approvals/service";
import { mapApprovalInboxRow } from "../../apps/web/src/lib/approvals/inbox";

describe("Multi-Level Approval Chains", () => {
  it("resolves default 1-step manager chain when no custom workflow exists", async () => {
    const mockClient = {
      from: (table: string) => {
        if (table === "employees") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: "emp-1", manager_employee_id: "mgr-1", department_id: "dept-1" },
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "approval_workflows") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
      },
    } as any;

    const chain = await resolveApprovalChain({
      organizationId: "org-1",
      requesterEmployeeId: "emp-1",
      requestType: "leave",
      client: mockClient,
    });

    expect(chain).toHaveLength(1);
    expect(chain[0].stepOrder).toBe(1);
    expect(chain[0].stepLabel).toBe("Line Manager");
    expect(chain[0].approverEmployeeId).toBe("mgr-1");
    expect(chain[0].timeoutDays).toBe(3);
  });

  it("resolves multi-stage chain (Line Manager -> Department Head -> HR Admin)", async () => {
    const mockClient = {
      from: (table: string) => {
        if (table === "employees") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: "emp-1", manager_employee_id: "mgr-1", department_id: "dept-1" },
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "departments") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { head_employee_id: "hod-1" },
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "organization_memberships") {
          return {
            select: () => ({
              eq: () => ({
                contains: () => ({
                  not: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: { employee_id: "hr-1" },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "approval_workflows") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: "wf-1",
                        name: "Standard 3-Step Workflow",
                        approval_workflow_steps: [
                          {
                            id: "step-1",
                            step_order: 1,
                            step_label: "Line Manager Review",
                            approver_type: "manager",
                            timeout_days: 2,
                            escalation_action: "escalate_to_manager_of_manager",
                          },
                          {
                            id: "step-2",
                            step_order: 2,
                            step_label: "Head of Department Review",
                            approver_type: "department_head",
                            timeout_days: 3,
                            escalation_action: "escalate_to_hr",
                          },
                          {
                            id: "step-3",
                            step_order: 3,
                            step_label: "HR Verification",
                            approver_type: "hr_admin",
                            timeout_days: 2,
                            escalation_action: "none",
                          },
                        ],
                      },
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
      },
    } as any;

    const chain = await resolveApprovalChain({
      organizationId: "org-1",
      requesterEmployeeId: "emp-1",
      requestType: "leave",
      client: mockClient,
    });

    expect(chain).toHaveLength(3);
    expect(chain[0].stepOrder).toBe(1);
    expect(chain[0].stepLabel).toBe("Line Manager Review");
    expect(chain[0].approverEmployeeId).toBe("mgr-1");
    expect(chain[0].timeoutDays).toBe(2);

    expect(chain[1].stepOrder).toBe(2);
    expect(chain[1].stepLabel).toBe("Head of Department Review");
    expect(chain[1].approverEmployeeId).toBe("hod-1");
    expect(chain[1].timeoutDays).toBe(3);

    expect(chain[2].stepOrder).toBe(3);
    expect(chain[2].stepLabel).toBe("HR Verification");
    expect(chain[2].approverEmployeeId).toBe("hr-1");
  });

  it("maps stepOrder, stepLabel, and escalation indicators into inbox rows", () => {
    const row = {
      id: "step-101",
      step_order: 2,
      step_label: "Head of Department Review",
      is_escalated: true,
      due_date: "2026-10-10T12:00:00Z",
      status: "pending",
      comment: null,
      approval_requests: {
        id: "req-101",
        request_type: "leave",
        status: "pending",
        submitted_at: "2026-10-06T00:00:00Z",
        payload: {
          leaveTypeName: "Annual Leave",
          startDate: "2026-10-20",
          endDate: "2026-10-22",
        },
        employees: {
          full_name: "Farah Lee",
          employee_number: "EMP-088",
          email: "farah@example.com",
        },
      },
    };

    const mapped = mapApprovalInboxRow(row);
    expect(mapped.stepOrder).toBe(2);
    expect(mapped.stepLabel).toBe("Head of Department Review");
    expect(mapped.isEscalated).toBe(true);
    expect(mapped.dueDate).toBe("2026-10-10T12:00:00Z");
    expect(mapped.status).toBe("pending");
  });
});
