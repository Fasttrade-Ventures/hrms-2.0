"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";

import {
  createHoliday,
  deleteHoliday,
  updateHoliday,
  type OrgActionState,
} from "@/app/(hr)/hr/organization/actions";
import {
  HrField,
  HrSelect,
  HrTextInput,
  OrgDeleteButton,
  OrgFormActions,
  OrgFormCard,
  OrgStatCards,
  OrgTableShell,
  StatusPill,
} from "@/components/hr/organization/org-ui";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { HolidayRow } from "@/lib/hr/organization";

const initialState: OrgActionState = {};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function HolidaysList({
  holidays,
  year,
}: {
  holidays: HolidayRow[];
  year: number;
}) {
  const orgWide = holidays.filter((row) => !row.branchId).length;
  const years = [year - 1, year, year + 1];

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
              href="/hr/organization"
            >
              Back to hub
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              href="/hr/organization/holidays/create"
            >
              Add holiday
            </Link>
          </div>
        }
        description="Public and company holidays used in working-day calculation."
        title="Holidays"
      />

      <div className="flex flex-wrap gap-2">
        {years.map((item) => (
          <Link
            className={`inline-flex h-9 items-center rounded-[var(--radius-sm)] border px-3 text-sm font-medium ${
              item === year
                ? "border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]"
                : "border-[var(--border-primary)] bg-[var(--surface-card)] hover:bg-[var(--surface-muted)]"
            }`}
            href={`/hr/organization/holidays?year=${item}`}
            key={item}
          >
            {item}
          </Link>
        ))}
      </div>

      <OrgStatCards
        items={[
          { label: "Holidays", value: holidays.length, hint: `${year} gazette` },
          { label: "Org-wide", value: orgWide, hint: "all branches" },
          {
            label: "Branch-specific",
            value: holidays.length - orgWide,
            hint: "site only",
          },
        ]}
      />

      <OrgTableShell
        emptyDescription="Add public or company holidays for this year."
        emptyTitle="No holidays yet"
        headers={["Name", "Date", "Scope", "Created", "Status", "Action"]}
        isEmpty={holidays.length === 0}
      >
        {holidays.map((holiday) => (
          <div className="grid items-center gap-3 px-3.5 py-3 md:grid-cols-6" key={holiday.id}>
            <p className="text-sm font-semibold text-[var(--foreground-primary)]">{holiday.name}</p>
            <p className="text-sm text-[var(--foreground-secondary)]">{formatDate(holiday.holidayDate)}</p>
            <p className="text-sm text-[var(--foreground-muted)]">
              {holiday.branchName ?? "Org-wide"}
            </p>
            <p className="text-sm text-[var(--foreground-muted)]">
              {new Date(holiday.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })}
            </p>
            <StatusPill label="Active" tone="success" />
            <div>
              <Link
                className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] px-3 text-sm font-medium hover:bg-[var(--surface-muted)]"
                href={`/hr/organization/holidays/${holiday.id}/edit`}
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
      </OrgTableShell>
    </div>
  );
}

export function HolidayForm({
  holiday,
  branches,
}: {
  holiday?: HolidayRow;
  branches: Array<{ id: string; name: string }>;
}) {
  const boundUpdate = useMemo(
    () => (holiday ? updateHoliday.bind(null, holiday.id) : createHoliday),
    [holiday],
  );
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/hr/organization/holidays"
          >
            Back to list
          </Link>
        }
        description="Leave branch empty for an organization-wide holiday."
        title={holiday ? "Edit holiday" : "Create holiday"}
      />

      <OrgFormCard
        backHref="/hr/organization/holidays"
        description="Holidays affect leave working-day calculation and calendars."
        title={holiday ? "Edit holiday" : "Create holiday"}
      >
        <form action={formAction} className="space-y-5">
          <HrField id="name" label="Holiday name">
            <HrTextInput defaultValue={holiday?.name ?? ""} id="name" name="name" required />
          </HrField>
          <div className="grid gap-4 md:grid-cols-2">
            <HrField id="holidayDate" label="Date">
              <HrTextInput
                defaultValue={holiday?.holidayDate ?? ""}
                id="holidayDate"
                name="holidayDate"
                required
                type="date"
              />
            </HrField>
            <HrField id="branchId" label="Branch scope">
              <HrSelect defaultValue={holiday?.branchId ?? ""} id="branchId" name="branchId">
                <option value="">Org-wide</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </HrSelect>
            </HrField>
          </div>
          <OrgFormActions
            cancelHref="/hr/organization/holidays"
            error={state.error}
            extra={
              holiday ? (
                <OrgDeleteButton
                  confirmDescription="This permanently removes the holiday from the calendar."
                  confirmTitle={`Delete ${holiday.name}?`}
                  label="Delete holiday"
                  onDelete={() => deleteHoliday(holiday.id)}
                  redirectHref="/hr/organization/holidays"
                />
              ) : null
            }
            pending={pending}
            submitLabel={holiday ? "Save holiday" : "Create holiday"}
            success={state.success}
          />
        </form>
      </OrgFormCard>
    </div>
  );
}
