"use client";

import { useActionState, useState, useTransition } from "react";

import {
  deleteDocumentFolderAction,
  saveDocumentFolderAction,
  type DocumentActionState,
} from "@/app/(hr)/hr/documents/actions";
import { DocumentFormField } from "@/components/hr/documents/document-form-field";
import { DocumentRoleCheckboxes } from "@/components/hr/documents/document-role-checkboxes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { DocumentFolderRow } from "@/lib/hr/document-folders";
import { cn } from "@/lib/utils";

const initialState: DocumentActionState = {};
const ROOT_FOLDER = "__root_folder__";

function DeleteFolderButton({ folderId }: { folderId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => startTransition(() => void deleteDocumentFolderAction(folderId))}
      size="sm"
      type="button"
      variant="outline"
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

function ParentFolderSelect({
  parentOptions,
  defaultParentId = "",
  id,
}: {
  parentOptions: DocumentFolderRow[];
  defaultParentId?: string | null;
  id: string;
}) {
  const [parentId, setParentId] = useState(defaultParentId ?? "");

  const parentLabel = parentId
    ? parentOptions.find((item) => item.id === parentId)?.name ?? "Folder"
    : "Root folder";

  return (
    <>
      <input name="parentId" type="hidden" value={parentId} />
      <DocumentFormField hint="Leave as root for a top-level folder." id={id} label="Parent folder">
        <Select
          onValueChange={(value) => setParentId(!value || value === ROOT_FOLDER ? "" : value)}
          value={parentId || ROOT_FOLDER}
        >
          <SelectTrigger
            className={cn("w-full", !parentId && "text-muted-foreground")}
            id={id}
          >
            <span className="truncate">{parentLabel}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROOT_FOLDER}>Root folder</SelectItem>
            {parentOptions.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DocumentFormField>
    </>
  );
}

function EditFolderDialog({
  folder,
  rootFolders,
}: {
  folder: DocumentFolderRow;
  rootFolders: DocumentFolderRow[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveDocumentFolderAction, initialState);
  const parentOptions = rootFolders.filter((item) => item.id !== folder.id);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <Button onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
        Edit
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit folder</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input name="id" type="hidden" value={folder.id} />
          <DocumentFormField id={`edit-name-${folder.id}`} label="Folder name">
            <Input
              defaultValue={folder.name}
              id={`edit-name-${folder.id}`}
              name="name"
              required
            />
          </DocumentFormField>
          <ParentFolderSelect
            defaultParentId={folder.parentId}
            id={`edit-parent-${folder.id}`}
            parentOptions={parentOptions}
          />
          <DocumentRoleCheckboxes defaultRoles={folder.accessRoles} />
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

export function FolderManager({ folders }: { folders: DocumentFolderRow[] }) {
  const [state, action, pending] = useActionState(saveDocumentFolderAction, initialState);
  const rootFolders = folders.filter((folder) => !folder.parentId);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="overflow-hidden py-0" size="sm">
        <CardHeader className="border-b">
          <CardTitle>Folders</CardTitle>
          <CardDescription>Up to two levels with role-based visibility.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {folders.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground">No folders yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {folders.map((folder) => (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={folder.id}>
                  <div>
                    <p className="font-medium">
                      {folder.parentName ? `${folder.parentName} / ` : ""}
                      {folder.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{folder.accessRoles.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EditFolderDialog folder={folder} rootFolders={rootFolders} />
                    <DeleteFolderButton folderId={folder.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Create folder</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <DocumentFormField id="name" label="Folder name">
              <Input id="name" name="name" required />
            </DocumentFormField>
            <ParentFolderSelect id="parentId" parentOptions={rootFolders} />
            <DocumentRoleCheckboxes />
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
            <Button disabled={pending} type="submit">
              {pending ? "Saving…" : "Create folder"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
