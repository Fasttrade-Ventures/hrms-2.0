"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createHoliday,
  deleteHoliday,
  updateHoliday,
  type OrgActionState,
} from "@/app/(hr)/hr/organization/actions";
import { ImportHolidaysDialog } from "@/components/hr/organization/import-holidays-dialog";
import {
  HrField,
  HrSelect,
  HrTextInput,
  OrgDeleteButton,
  OrgFormActions,
  OrgFormCard,
  OrgStatCards,
  OrgTableCell,
  OrgTableEditLink,
  OrgTableRow,
  OrgTableShell,
  OrgTableStatus,
} from "@/components/hr/organization/org-ui";
import { HrFilterButton, HrLinkButton, HrPagination } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getHolidayYearOptions, getHolidayYearRange } from "@/lib/hr/holiday-window";
import type {
  BranchImportOption,
  HolidayBranchFilter,
  HolidayRow,
} from "@/lib/hr/organization";

const initialState: OrgActionState = {};

type HolidaySort = "date" | "name" | "scope" | "created";
type HolidayOrder = "asc" | "desc";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildHolidayHref({
  year,
  branchId = "all",
  sort = "date",
  order = "asc",
  page = 1,
}: {
  year: number;
  branchId?: string;
  sort?: HolidaySort;
  order?: HolidayOrder;
  page?: number;
}) {
  const params = new URLSearchParams();
  params.set("year", String(year));
  if (branchId !== "all") params.set("branchId", branchId);
  if (sort !== "date") params.set("sort", sort);
  if (order !== "asc") params.set("order", order);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/hr/organization/holidays${query ? `?${query}` : ""}`;
}

export function HolidaysList({
  holidays,
  branches,
  branchFilters,
  year,
  branchId,
  sort,
  order,
  page,
  pageSize,
  total,
  yearTotal,
  orgWideCount,
}: {
  holidays: HolidayRow[];
  branches: BranchImportOption[];
  branchFilters: HolidayBranchFilter[];
  year: number;
  branchId: string;
  sort: HolidaySort;
  order: HolidayOrder;
  page: number;
  pageSize: number;
  total: number;
  yearTotal: number;
  orgWideCount: number;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const years = getHolidayYearOptions();
  const { minYear, maxYear } = getHolidayYearRange();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => {
    if (pageCount <= 5) return index + 1;
    const start = Math.min(Math.max(1, page - 2), pageCount - 4);
    return start + index;
  });

  const listParams = { year, branchId, sort, order };

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <HrLinkButton href="/hr/organization" variant="outline">
              Back to hub
            </HrLinkButton>
            <Button
              disabled={branches.length === 0}
              onClick={() => setImportOpen(true)}
              type="button"
              variant="outline"
            >
              Import holidays
            </Button>
            <HrLinkButton href="/hr/organization/holidays/create">Add holiday</HrLinkButton>
          </div>
        }
        description={`Public and company holidays used in working-day calculation. Storage window: ${minYear}–${maxYear}.`}
        title="Holidays"
      />

      <ImportHolidaysDialog
        branches={branches}
        defaultYear={year}
        onClose={() => setImportOpen(false)}
        open={importOpen}
      />

      <Card className="py-0">
        <CardContent className="flex flex-col gap-3 py-4">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <div className="flex flex-wrap gap-1.5">
            {years.map((item) => (
              <HrFilterButton
                active={item === year}
                href={buildHolidayHref({ year: item, branchId, sort, order })}
                key={item}
              >
                {item}
              </HrFilterButton>
            ))}
          </div>
        </CardContent>
      </Card>

      <OrgStatCards
        items={[
          { label: "Holidays", value: yearTotal, hint: `${year} gazette` },
          { label: "Org-wide", value: orgWideCount, hint: "all branches" },
          {
            label: "Branch-specific",
            value: yearTotal - orgWideCount,
            hint: "site only",
          },
        ]}
      />

      <Card className="py-0">
        <CardContent className="flex flex-col gap-3 py-4">
          <Label className="text-xs text-muted-foreground">Branch scope</Label>
          <div className="flex flex-wrap gap-1.5">
            <HrFilterButton
              active={branchId === "all"}
              href={buildHolidayHref({ ...listParams, branchId: "all", page: 1 })}
            >
              All ({yearTotal})
            </HrFilterButton>
            <HrFilterButton
              active={branchId === "org-wide"}
              href={buildHolidayHref({ ...listParams, branchId: "org-wide", page: 1 })}
            >
              Org-wide ({orgWideCount})
            </HrFilterButton>
            {branchFilters.map((branch) => (
              <HrFilterButton
                active={branchId === branch.id}
                href={buildHolidayHref({ ...listParams, branchId: branch.id, page: 1 })}
                key={branch.id}
              >
                {branch.name} ({branch.count})
              </HrFilterButton>
            ))}
          </div>
        </CardContent>
      </Card>

      <OrgTableShell
        emptyDescription={
          yearTotal > 0 && branchId !== "all"
            ? "Try another branch filter or switch back to All."
            : "Add public or company holidays for this year, or import by branch."
        }
        emptyTitle={
          yearTotal > 0 && branchId !== "all" ? "No holidays in this filter" : "No holidays yet"
        }
        getSortHref={(key, nextOrder) =>
          buildHolidayHref({
            ...listParams,
            sort: key as HolidaySort,
            order: nextOrder,
            page: 1,
          })
        }
        headers={[
          { label: "Name", sortKey: "name" },
          { label: "Date", sortKey: "date" },
          { label: "Scope", sortKey: "scope" },
          { label: "Created", sortKey: "created" },
          "Status",
          "Action",
        ]}
        isEmpty={holidays.length === 0}
        sort={{ key: sort, order }}
      >
        {holidays.map((holiday) => (
          <OrgTableRow key={holiday.id}>
            <OrgTableCell variant="name">{holiday.name}</OrgTableCell>
            <OrgTableCell>{formatDate(holiday.holidayDate)}</OrgTableCell>
            <OrgTableCell variant="muted">{holiday.branchName ?? "Org-wide"}</OrgTableCell>
            <OrgTableCell variant="muted">
              {new Date(holiday.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })}
            </OrgTableCell>
            <OrgTableStatus />
            <OrgTableEditLink href={`/hr/organization/holidays/${holiday.id}/edit`} />
          </OrgTableRow>
        ))}
      </OrgTableShell>

      <HrPagination
        from={from}
        itemLabel={branchId !== "all" ? "holidays in this filter" : "holidays"}
        nextHref={
          page < pageCount ? buildHolidayHref({ ...listParams, page: page + 1 }) : undefined
        }
        page={page}
        pageLinks={pages.map((pageNumber) => ({
          page: pageNumber,
          href: buildHolidayHref({ ...listParams, page: pageNumber }),
        }))}
        prevHref={page > 1 ? buildHolidayHref({ ...listParams, page: page - 1 }) : undefined}
        to={to}
        total={total}
      />
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
  const { minYear, maxYear } = getHolidayYearRange();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/organization/holidays" variant="outline">
            Back to list
          </HrLinkButton>
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
                max={`${maxYear}-12-31`}
                min={`${minYear}-01-01`}
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
