"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  createLetterTemplateAction,
  previewLetterTemplateAction,
  setLetterTemplateActiveAction,
  updateLetterTemplateAction,
  type LetterActionState,
} from "@/app/(hr)/hr/letters/actions";
import {
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { AnnouncementEditor } from "@/components/hr/announcements/announcement-editor";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { LETTER_MERGE_TAGS } from "@/lib/letters/merge-tags";
import { looksLikeHtml, plainTextToHtml } from "@/lib/letters/html-text";
import type { LetterTemplateRow } from "@/lib/letters/templates";

const initialState: LetterActionState = {};

export const LETTER_TYPE_LABELS: Record<LetterTemplateRow["type"], string> = {
  offer: "Offer letter",
  employment_agreement: "Employment agreement",
};

const DEFAULT_BODIES: Record<LetterTemplateRow["type"], string> = {
  offer: plainTextToHtml(
    [
      "OFFER OF EMPLOYMENT",
      "",
      "Dear {{candidate_name}},",
      "",
      "{{organization_name}} is pleased to offer you the position of {{job_title}}.",
      "Basic salary ({{currency}}): {{salary}}",
      "Proposed start date: {{start_date}}",
      "",
      "Please respond using the link in the email that accompanied this letter.",
    ].join("\n"),
  ),
  employment_agreement: plainTextToHtml(
    [
      "EMPLOYMENT AGREEMENT",
      "",
      "Between {{organization_name}} and {{candidate_name}}.",
      "Position: {{job_title}}",
      "Basic salary ({{currency}}): {{salary}}",
      "Commencement date: {{start_date}}",
      "",
      "Signed: ______________________    Date: ______________",
    ].join("\n"),
  ),
};

function toEditorHtml(body: string): string {
  return looksLikeHtml(body) ? body : plainTextToHtml(body);
}

function MergeTagHints() {
  return (
    <div className="rounded-lg border border-dashed p-3 text-sm">
      <p className="font-medium">Merge tags</p>
      <p className="mt-1 text-muted-foreground">
        Type these in the editor. They are replaced when an offer or agreement is generated. Unknown tags stay as
        typed.
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {LETTER_MERGE_TAGS.map((tag) => (
          <li className="rounded bg-muted px-2 py-0.5 font-mono text-xs" key={tag}>
            {`{{${tag}}}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LetterTemplateForm({ template }: { template?: LetterTemplateRow }) {
  const isEdit = Boolean(template);
  const [state, action, pending] = useActionState(
    isEdit ? updateLetterTemplateAction : createLetterTemplateAction,
    initialState,
  );
  const [previewState, previewAction, previewPending] = useActionState(
    previewLetterTemplateAction,
    initialState,
  );
  const [type, setType] = useState<LetterTemplateRow["type"]>(template?.type ?? "offer");
  const [body, setBody] = useState(template ? toEditorHtml(template.body) : DEFAULT_BODIES.offer);
  const [removeLetterhead, setRemoveLetterhead] = useState(false);
  // Controlled so a preview submit (which resets the form) doesn't clear them.
  const [name, setName] = useState(template?.name ?? "");
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!previewState.error && !previewState.preview) return;
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [previewState.error, previewState.preview]);

  return (
    <div className="space-y-6">
      <PortalSectionCard title={isEdit ? "Edit template" : "New template"}>
        <form action={action} className="space-y-4">
          {template ? <input name="templateId" type="hidden" value={template.id} /> : null}
          <HrField id="letter-name" label="Name">
            <HrTextInput
              id="letter-name"
              maxLength={200}
              name="name"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </HrField>
          <HrField id="letter-type" label="Type">
            <HrSelect
              id="letter-type"
              name="type"
              onChange={(event) => {
                const next = event.target.value as LetterTemplateRow["type"];
                if (!isEdit && body === DEFAULT_BODIES[type]) setBody(DEFAULT_BODIES[next]);
                setType(next);
              }}
              value={type}
            >
              <option value="offer">{LETTER_TYPE_LABELS.offer}</option>
              <option value="employment_agreement">{LETTER_TYPE_LABELS.employment_agreement}</option>
            </HrSelect>
          </HrField>
          <HrField id="letter-body" label="Body">
            <AnnouncementEditor defaultValue={body} onChange={setBody} />
            <input name="body" type="hidden" value={body} />
          </HrField>
          <HrField
            hint="PNG or JPG shown across the top of the PDF. Leave empty to use the organization default letterhead."
            id="letter-letterhead"
            label="Letterhead override (optional)"
          >
            <input
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
              id="letter-letterhead"
              name="letterheadFile"
              type="file"
            />
          </HrField>
          {template?.letterhead_file_id ? (
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <p className="font-medium">Current override</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Template letterhead"
                className="max-h-32 rounded border bg-white"
                src={`/api/files/${template.letterhead_file_id}/download`}
              />
              <label className="flex items-center gap-2.5 text-muted-foreground" htmlFor="letter-remove-letterhead">
                <input
                  checked={removeLetterhead}
                  className="size-4 accent-primary"
                  id="letter-remove-letterhead"
                  name="removeLetterhead"
                  onChange={(event) => setRemoveLetterhead(event.target.checked)}
                  type="checkbox"
                />
                Remove override (use organization default)
              </label>
            </div>
          ) : null}
          <MergeTagHints />
          <label className="flex items-center gap-2.5 text-sm text-muted-foreground" htmlFor="letter-active">
            <input
              checked={isActive}
              className="size-4 accent-primary"
              id="letter-active"
              name="isActive"
              onChange={(event) => setIsActive(event.target.checked)}
              type="checkbox"
            />
            Active (available when creating offers)
          </label>
          <HrFormMessage error={state.error} success={state.success} />
          <div className="flex flex-wrap gap-2">
            <HrPrimaryButton disabled={pending} type="submit">
              {pending ? "Saving…" : isEdit ? "Save template" : "Create template"}
            </HrPrimaryButton>
            <HrGhostButton
              disabled={previewPending}
              formAction={previewAction}
              formNoValidate
              type="submit"
            >
              {previewPending ? "Rendering…" : "Preview with sample data"}
            </HrGhostButton>
          </div>

          {previewState.error || previewState.preview ? (
            <div
              className="space-y-2 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4"
              ref={previewRef}
            >
              <div>
                <p className="font-medium">Preview</p>
                <p className="text-sm text-muted-foreground">
                  Sample merge values only — letterhead appears on the generated PDF.
                </p>
              </div>
              {previewState.error ? (
                <HrFormMessage error={previewState.error} />
              ) : (
                <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md border bg-white p-5 text-sm leading-relaxed text-foreground shadow-sm">
                  {previewState.preview}
                </pre>
              )}
            </div>
          ) : null}
        </form>
      </PortalSectionCard>

      {template ? <ToggleActive template={template} /> : null}
    </div>
  );
}

function ToggleActive({ template }: { template: LetterTemplateRow }) {
  const [state, action, pending] = useActionState(setLetterTemplateActiveAction, initialState);
  return (
    <PortalSectionCard
      description={
        template.is_active
          ? "Deactivated templates can't be picked for new offers. Existing offers keep their PDF."
          : "Activate this template to use it again."
      }
      title={template.is_active ? "Deactivate" : "Activate"}
    >
      <form action={action} className="space-y-3">
        <input name="templateId" type="hidden" value={template.id} />
        <input name="isActive" type="hidden" value={template.is_active ? "false" : "true"} />
        <HrFormMessage error={state.error} success={state.success} />
        <HrGhostButton disabled={pending} type="submit">
          {template.is_active ? "Deactivate template" : "Activate template"}
        </HrGhostButton>
      </form>
    </PortalSectionCard>
  );
}
