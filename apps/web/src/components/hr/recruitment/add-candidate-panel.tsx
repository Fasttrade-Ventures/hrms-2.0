"use client";

import { AddCandidateForm } from "@/components/hr/recruitment/create-requisition-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function AddCandidatePanel({
  requisitionId,
  open,
  onOpenChange,
}: {
  requisitionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add candidate</SheetTitle>
          <SheetDescription>
            Add people to this requisition, then move them on the board.
          </SheetDescription>
        </SheetHeader>
        <AddCandidateForm embedded requisitionId={requisitionId} />
      </SheetContent>
    </Sheet>
  );
}
