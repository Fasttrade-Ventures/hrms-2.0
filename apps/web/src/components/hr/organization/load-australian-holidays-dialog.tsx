"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { loadAustralianHolidays2026 } from "@/app/(hr)/hr/organization/actions";
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
import type { BranchImportOption } from "@/lib/hr/organization";

export function LoadAustralianHolidaysDialog({
  branches,
  open,
  onClose,
}: {
  branches: BranchImportOption[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const selectedBranch = branches.find((branch) => branch.id === branchId);

  function handleClose() {
    if (pending) return;
    setError(undefined);
    setSuccess(undefined);
    onClose();
  }

  function handleLoad() {
    setError(undefined);
    setSuccess(undefined);

    startTransition(async () => {
      const result = await loadAustralianHolidays2026({ branchId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(result.success ?? `Loaded ${result.imported} holidays.`);
      router.refresh();
    });
  }

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && handleClose()} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load 2026 holidays for this state</DialogTitle>
          <DialogDescription>
            Adds the 2026 national public holidays and the holidays for the branch state or
            territory. Running it again will not create duplicates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <HrField id="auHolidayBranchId" label="Branch">
            <HrSelect
              id="auHolidayBranchId"
              name="auHolidayBranchId"
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

          {selectedBranch && !selectedBranch.state ? (
            <p className="text-sm text-destructive">Set the branch state first.</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-primary">{success}</p> : null}
        </div>

        <DialogFooter>
          <Button disabled={pending} onClick={handleClose} type="button" variant="outline">
            {success ? "Close" : "Cancel"}
          </Button>
          <Button disabled={pending || !branchId} onClick={handleLoad} type="button">
            {pending ? "Loading…" : "Load 2026 holidays for this state"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
