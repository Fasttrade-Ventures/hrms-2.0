import { describe, expect, it, vi } from "vitest";

import { provisionTenant } from "../../apps/web/src/lib/platform/provision-tenant";

function createThenableResult(data: unknown) {
  const result = { data, error: null };
  return {
    ...result,
    then(resolve: (value: typeof result) => unknown) {
      return Promise.resolve(result).then(resolve);
    },
  };
}

describe("provisionTenant (saas catalogs)", () => {
  it("seeds leave/claim/payroll catalogs after membership create", async () => {
    const tablesTouched: string[] = [];

    const admin = {
      from(table: string) {
        tablesTouched.push(table);
        const api: Record<string, unknown> = {};
        const chain = () => api;
        api.select = vi.fn(chain);
        api.eq = vi.fn(chain);
        api.delete = vi.fn(chain);
        api.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
        api.single = vi.fn(async () => {
          if (table === "organizations") return { data: { id: "org-new" }, error: null };
          if (table === "branches") return { data: { id: "branch-1" }, error: null };
          if (table === "employees") return { data: { id: "emp-1" }, error: null };
          return { data: { id: "row" }, error: null };
        });
        api.insert = vi.fn(() => {
          if (table === "organization_memberships" || table === "employee_profiles") {
            return createThenableResult(null);
          }
          if (table === "payroll_components") {
            return createThenableResult(null);
          }
          return api;
        });
        api.upsert = vi.fn(async () => ({ error: null }));
        api.then = (resolve: (v: { data: unknown[]; error: null }) => void) =>
          resolve({ data: [], error: null });
        return api;
      },
      auth: {
        admin: {
          createUser: vi.fn(async () => ({
            data: { user: { id: "user-1" } },
            error: null,
          })),
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
    };

    const result = await provisionTenant(admin as never, {
      company: "Acme SaaS",
      fullName: "Owner One",
      email: "owner@acme.test",
      password: "password123",
      productTier: "professional",
    });

    expect(result.organizationId).toBe("org-new");
    expect(tablesTouched).toContain("leave_types");
    expect(tablesTouched).toContain("claim_types");
    expect(tablesTouched).toContain("payroll_components");
  });
});
