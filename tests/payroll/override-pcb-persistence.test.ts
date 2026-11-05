import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hrms/domain", () => ({
  computeEmployeePayrun: vi.fn(() => ({})),
  money: vi.fn((value: unknown) => value),
}));

vi.mock("@/lib/auth/session", () => ({
  requireRoleOrPermission: vi.fn(),
}));

vi.mock("@/lib/auth/organization-context", () => ({
  requireOrganizationId: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/payroll/compensation", () => ({
  setEmployeePcbManualAmount: vi.fn(),
}));

vi.mock("@/lib/payroll/seed", () => ({
  ensurePayrollComponents: vi.fn(),
}));

vi.mock("@/lib/payroll/build-compute-input", () => ({
  buildEmployeePayrunComputeInput: vi.fn(() => ({})),
  payrunItemPatchFromResult: vi.fn(() => ({ net_pay: "900.00" })),
}));

vi.mock("@/lib/payroll/item-components", () => ({
  buildPayrunItemComponentRows: vi.fn(() => [
    {
      payrun_item_id: "item-1",
      organization_id: "org-1",
      component_id: "component-pcb",
      amount: "100.00",
    },
  ]),
}));

import { requireOrganizationId } from "@/lib/auth/organization-context";
import { requireRoleOrPermission } from "@/lib/auth/session";
import { overridePayrunPcb } from "@/lib/payroll/edit";
import { ensurePayrollComponents } from "@/lib/payroll/seed";
import { createClient } from "@/lib/supabase/server";

type WriteOperation =
  | "payrun-item-update"
  | "statutory-delete"
  | "statutory-insert"
  | "payrun-update";

class MockQueryBuilder implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private operation: "select" | "update" | "delete" | "insert" | null = null;

  constructor(
    private readonly table: string,
    private readonly writeErrors: Partial<Record<WriteOperation, string>>,
  ) {}

  select() {
    this.operation = "select";
    return this;
  }

  update() {
    this.operation = "update";
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  insert() {
    this.operation = "insert";
    return this;
  }

  eq() {
    return this;
  }

  in() {
    return this;
  }

  maybeSingle() {
    if (this.table === "payroll_payrun_items") {
      return Promise.resolve({
        data: {
          id: "item-1",
          payrun_id: "payrun-1",
          employee_id: "employee-1",
          branch_id: null,
          payroll_payruns: {
            status: "draft",
            period_year: 2026,
            earning_period_end: "2026-11-30",
            pay_groups: { cycle: "monthly" },
          },
          employees: {
            employee_profiles: {},
            employee_compensation: {},
            employee_dependents: [],
          },
        },
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: null });
  }

  then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.response()).then(onfulfilled, onrejected);
  }

  private response() {
    if (this.operation === "select") {
      return { data: [], error: null };
    }

    const operation = this.writeOperation();
    const message = operation ? this.writeErrors[operation] : undefined;
    return { data: null, error: message ? { message } : null };
  }

  private writeOperation(): WriteOperation | null {
    if (this.table === "payroll_payrun_items" && this.operation === "update") {
      return "payrun-item-update";
    }
    if (this.table === "payroll_item_components" && this.operation === "delete") {
      return "statutory-delete";
    }
    if (this.table === "payroll_item_components" && this.operation === "insert") {
      return "statutory-insert";
    }
    if (this.table === "payroll_payruns" && this.operation === "update") {
      return "payrun-update";
    }
    return null;
  }
}

describe("overridePayrunPcb persistence errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRoleOrPermission).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(requireOrganizationId).mockResolvedValue("org-1");
    vi.mocked(ensurePayrollComponents).mockResolvedValue(
      new Map([["DED_PCB", "component-pcb"]]),
    );
  });

  it.each([
    ["payrun item update", "payrun-item-update"],
    ["statutory delete", "statutory-delete"],
    ["statutory insert", "statutory-insert"],
    ["payrun audit update", "payrun-update"],
  ] as const)("throws when the %s fails", async (_label, operation) => {
    const message = `${operation} failed`;
    vi.mocked(createClient).mockResolvedValue({
      from(table: string) {
        return new MockQueryBuilder(table, { [operation]: message });
      },
    } as never);

    await expect(overridePayrunPcb("item-1", 100, "user-1")).rejects.toThrow(message);
  });
});
