import { describe, expect, it } from "vitest";

import { selectMembershipRow, type MembershipRow } from "../../apps/web/src/lib/auth/membership-selection";

const rows: MembershipRow[] = [
  {
    organization_id: "org-a",
    employee_id: "emp-a",
    roles: ["employee"],
    permissions: [],
  },
  {
    organization_id: "org-b",
    employee_id: "emp-b",
    roles: ["organization_owner", "hr_administrator"],
    permissions: [],
  },
];

describe("selectMembershipRow", () => {
  it("standalone prefers DEFAULT org", () => {
    const selected = selectMembershipRow(rows, {
      deploymentMode: "standalone",
      defaultOrgId: "org-b",
    });
    expect(selected?.organization_id).toBe("org-b");
  });

  it("saas prefers active-org cookie over first membership", () => {
    const selected = selectMembershipRow(rows, {
      deploymentMode: "saas",
      activeOrgId: "org-a",
    });
    expect(selected?.organization_id).toBe("org-a");
  });

  it("saas falls back to first membership when cookie missing", () => {
    const selected = selectMembershipRow(rows, { deploymentMode: "saas" });
    expect(selected?.organization_id).toBe("org-a");
  });

  it("platform impersonation returns synthetic membership row", () => {
    const withPlatform: MembershipRow[] = [
      ...rows,
      {
        organization_id: "platform",
        employee_id: null,
        roles: ["platform_administrator"],
        permissions: [],
      },
    ];
    const selected = selectMembershipRow(withPlatform, {
      deploymentMode: "saas",
      impersonateOrgId: "org-target",
    });
    expect(selected?.organization_id).toBe("org-target");
    expect(selected?.roles).toContain("organization_owner");
  });
});
