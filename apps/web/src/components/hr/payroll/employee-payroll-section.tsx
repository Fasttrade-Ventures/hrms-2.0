"use client";

import { useState } from "react";

import { EmployeeCompensationPanel } from "@/components/hr/employees/employee-compensation-panel";
import { EmployeeTaxProfilePanel } from "@/components/hr/employees/employee-tax-profile-panel";
import { cn } from "@/lib/utils";
import type { DisplayCurrency } from "@/lib/money";
import type {
  AllowanceComponentOption,
  EmployeeCompensation,
  EmployeeTaxProfile,
  RecurringAllowance,
} from "@/lib/payroll/compensation";
import { PortalSectionCard } from "@/components/portal/portal-section";

type PayrollTab = "compensation" | "tax";

export function EmployeePayrollSection({
  employeeId,
  compensation,
  allowances,
  allowanceComponents,
  taxProfile,
  country = "MY",
  currency = "MYR",
}: {
  country?: "MY" | "AU";
  currency?: DisplayCurrency;
  employeeId: string;
  compensation: EmployeeCompensation;
  allowances: RecurringAllowance[];
  allowanceComponents: AllowanceComponentOption[];
  taxProfile: EmployeeTaxProfile;
}) {
  const [tab, setTab] = useState<PayrollTab>("compensation");

  const isMy = country === "MY";
  const tabs: Array<{ id: PayrollTab; label: string }> = [
    { id: "compensation", label: "Compensation" },
    ...(isMy ? [{ id: "tax" as const, label: "Tax (TP1/TP3)" }] : []),
  ];

  return (
    <PortalSectionCard
      description={
        isMy
          ? "Set salary, EPF rates, allowances, and tax (TP1/TP3) for payrun calculations."
          : "Set salary and allowances for payrun calculations."
      }
      title="Payroll configuration"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b">
          {tabs.map((item) => (
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium",
                tab === item.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "compensation" || !isMy ? (
          <EmployeeCompensationPanel
            allowanceComponents={allowanceComponents}
            allowances={allowances}
            compensation={compensation}
            country={country}
            currency={currency}
            employeeId={employeeId}
          />
        ) : (
          <EmployeeTaxProfilePanel employeeId={employeeId} taxProfile={taxProfile} />
        )}
      </div>
    </PortalSectionCard>
  );
}
