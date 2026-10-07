import { describe, expect, it, vi } from "vitest";

import { escalateOverdueApprovalSteps } from "../../apps/web/src/lib/approvals/escalation";

const { updatedRecords, auditLogs, notifications } = vi.hoisted(() => ({
  updatedRecords: [] as any[],
  auditLogs: [] as any[],
  notifications: [] as any[],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "approval_steps") {
        const stepData = [
          {
            id: "step-overdue-1",
            organization_id: "org-1",
            approval_request_id: "req-1",
            step_order: 1,
            step_label: "Line Manager",
            approver_employee_id: "mgr-1",
            timeout_days: 2,
            due_date: "2026-10-01T00:00:00Z",
            escalation_action: "escalate_to_manager_of_manager",
            approval_requests: {
              id: "req-1",
              request_type: "leave",
              requester_employee_id: "emp-1",
              payload: {},
            },
          },
        ];

        const builder: any = {
          eq: () => builder,
          not: () => builder,
          lt: async () => ({ data: stepData, error: null }),
        };

        return {
          select: () => builder,
          update: (data: any) => ({
            eq: (col: string, val: string) => {
              updatedRecords.push({ data, col, val });
              return { error: null };
            },
          }),
        };
      }

      if (table === "employees") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { manager_employee_id: "director-1" },
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
              eq: () => ({
                maybeSingle: async () => ({
                  data: { user_id: "user-director-1" },
                }),
              }),
            }),
          }),
        };
      }

      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
    },
  }),
}));

vi.mock("@/lib/audit/log-event", () => ({
  logAuditEvent: async (event: any) => {
    auditLogs.push(event);
  },
}));

vi.mock("@/lib/notifications/queue", () => ({
  queueNotification: async (notif: any) => {
    notifications.push(notif);
  },
}));

describe("Approval Escalation Engine", () => {
  it("reassigns overdue pending step to manager of manager", async () => {
    const result = await escalateOverdueApprovalSteps({
      organizationId: "org-1",
      asOfDate: "2026-10-06T12:00:00Z",
    });

    expect(result.escalatedCount).toBe(1);
    expect(result.escalatedStepIds).toContain("step-overdue-1");
    expect(updatedRecords).toHaveLength(1);
    expect(updatedRecords[0].data.is_escalated).toBe(true);
    expect(updatedRecords[0].data.escalated_from_employee_id).toBe("mgr-1");
    expect(updatedRecords[0].data.approver_employee_id).toBe("director-1");
  });
});
