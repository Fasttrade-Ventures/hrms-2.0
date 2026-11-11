"use client";

import { useActionState } from "react";

import {
  removeOrganizationLetterheadAction,
  uploadOrganizationLetterheadAction,
  type LetterActionState,
} from "@/app/(hr)/hr/letters/actions";
import { HrFormMessage, HrGhostButton, HrPrimaryButton } from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";

const initialState: LetterActionState = {};

export function OrganizationLetterheadSection({ letterheadFileId }: { letterheadFileId: string | null }) {
  const [uploadState, uploadAction, uploading] = useActionState(
    uploadOrganizationLetterheadAction,
    initialState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeOrganizationLetterheadAction,
    initialState,
  );

  return (
    <PortalSectionCard
      description="PNG or JPG image placed across the top of generated offer letters and agreements. Individual templates can override it."
      title="Default letterhead"
    >
      <div className="space-y-4">
        {letterheadFileId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="Organization letterhead"
            className="max-h-40 rounded-lg border bg-white"
            src={`/api/files/${letterheadFileId}/download`}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No default letterhead. PDFs are generated without one.</p>
        )}

        <form action={uploadAction} className="flex flex-wrap items-center gap-3">
          <input
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            className="block text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
            name="letterheadFile"
            required
            type="file"
          />
          <HrPrimaryButton disabled={uploading} type="submit">
            {uploading ? "Uploading…" : letterheadFileId ? "Replace letterhead" : "Upload letterhead"}
          </HrPrimaryButton>
        </form>
        <HrFormMessage error={uploadState.error} success={uploadState.success} />

        {letterheadFileId ? (
          <form action={removeAction} className="space-y-2">
            <HrGhostButton disabled={removing} type="submit">
              {removing ? "Removing…" : "Remove default letterhead"}
            </HrGhostButton>
            <HrFormMessage error={removeState.error} success={removeState.success} />
          </form>
        ) : null}
      </div>
    </PortalSectionCard>
  );
}
