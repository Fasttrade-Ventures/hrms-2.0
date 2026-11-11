"use client";

import { useActionState, useEffect, useState } from "react";

import { AnnouncementEditor } from "@/components/hr/announcements/announcement-editor";
import { addChecklistTemplateItem } from "@/lib/employees/checklist-actions";
import { CHECKLIST_OWNER_ROLES, type ChecklistKind } from "@/lib/employees/checklists";
import { HrField, HrSelect, HrTextInput } from "@/components/hr/employees/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AddTaskState = { error?: string; savedAt?: number };

async function submitTask(_previous: AddTaskState, formData: FormData): Promise<AddTaskState> {
  try {
    await addChecklistTemplateItem(formData);
    return { savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add this task." };
  }
}

export function AddChecklistTaskButton({ kind }: { kind: ChecklistKind }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [state, formAction, pending] = useActionState(submitTask, {});
  const titleId = `${kind}-title`;
  const roleId = `${kind}-owner`;

  useEffect(() => {
    if (!state.savedAt) return;
    setOpen(false);
    setDescription("");
  }, [state.savedAt]);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button">
        Add task
      </Button>
      <Dialog
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setDescription("");
        }}
        open={open}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add task</DialogTitle>
            <DialogDescription>
              The title, role, and description are copied onto an employee when HR starts this checklist.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="grid gap-3">
            <input name="kind" type="hidden" value={kind} />
            <input name="description" type="hidden" value={description} />
            <HrField id={titleId} label="Task">
              <HrTextInput autoComplete="off" id={titleId} name="title" required />
            </HrField>
            <HrField id={roleId} label="Role">
              <HrSelect defaultValue="hr_administrator" id={roleId} name="ownerLabel" required>
                {CHECKLIST_OWNER_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </HrSelect>
            </HrField>
            <div className="grid gap-2">
              <p className="text-[13px] text-foreground">Description</p>
              {open ? <AnnouncementEditor onChange={setDescription} /> : null}
            </div>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <DialogFooter>
              <Button disabled={pending} type="submit">
                {pending ? "Adding…" : "Add task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
