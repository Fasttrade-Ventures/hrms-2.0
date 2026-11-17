import { describe, expect, it, vi } from "vitest";

import { ensureEmployeeHasManagerRole } from "@/lib/employees/ensure-manager-role";

describe("ensureEmployeeHasManagerRole", () => {
  it("adds manager while keeping employee", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "mem-1", roles: ["employee"] },
      error: null,
    });
    const admin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
        update,
      }),
    };

    await ensureEmployeeHasManagerRole(admin as never, {
      organizationId: "org-1",
      employeeId: "emp-1",
    });

    expect(update).toHaveBeenCalledWith({ roles: ["employee", "manager"] });
  });

  it("no-ops when manager role already present", async () => {
    const update = vi.fn();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "mem-1", roles: ["employee", "manager"] },
      error: null,
    });
    const admin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
        update,
      }),
    };

    await ensureEmployeeHasManagerRole(admin as never, {
      organizationId: "org-1",
      employeeId: "emp-1",
    });

    expect(update).not.toHaveBeenCalled();
  });
});
