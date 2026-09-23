import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/employee/leave", () => ({
  requireEmployeeContext: vi.fn(),
  createLeaveRequest: vi.fn(),
}));

vi.mock("@/lib/files/storage", () => ({
  assertDocumentUpload: vi.fn(),
  uploadOrganizationFile: vi.fn(),
  getSignedDownloadUrl: vi.fn(),
}));

import { applyLeave } from "@/app/(employee)/employee/actions";
import { createLeaveRequest, requireEmployeeContext } from "@/lib/employee/leave";
import { canDownloadFile } from "@/lib/files/download-auth";
import { assertDocumentUpload, uploadOrganizationFile } from "@/lib/files/storage";
import { clearRateLimitStore } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const VALID_LEAVE_TYPE_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const MOCK_ORG_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_EMPLOYEE_ID = "00000000-0000-0000-0000-000000000002";
const MOCK_MANAGER_ID = "00000000-0000-0000-0000-000000000003";
const MOCK_STEP_APPROVER_ID = "00000000-0000-0000-0000-000000000004";
const MOCK_OTHER_EMPLOYEE_ID = "00000000-0000-0000-0000-000000000005";
const MOCK_FILE_ID = "00000000-0000-0000-0000-000000000099";
const MOCK_LEAVE_REQUEST_ID = "00000000-0000-0000-0000-000000000100";
const MOCK_APPROVAL_REQUEST_ID = "00000000-0000-0000-0000-000000000200";

