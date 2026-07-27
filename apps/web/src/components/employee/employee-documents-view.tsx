"use client";

import Link from "next/link";
import { useActionState } from "react";

import { uploadMyDocumentAction, type EmployeeDocumentActionState } from "@/app/(employee)/employee/documents/actions";
import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { HrBanner, HrTableCard } from "@/components/hr/hr-ui";
import { HrStatusBadge } from "@/components/hr/hr-ui.client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MyDocumentComplianceSummary, MyDocumentRow } from "@/lib/employee/documents";

const initialState: EmployeeDocumentActionState = {};

export function EmployeeDocumentsView({
  documents,
  summary,
}: {
  documents: MyDocumentRow[];
  summary: MyDocumentComplianceSummary;
}) {
  const [state, action, pending] = useActionState(uploadMyDocumentAction, initialState);

  return (
    <div className="space-y-6">
      {summary.missing > 0 || summary.expiring > 0 ? (
        <HrBanner>
          {summary.missing > 0 ? `${summary.missing} required document(s) missing or expired. ` : ""}
          {summary.expiring > 0 ? `${summary.expiring} document(s) expiring soon.` : ""}
        </HrBanner>
      ) : null}

      {summary.uploadableTypes.length > 0 ? (
        <Card>
          <CardContent className="space-y-4 py-5">
            <p className="text-sm font-medium">Upload a missing required document</p>
            <form action={action} className="grid gap-4 md:grid-cols-2">
              <HrField id="documentType" label="Document type">
                <HrSelect defaultValue="" id="documentType" name="documentType" required>
                  <option disabled value="">
                    Select document type
                  </option>
                  {summary.uploadableTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </HrSelect>
              </HrField>
              <HrField id="expiresAt" label="Expires (if required)">
                <HrTextInput id="expiresAt" name="expiresAt" type="date" />
              </HrField>
              <div className="md:col-span-2">
                <HrField id="file" label="File (max 10 MB)">
                  <input
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                  id="file"
                  name="file"
                  required
                  type="file"
                />
                </HrField>
              </div>
              <div className="md:col-span-2">
                <HrFormMessage error={state.error} success={state.success} />
                <HrPrimaryButton disabled={pending} type="submit">
                  {pending ? "Uploading…" : "Upload document"}
                </HrPrimaryButton>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <HrTableCard>
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">My documents</p>
        </div>
        {documents.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            Documents shared by HR will appear here.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {documents.map((doc) => (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={doc.id}>
                <div className="space-y-1">
                  <p className="font-medium">{doc.documentType}</p>
                  <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.complianceStatus ? (
                    <HrStatusBadge
                      label={doc.complianceStatus}
                      variant={
                        doc.complianceStatus === "valid"
                          ? "secondary"
                          : doc.complianceStatus === "expiring"
                            ? "outline"
                            : "destructive"
                      }
                    />
                  ) : null}
                  <Button render={<Link href={`/api/files/${doc.fileId}/download`} />} size="sm" variant="outline">
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </HrTableCard>
    </div>
  );
}
