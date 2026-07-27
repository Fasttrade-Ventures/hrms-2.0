"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { importHolidays } from "@/app/(hr)/hr/organization/actions";
import { HrField, HrSelect } from "@/components/hr/organization/org-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getHolidayYearOptions } from "@/lib/hr/holiday-window";
import type { BranchImportOption } from "@/lib/hr/organization";

export function ImportHolidaysDialog({
  branches,
  defaultYear,
  open,
  onClose,
}: {
  branches: BranchImportOption[];
  defaultYear: number;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [year, setYear] = useState(String(defaultYear));
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const yearOptions = getHolidayYearOptions();
  const selectedBranch = branches.find((branch) => branch.id === branchId);

  function handleClose() {
    if (pending) return;
    setError(undefined);
    setSuccess(undefined);
    onClose();
  }

  function handleImport() {
    setError(undefined);
    setSuccess(undefined);

    if (!branchId) {
      setError("Select a branch to import holidays for.");
      return;
    }

    startTransition(async () => {
      const result = await importHolidays({
        branchId,
        year: Number(year),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(result.success ?? `Imported ${result.imported} holidays.`);
      router.refresh();
    });
  }

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && handleClose()} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import public holidays</DialogTitle>
          <DialogDescription>
            Fetches confirmed Malaysia public holidays for the branch state. Holidays are matched by
            date — re-importing will not create duplicates. When two public holidays fall on the same
            day, they are combined into one entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <HrField id="importBranchId" label="Branch">
            <HrSelect
              id="importBranchId"
              name="importBranchId"
              onChange={(event) => setBranchId(event.target.value)}
              value={branchId}
            >
              <option disabled value="">
                Select branch
              </option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                  {branch.state ? ` (${branch.state})` : " — state not set"}
                </option>
              ))}
            </HrSelect>
          </HrField>

          <HrField id="importYear" label="Year">
            <HrSelect
              id="importYear"
              name="importYear"
              onChange={(event) => setYear(event.target.value)}
              value={year}
            >
              {yearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </HrSelect>
          </HrField>

          {selectedBranch && !selectedBranch.state ? (
            <p className="text-sm text-destructive">
              This branch has no state set. Edit the branch and choose a Malaysian state before
              importing.
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-primary">{success}</p> : null}
        </div>

        <DialogFooter>
          <Button disabled={pending} onClick={handleClose} type="button" variant="outline">
            {success ? "Close" : "Cancel"}
          </Button>
          <Button
            disabled={pending || !branchId || !selectedBranch?.state}
            onClick={handleImport}
            type="button"
          >
            {pending ? "Importing…" : "Import holidays"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
