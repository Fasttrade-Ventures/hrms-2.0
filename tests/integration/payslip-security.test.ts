import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock imports before importing the functions under test
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/employee/leave", () => ({
  requireEmployeeContext: vi.fn(),
}));

import { requireEmployeeContext } from "@/lib/employee/leave";
import { createClient } from "@/lib/supabase/server";
import { getPayslip, listPayslips } from "@/lib/employee/payslips";

let mockPayrunItemsResponse: any = null;
let mockComponentsResponse: any = null;

class MockSupabaseQueryBuilder {
  tableName: string;
  calledSelect: string | null = null;
  calledEqs: Array<[string, any]> = [];
  calledOrder: [string, any] | null = null;
  calledMaybeSingle = false;

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

  order(column: string, options?: any) {
    this.calledOrder = [column, options];
    const data = this.tableName === "payroll_item_components" ? mockComponentsResponse : mockPayrunItemsResponse;
    return Promise.resolve({ data, error: null });
  }

  maybeSingle() {
    this.calledMaybeSingle = true;
    const data = this.tableName === "payroll_item_components" ? mockComponentsResponse : mockPayrunItemsResponse;
    return Promise.resolve({ data, error: null });
  }
}

describe("payslip access security", () => {
  let queries: MockSupabaseQueryBuilder[];
  const mockEmployeeId = "emp-123";
  const mockOrgId = "org-456";

  beforeEach(() => {
    queries = [];
    mockPayrunItemsResponse = null;
    mockComponentsResponse = null;
    vi.clearAllMocks();

    // Mock requireEmployeeContext to simulate logged in user context
    vi.mocked(requireEmployeeContext).mockResolvedValue({
      session: { membership: { employeeId: mockEmployeeId } } as any,
      employeeId: mockEmployeeId,
      organizationId: mockOrgId,
    });

    // Mock createClient to return the mocked query builder
    vi.mocked(createClient).mockResolvedValue({
      from(tableName: string) {
        const builder = new MockSupabaseQueryBuilder(tableName);
        queries.push(builder);
        return builder;
      },
    } as any);
  });

  describe("listPayslips", () => {
    it("successfully lists only locked payslips for the logged-in employee", async () => {
      // Setup resolved data BEFORE invoking
      mockPayrunItemsResponse = [
        {
          id: "item-1",
          gross_pay: 5000,
          net_pay: 4200,
          payroll_payruns: {
            period_year: 2026,
            period_month: 7,
            status: "locked",
            locked_at: "2026-08-01T00:00:00Z",
          },
        },
      ];

      // Execute listPayslips
      const result = await listPayslips();

      // Assertions
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("item-1");
      expect(result[0]!.status).toBe("locked");

      // Verify DB query constraints
      expect(queries).toHaveLength(1);
      const query = queries[0]!;
      expect(query.tableName).toBe("payroll_payrun_items");
      
      // Verify all eq constraints
      const eqsMap = new Map(query.calledEqs);
      expect(eqsMap.get("organization_id")).toBe(mockOrgId);
      expect(eqsMap.get("employee_id")).toBe(mockEmployeeId);
      expect(eqsMap.get("payroll_payruns.status")).toBe("locked");
    });

    it("filters out any non-locked (draft) payslips returned by DB as defense-in-depth", async () => {
      mockPayrunItemsResponse = [
        {
          id: "item-2",
          gross_pay: 6000,
          net_pay: 5000,
          payroll_payruns: {
            period_year: 2026,
            period_month: 7,
            status: "draft",
            locked_at: null,
          },
        },
      ];

      const result = await listPayslips();
      expect(result).toHaveLength(0);
    });
  });

  describe("getPayslip", () => {
    it("successfully gets a locked payslip for the logged-in employee", async () => {
      const mockItemId = "item-1";
      mockPayrunItemsResponse = {
        id: mockItemId,
        gross_pay: 5000,
        net_pay: 4200,
        epf_employee: 550,
        epf_employer: 650,
        socso_employee: 24,
        socso_employer: 85,
        eis_employee: 7.9,
        eis_employer: 7.9,
        pcb: 150,
        payroll_payruns: {
          period_year: 2026,
          period_month: 7,
          status: "locked",
          locked_at: "2026-08-01T00:00:00Z",
        },
      };

      mockComponentsResponse = [
        {
          amount: 5000,
          payroll_components: {
            code: "BASIC",
            name: "Basic Salary",
            component_type: "earning",
          },
        },
      ];

      const result = await getPayslip(mockItemId);

      // Assertions
      expect(result).not.toBeNull();
      expect(result!.id).toBe(mockItemId);
      expect(result!.status).toBe("locked");
      expect(result!.components.earnings).toHaveLength(1);
      expect(result!.components.earnings[0]!.code).toBe("BASIC");

      // Verify the first query (payroll_payrun_items)
      expect(queries.length).toBeGreaterThanOrEqual(1);
      const payrunQuery = queries[0]!;
      expect(payrunQuery.tableName).toBe("payroll_payrun_items");
      
      const payrunEqs = new Map(payrunQuery.calledEqs);
      expect(payrunEqs.get("organization_id")).toBe(mockOrgId);
      expect(payrunEqs.get("employee_id")).toBe(mockEmployeeId);
      expect(payrunEqs.get("id")).toBe(mockItemId);
      expect(payrunEqs.get("payroll_payruns.status")).toBe("locked");

      // Verify the second query (payroll_item_components)
      const componentQuery = queries[1]!;
      expect(componentQuery.tableName).toBe("payroll_item_components");
      
      const componentEqs = new Map(componentQuery.calledEqs);
      expect(componentEqs.get("payrun_item_id")).toBe(mockItemId);
      expect(componentEqs.get("organization_id")).toBe(mockOrgId);
    });

    it("returns null if the payslip is not locked", async () => {
      const mockItemId = "item-draft";
      mockPayrunItemsResponse = {
        id: mockItemId,
        gross_pay: 5000,
        net_pay: 4200,
        epf_employee: 550,
        epf_employer: 650,
        socso_employee: 24,
        socso_employer: 85,
        eis_employee: 7.9,
        eis_employer: 7.9,
        pcb: 150,
        payroll_payruns: {
          period_year: 2026,
          period_month: 7,
          status: "draft",
          locked_at: null,
        },
      };

      const result = await getPayslip(mockItemId);
      expect(result).toBeNull();
    });

    it("returns null if DB returns nothing (wrong id or wrong employee_id)", async () => {
      const mockItemId = "item-other";
      mockPayrunItemsResponse = null;

      const result = await getPayslip(mockItemId);
      expect(result).toBeNull();
    });
  });
});