describe("Leave Attachment / MC Upload Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitStore();

    vi.mocked(requireEmployeeContext).mockResolvedValue({
      session: { user: { id: "user-emp-1" } } as any,
      employeeId: MOCK_EMPLOYEE_ID,
      organizationId: MOCK_ORG_ID,
    });

    vi.mocked(createLeaveRequest).mockResolvedValue(MOCK_LEAVE_REQUEST_ID);
    vi.mocked(uploadOrganizationFile).mockResolvedValue(MOCK_FILE_ID);
  });

  describe("applyLeave action attachment requirements", () => {
    it("fails when leave type requires_attachment = true and no file is provided", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "leave_types") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { name: "Medical Leave", requires_attachment: true },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const formData = new FormData();
      formData.set("leaveTypeId", VALID_LEAVE_TYPE_UUID);
      formData.set("startDate", "2026-09-25");
      formData.set("endDate", "2026-09-25");
      formData.set("reason", "Fever and flu");

      const result = await applyLeave({}, formData);
      expect(result).toEqual({ error: "An attachment is required for Medical Leave." });
      expect(uploadOrganizationFile).not.toHaveBeenCalled();
      expect(createLeaveRequest).not.toHaveBeenCalled();
    });

    it("fails when leave type requires_attachment = true and empty 0-byte file is provided", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "leave_types") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { name: "Medical Leave", requires_attachment: true },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const emptyFile = new File([], "empty-mc.pdf", { type: "application/pdf" });
      const formData = new FormData();
      formData.set("leaveTypeId", VALID_LEAVE_TYPE_UUID);
      formData.set("startDate", "2026-09-25");
      formData.set("endDate", "2026-09-25");
      formData.set("file", emptyFile);

      const result = await applyLeave({}, formData);
      expect(result).toEqual({ error: "An attachment is required for Medical Leave." });
      expect(uploadOrganizationFile).not.toHaveBeenCalled();
    });

    it("successfully uploads MC file to R2 and creates leave request when valid file is provided", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "leave_types") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { name: "Medical Leave", requires_attachment: true },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const validMcFile = new File(["mc content simulation"], "clinic-mc.pdf", {
        type: "application/pdf",
      });
      const formData = new FormData();
      formData.set("leaveTypeId", VALID_LEAVE_TYPE_UUID);
      formData.set("startDate", "2026-09-25");
      formData.set("endDate", "2026-09-25");
      formData.set("reason", "Doctor visit");
      formData.set("file", validMcFile);

      await expect(applyLeave({}, formData)).rejects.toThrow("NEXT_REDIRECT");

      expect(assertDocumentUpload).toHaveBeenCalledWith(validMcFile);
      expect(uploadOrganizationFile).toHaveBeenCalledWith({
        organizationId: MOCK_ORG_ID,
        category: "leave-attachments",
        fileName: "clinic-mc.pdf",
        contentType: "application/pdf",
        body: expect.any(Uint8Array),
        uploadedByUserId: "user-emp-1",
      });

      expect(createLeaveRequest).toHaveBeenCalledWith({
        leaveTypeId: VALID_LEAVE_TYPE_UUID,
        startDate: "2026-09-25",
        endDate: "2026-09-25",
        halfDay: false,
        reason: "Doctor visit",
        attachmentFileId: MOCK_FILE_ID,
      });
    });

    it("allows optional file upload for leave type where requires_attachment = false", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "leave_types") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { name: "Annual Leave", requires_attachment: false },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const flightTicket = new File(["flight itinerary"], "ticket.pdf", {
        type: "application/pdf",
      });
      const formData = new FormData();
      formData.set("leaveTypeId", VALID_LEAVE_TYPE_UUID);
      formData.set("startDate", "2026-10-01");
      formData.set("endDate", "2026-10-05");
      formData.set("file", flightTicket);

      await expect(applyLeave({}, formData)).rejects.toThrow("NEXT_REDIRECT");

      expect(uploadOrganizationFile).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "leave-attachments",
          fileName: "ticket.pdf",
        }),
      );
      expect(createLeaveRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          attachmentFileId: MOCK_FILE_ID,
        }),
      );
    });
  });

  describe("canDownloadFile authorization for leave-attachments", () => {
    beforeEach(() => {
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "file_objects") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: MOCK_FILE_ID,
                        category: "leave-attachments",
                        organization_id: MOCK_ORG_ID,
                        deleted_at: null,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);
    });

    it("allows HR administrator to download leave attachments", async () => {
      const allowed = await canDownloadFile({
        roles: ["hr_administrator"],
        employeeId: MOCK_OTHER_EMPLOYEE_ID,
        fileId: MOCK_FILE_ID,
        organizationId: MOCK_ORG_ID,
        userId: "user-hr",
      });
      expect(allowed).toBe(true);
    });

    it("allows organization owner and platform administrator to download leave attachments", async () => {
      const allowedOwner = await canDownloadFile({
        roles: ["organization_owner"],
        employeeId: null,
        fileId: MOCK_FILE_ID,
        organizationId: MOCK_ORG_ID,
        userId: "user-owner",
      });
      expect(allowedOwner).toBe(true);

      const allowedPlatformAdmin = await canDownloadFile({
        roles: ["platform_administrator"],
        employeeId: null,
        fileId: MOCK_FILE_ID,
        organizationId: MOCK_ORG_ID,
        userId: "user-platform-admin",
      });
      expect(allowedPlatformAdmin).toBe(true);
    });

    it("allows the requesting employee to download their own leave attachment", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "leave_requests") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: MOCK_LEAVE_REQUEST_ID,
                        employee_id: MOCK_EMPLOYEE_ID,
                        approval_request_id: MOCK_APPROVAL_REQUEST_ID,
                        employees: { manager_employee_id: MOCK_MANAGER_ID },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const allowed = await canDownloadFile({
        roles: ["employee"],
        employeeId: MOCK_EMPLOYEE_ID,
        fileId: MOCK_FILE_ID,
        organizationId: MOCK_ORG_ID,
        userId: "user-emp-1",
      });
      expect(allowed).toBe(true);
    });

    it("allows direct manager to download employee's leave attachment", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "leave_requests") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: MOCK_LEAVE_REQUEST_ID,
                        employee_id: MOCK_EMPLOYEE_ID,
                        approval_request_id: MOCK_APPROVAL_REQUEST_ID,
                        employees: { manager_employee_id: MOCK_MANAGER_ID },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const allowed = await canDownloadFile({
        roles: ["manager"],
        employeeId: MOCK_MANAGER_ID,
        fileId: MOCK_FILE_ID,
        organizationId: MOCK_ORG_ID,
        userId: "user-mgr",
      });
      expect(allowed).toBe(true);
    });

    it("allows assigned step approver to download leave attachment even if not direct manager", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "leave_requests") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: MOCK_LEAVE_REQUEST_ID,
                        employee_id: MOCK_EMPLOYEE_ID,
                        approval_request_id: MOCK_APPROVAL_REQUEST_ID,
                        employees: { manager_employee_id: MOCK_MANAGER_ID },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "approval_steps") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { id: "step-1" },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const allowed = await canDownloadFile({
        roles: ["manager"],
        employeeId: MOCK_STEP_APPROVER_ID,
        fileId: MOCK_FILE_ID,
        organizationId: MOCK_ORG_ID,
        userId: "user-step-mgr",
      });
      expect(allowed).toBe(true);
    });

    it("blocks an unrelated employee from downloading leave attachment", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "leave_requests") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: MOCK_LEAVE_REQUEST_ID,
                        employee_id: MOCK_EMPLOYEE_ID,
                        approval_request_id: MOCK_APPROVAL_REQUEST_ID,
                        employees: { manager_employee_id: MOCK_MANAGER_ID },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "approval_steps") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: null,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const allowed = await canDownloadFile({
        roles: ["employee"],
        employeeId: MOCK_OTHER_EMPLOYEE_ID,
        fileId: MOCK_FILE_ID,
        organizationId: MOCK_ORG_ID,
        userId: "user-other",
      });
      expect(allowed).toBe(false);
    });
  });
});
