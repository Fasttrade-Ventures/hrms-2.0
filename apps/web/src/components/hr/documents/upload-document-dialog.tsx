"use client";

import { useActionState, useState } from "react";

import {
  uploadDocumentAction,
  type DocumentActionState,
} from "@/app/(hr)/hr/documents/actions";
import { DocumentFormField } from "@/components/hr/documents/document-form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const initialState: DocumentActionState = {};
const NO_FOLDER = "__no_folder__";

export function UploadDocumentDialog({
  employees,
  requiredTypes,
  folders,
  defaultEmployeeId,
  triggerLabel = "Upload document",
}: {
  employees: Array<{ id: string; full_name: string; employee_number: string }>;
  requiredTypes: Array<{ id: string; name: string; requiresExpiry: boolean }>;
  folders: Array<{ id: string; name: string; parentName: string | null }>;
  defaultEmployeeId?: string;
  triggerLabel?: string;
}) {
  const [state, action, pending] = useActionState(uploadDocumentAction, initialState);
  const [folderId, setFolderId] = useState("");

  const folderLabel = folderId
    ? (() => {
        const folder = folders.find((item) => item.id === folderId);
        return folder
          ? `${folder.parentName ? `${folder.parentName} / ` : ""}${folder.name}`
          : "Folder";
      })()
    : "No folder";

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>{triggerLabel}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload employee document</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <DocumentFormField id="employeeId" label="Employee">
            <Select defaultValue={defaultEmployeeId} name="employeeId" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.employee_number} · {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DocumentFormField>

          <DocumentFormField id="documentType" label="Document type">
            <Select name="documentType" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select required document type" />
              </SelectTrigger>
              <SelectContent>
                {requiredTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DocumentFormField>

          <input name="folderId" type="hidden" value={folderId} />

          <DocumentFormField hint="Optional" id="folderId" label="Folder">
            <Select
              onValueChange={(value) => setFolderId(!value || value === NO_FOLDER ? "" : value)}
              value={folderId || NO_FOLDER}
            >
              <SelectTrigger
                className={cn("w-full", !folderId && "text-muted-foreground")}
              >
                <span className="truncate">{folderLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FOLDER}>No folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.parentName ? `${folder.parentName} / ` : ""}
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DocumentFormField>

          <DocumentFormField id="expiresAt" label="Expires (if required)">
            <Input id="expiresAt" name="expiresAt" type="date" />
          </DocumentFormField>

          <DocumentFormField hint="PDF, JPG, PNG, DOC, or DOCX up to 10 MB." id="file" label="File">
            <Input
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
              id="file"
              name="file"
              required
              type="file"
            />
          </DocumentFormField>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

          <DialogFooter>
            <Button disabled={pending} type="submit">
              {pending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
