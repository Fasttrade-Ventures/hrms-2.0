import { beforeEach, describe, expect, it, vi } from "vitest";

import { seedOrgCatalogs } from "../../apps/web/src/lib/platform/seed-org-catalogs";

function createAdminMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const upserts: Array<{ table: string; payload: unknown }> = [];

  const client = {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = vi.fn(chain);
      builder.eq = vi.fn(chain);
      builder.upsert = vi.fn((payload: unknown) => {
        upserts.push({ table, payload });
        return Promise.resolve({ error: null });
      });
      builder.insert = vi.fn((payload: unknown) => {
        inserts.push({ table, payload });
        return Promise.resolve({ error: null });
      });
      builder.then = (resolve: (value: { data: unknown[]; error: null }) => void) => {
        resolve({ data: [], error: null });
      };
      return builder;
    },
  };

  return { client, inserts, upserts };
}

describe("seedOrgCatalogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts leave/claim types and inserts missing payroll components", async () => {
    const { client, inserts, upserts } = createAdminMock();
    const result = await seedOrgCatalogs(client as never, "org-1");

    expect(result.leaveTypes).toBe(5);
    expect(result.claimTypes).toBe(4);
    expect(upserts.some((row) => row.table === "leave_types")).toBe(true);
    expect(upserts.some((row) => row.table === "claim_types")).toBe(true);
    expect(inserts.some((row) => row.table === "payroll_components")).toBe(true);
  });

  it("is idempotent when upsert reports duplicate", async () => {
    const { client } = createAdminMock();
    client.from = ((table: string) => {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = vi.fn(chain);
      builder.eq = vi.fn(chain);
      builder.upsert = vi.fn(() =>
        Promise.resolve({ error: { message: "duplicate key value violates unique constraint" } }),
      );
      builder.insert = vi.fn(() => Promise.resolve({ error: null }));
      builder.then = (resolve: (value: { data: unknown[]; error: null }) => void) => {
        resolve({ data: [{ code: "BASIC" }], error: null });
      };
      return builder;
    }) as typeof client.from;

    await expect(seedOrgCatalogs(client as never, "org-1")).resolves.toMatchObject({
      leaveTypes: 5,
      claimTypes: 4,
    });
  });
});
