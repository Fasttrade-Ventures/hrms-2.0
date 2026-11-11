"use client";

import { useState } from "react";

import { AddCandidateForm } from "@/components/hr/recruitment/create-requisition-form";
import { Button } from "@/components/ui/button";

export function AddCandidatePanel({
  requisitionId,
  defaultOpen,
}: {
  requisitionId: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Candidates</p>
          <p className="text-xs text-muted-foreground">Add people to this requisition, then move them on the board.</p>
        </div>
        <Button onClick={() => setOpen((value) => !value)} size="sm" type="button" variant="outline">
          {open ? "Hide form" : "Add candidate"}
        </Button>
      </div>
      {open ? <AddCandidateForm requisitionId={requisitionId} /> : null}
    </div>
  );
}
