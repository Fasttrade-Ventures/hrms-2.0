"use client";

import { useActionState, useState, useTransition } from "react";

import {
  deleteRequiredDocumentAction,
  saveRequiredDocumentAction,
  type DocumentActionState,
} from "@/app/(hr)/hr/documents/actions";
import { DocumentFormField } from "@/components/hr/documents/document-form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RequiredDocumentRow } from "@/lib/hr/documents";

const initialState: DocumentActionState = {};

function FormCheckbox({
  id,
  label,
  name,
  defaultChecked = false,
}: {
  id: string;
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label className="flex items-center gap-2 text-sm" htmlFor={id}>
      <Checkbox
        checked={checked}
        id={id}
        onCheckedChange={(value) => setChecked(value === true)}
      />
      {checked ? <input name={name} type="hidden" value="on" /> : null}
      {label}
    </label>
  );
}

function DeleteRequiredButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() => startTransition(() => void deleteRequiredDocumentAction(id))}
      size="sm"
      type="button"
      variant="outline"
    >
      Delete
    </Button>
  );
}

function EditRequiredDocumentDialog({ row }: { row: RequiredDocumentRow }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveRequiredDocumentAction, initialState);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <Button onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
        Edit
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit required document type</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input name="id" type="hidden" value={row.id} />
          <DocumentFormField id={`name-${row.id}`} label="Name">
            <Input defaultValue={row.name} id={`name-${row.id}`} name="name" required />
          </DocumentFormField>
          <DocumentFormField id={`description-${row.id}`} label="Description">
            <Input
              defaultValue={row.description ?? ""}
              id={`description-${row.id}`}
              name="description"
            />
          </DocumentFormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentFormField id={`warningDays-${row.id}`} label="Warning days">
              <Input
                defaultValue={String(row.warningDays)}
                id={`warningDays-${row.id}`}
                name="warningDays"
                type="number"
              />
            </DocumentFormField>
            <DocumentFormField id={`sortOrder-${row.id}`} label="Sort order">
              <Input
                defaultValue={String(row.sortOrder)}
                id={`sortOrder-${row.id}`}
                name="sortOrder"
                type="number"
              />
            </DocumentFormField>
          </div>
          <div className="flex flex-wrap gap-4">
            <FormCheckbox
              defaultChecked={row.requiresExpiry}
              id={`requiresExpiry-${row.id}`}
              label="Requires expiry date"
              name="requiresExpiry"
            />
            <FormCheckbox
              defaultChecked={row.isActive}
              id={`isActive-${row.id}`}
              label="Active"
              name="isActive"
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
          <DialogFooter>
            <Button disabled={pending} type="submit">
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RequiredDocumentsManager({ rows }: { rows: RequiredDocumentRow[] }) {
  const [state, action, pending] = useActionState(saveRequiredDocumentAction, initialState);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="overflow-hidden py-0" size="sm">
        <CardHeader className="border-b">
          <CardTitle>Required document types</CardTitle>
          <CardDescription>Used for uploads and compliance tracking.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground">No required document types yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={row.id}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{row.name}</p>
                      <Badge variant={row.isActive ? "secondary" : "outline"}>
                        {row.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.requiresExpiry ? `Expiry required · warn ${row.warningDays}d` : "No expiry required"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EditRequiredDocumentDialog row={row} />
                    <DeleteRequiredButton id={row.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Add required document type</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <DocumentFormField id="name" label="Name">
              <Input id="name" name="name" placeholder="e.g. NRIC copy" required />
            </DocumentFormField>
            <DocumentFormField id="description" label="Description">
              <Input id="description" name="description" />
            </DocumentFormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <DocumentFormField id="warningDays" label="Warning days">
                <Input defaultValue="30" id="warningDays" name="warningDays" type="number" />
              </DocumentFormField>
              <DocumentFormField id="sortOrder" label="Sort order">
                <Input defaultValue="0" id="sortOrder" name="sortOrder" type="number" />
              </DocumentFormField>
            </div>
            <div className="flex flex-wrap gap-4">
              <FormCheckbox defaultChecked id="requiresExpiry" label="Requires expiry date" name="requiresExpiry" />
              <FormCheckbox defaultChecked id="isActive" label="Active" name="isActive" />
            </div>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
            <Button disabled={pending} type="submit">
              {pending ? "Saving…" : "Add required type"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
