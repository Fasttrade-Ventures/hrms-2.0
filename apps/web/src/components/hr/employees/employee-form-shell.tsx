"use client";

import type { FormHTMLAttributes, ReactNode } from "react";

import { HrGhostButton, HrPrimaryButton } from "@/components/hr/employees/form-fields";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export const EMPLOYEE_FORM_TABS = [
  { id: "employment", label: "Employment" },
  { id: "personal", label: "Personal & bank" },
  { id: "family", label: "Family" },
  { id: "emergency", label: "Emergency" },
] as const;

export type EmployeeFormTabId = (typeof EMPLOYEE_FORM_TABS)[number]["id"];

export function EmployeeFormBanner({ children }: { children: ReactNode }) {
  return (
    <Card className="border-primary/30 bg-accent py-3">
      <CardContent className="py-0 text-sm text-foreground">{children}</CardContent>
    </Card>
  );
}

export function EmployeeFormShell({
  tab,
  onTabChange,
  formProps,
  children,
  footer,
}: {
  tab: EmployeeFormTabId;
  onTabChange: (tab: EmployeeFormTabId) => void;
  formProps: FormHTMLAttributes<HTMLFormElement>;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Card className="overflow-hidden py-0">
      <form {...formProps}>
        <div className="border-b bg-muted/40 px-4 py-3">
          <Label className="mb-2 block text-xs text-muted-foreground">Form section</Label>
          <ToggleGroup
            className="flex w-full flex-wrap"
            onValueChange={(values) => {
              const next = values.at(-1) as EmployeeFormTabId | undefined;
              if (next) onTabChange(next);
            }}
            spacing={0}
            value={[tab]}
            variant="outline"
          >
            {EMPLOYEE_FORM_TABS.map((item, index) => (
              <ToggleGroupItem
                aria-label={item.label}
                className="min-w-0 flex-1 px-2 text-[11px] sm:text-xs"
                key={item.id}
                value={item.id}
              >
                {index + 1}. {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <CardContent className="space-y-5 py-5">{children}</CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30">
          {footer}
        </CardFooter>
      </form>
    </Card>
  );
}

export function EmployeeFormTabPanel({
  tab,
  activeTab,
  children,
}: {
  tab: EmployeeFormTabId;
  activeTab: EmployeeFormTabId;
  children: ReactNode;
}) {
  return <div className={cn("space-y-5", activeTab !== tab && "hidden")}>{children}</div>;
}

export function EmployeeFormSectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Label>
      {action}
    </div>
  );
}

export function EmployeeFormSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="bg-muted/20 py-4" size="sm">
      <CardContent className="space-y-4 pt-0">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </Label>
        {children}
      </CardContent>
    </Card>
  );
}

export function EmployeeFormRepeaterRow({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <Card className="py-4" size="sm">
      <CardContent className="grid gap-4 pt-0 md:grid-cols-[1fr_1fr_1fr_auto]">
        {children}
        <div className="flex items-end pb-1">
          <Button
            aria-label={removeLabel}
            onClick={onRemove}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            ⌫
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmployeeFormPayrollSection({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <Separator />
      <Label className="text-sm font-semibold text-primary">Payroll & statutory</Label>
      {children}
    </div>
  );
}

export function EmployeeFormFooterNav({
  tab,
  onTabChange,
  cancelHref,
  pending,
  submitLabel = "Save full profile",
}: {
  tab: EmployeeFormTabId;
  onTabChange: (tab: EmployeeFormTabId) => void;
  cancelHref: string;
  pending: boolean;
  submitLabel?: string;
}) {
  const tabIndex = EMPLOYEE_FORM_TABS.findIndex((item) => item.id === tab);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {tab !== "employment" ? (
          <HrGhostButton
            onClick={() => onTabChange(EMPLOYEE_FORM_TABS[Math.max(0, tabIndex - 1)]!.id)}
            type="button"
          >
            Previous
          </HrGhostButton>
        ) : null}
        {tab !== "emergency" ? (
          <HrGhostButton
            onClick={() =>
              onTabChange(EMPLOYEE_FORM_TABS[Math.min(EMPLOYEE_FORM_TABS.length - 1, tabIndex + 1)]!.id)
            }
            type="button"
          >
            Next
          </HrGhostButton>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <HrLinkButton href={cancelHref} variant="outline">
          Cancel
        </HrLinkButton>
        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Saving…" : submitLabel}
        </HrPrimaryButton>
      </div>
    </>
  );
}
