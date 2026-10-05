import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth/session";
import { getEffectiveOrganizationId } from "@/lib/auth/organization-context";

describe("getEffectiveOrganizationId", () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "user-1", email: "a@example.com", fullName: "A" },
      membership: {
        organizationId: "org-real",
        employeeId: "emp-1",
        roles: ["employee"],
        permissions: [],
      },
    });
  });

  it("keeps a SaaS user on their own organization", async () => {
    process.env.DEPLOYMENT_MODE = "saas";
    await expect(getEffectiveOrganizationId()).resolves.toBe("org-real");
  });
});
