import Link from "next/link";
import { EmptyState } from "@hrms/ui";

import {
  closePulseSurveyAction,
  deletePulseTemplateAction,
  openPulseSurveyAction,
  setPulseTemplateActiveAction,
  togglePulsePublicLinkAction,
} from "@/app/(hr)/hr/pulse/actions";
import { formatDate } from "@/components/employee/employee-shared";
import { AnnouncementAudienceFields } from "@/components/hr/announcements/announcement-audience-fields";
import { HrField, HrSelect, HrTextInput } from "@/components/hr/employees/form-fields";
import { HrStatCards, HrTableCard } from "@/components/hr/hr-ui";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PulseRunListItem } from "@/lib/hr/pulse-survey-runs";
import type { PulseTemplateListItem } from "@/lib/hr/pulse-survey-templates";

type Option = { id: string; name: string };

function statusBadge(status: PulseRunListItem["status"]) {
  if (status === "open") return <Badge variant="success">Open</Badge>;
  if (status === "scheduled") return <Badge variant="warning">Scheduled</Badge>;
  if (status === "closed") return <Badge variant="outline">Closed</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

export function PulseRegister({
  templates,
  runs,
  branches,
  departments,
  tab,
  siteOrigin,
}: {
  templates: PulseTemplateListItem[];
  runs: PulseRunListItem[];
  branches: Option[];
  departments: Option[];
  tab: "surveys" | "templates";
  siteOrigin: string;
}) {
  const openCount = runs.filter((run) => run.status === "open").length;
  const answerCount = runs.reduce((sum, run) => sum + run.staffAnsweredCount + run.linkAnsweredCount, 0);
  const activeTemplates = templates.filter((template) => template.isActive);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Build a survey once, open it for a chosen audience, and read averages without names."
        title="Pulse"
      />

      <HrStatCards
        items={[
          { label: "Templates", value: templates.length, hint: "Reusable question sets" },
          { label: "Open now", value: openCount, hint: "Accepting answers today" },
          { label: "Answers", value: answerCount, hint: "Staff and link responses" },
        ]}
      />

      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Link
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "surveys" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          href="/hr/pulse?tab=surveys"
        >
          Surveys ({runs.length})
        </Link>
        <Link
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "templates" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          href="/hr/pulse?tab=templates"
        >
          Templates ({templates.length})
        </Link>
      </div>

      {tab === "templates" ? (
        <>
          <div className="flex justify-end">
            <Button render={<Link href="/hr/pulse/templates/new" />}>New template</Button>
          </div>
          <HrTableCard>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="font-medium text-foreground">Survey templates</p>
                <p className="text-sm text-muted-foreground">Edit questions here. Opening a survey freezes a copy.</p>
              </div>
            </div>
            {templates.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState
                  description="Create a template with sections and questions, then open it for staff."
                  title="No templates yet"
                  variant="flat"
                />
              </div>
            ) : (
              <div className="divide-y">
                {templates.map((template) => (
                  <article
                    className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.5fr)_7rem_8rem_auto] lg:items-center"
                    key={template.id}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{template.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {template.sectionsCount} sections · {template.questionsCount} questions
                        {template.description ? ` · ${template.description}` : ""}
                      </p>
                    </div>
                    <Badge variant={template.isActive ? "success" : "outline"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {template.runsCount} {template.runsCount === 1 ? "survey" : "surveys"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button render={<Link href={`/hr/pulse/templates/${template.id}/edit`} />} size="sm" variant="outline">
                        Edit
                      </Button>
                      <form action={setPulseTemplateActiveAction.bind(null, template.id, !template.isActive)}>
                        <Button size="sm" type="submit" variant="outline">
                          {template.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </form>
                      {template.runsCount === 0 ? (
                        <form action={deletePulseTemplateAction.bind(null, template.id)}>
                          <Button size="sm" type="submit" variant="ghost">
                            Delete
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </HrTableCard>
        </>
      ) : (
        <>
          <Card className="py-0">
            <CardHeader className="border-b px-5 py-4">
              <CardTitle>Open a survey</CardTitle>
              <CardDescription>
                Pick a template, dates, and audience. Empty audience filters mean everyone with a login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5 py-5">
              {activeTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create an active template first, then open it here.
                </p>
              ) : (
                <form action={openPulseSurveyAction} className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_11rem_11rem]">
                    <HrField id="pulse-template" label="Template">
                      <HrSelect id="pulse-template" name="templateId" required defaultValue="">
                        <option disabled value="">
                          Choose a template
                        </option>
                        {activeTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </HrSelect>
                    </HrField>
                    <HrField id="pulse-opens" label="Opens">
                      <HrTextInput id="pulse-opens" name="opensOn" required type="date" />
                    </HrField>
                    <HrField id="pulse-closes" label="Closes">
                      <HrTextInput id="pulse-closes" name="closesOn" required type="date" />
                    </HrField>
                  </div>
                  <AnnouncementAudienceFields branches={branches} departments={departments} />
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input className="size-4 accent-primary" name="publicLinkEnabled" type="checkbox" />
                    Also allow a public link (answers stay separate from staff)
                  </label>
                  <Button type="submit">Open survey</Button>
                </form>
              )}
            </CardContent>
          </Card>

          <HrTableCard>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="font-medium text-foreground">Survey register</p>
                <p className="text-sm text-muted-foreground">
                  Response rate is staff answers divided by people invited when the survey opened.
                </p>
              </div>
              <p className="text-sm tabular-nums text-muted-foreground">
                {runs.length} {runs.length === 1 ? "survey" : "surveys"}
              </p>
            </div>
            {runs.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState
                  description="Open a template above. Staff see it on their Pulse page while the dates are current."
                  title="No surveys yet"
                  variant="flat"
                />
              </div>
            ) : (
              <div className="divide-y">
                {runs.map((run) => {
                  const rate =
                    run.invitedCount > 0
                      ? `${run.staffAnsweredCount} of ${run.invitedCount}`
                      : `${run.staffAnsweredCount} answers`;
                  const publicUrl =
                    run.publicLinkEnabled && run.publicToken
                      ? `${siteOrigin}/survey/${run.publicToken}`
                      : null;
                  return (
                    <article className="space-y-3 px-5 py-4" key={run.id}>
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_7rem_9rem_8rem_auto] lg:items-center">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{run.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(run.opensOn)} to {formatDate(run.closesOn)}
                          </p>
                        </div>
                        {statusBadge(run.status)}
                        <p className="text-sm tabular-nums text-muted-foreground">{rate} staff</p>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {run.linkAnsweredCount} link
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button render={<Link href={`/hr/pulse/runs/${run.id}`} />} size="sm" variant="outline">
                            Results
                          </Button>
                          {run.status === "open" || run.status === "scheduled" ? (
                            <form action={closePulseSurveyAction}>
                              <input name="runId" type="hidden" value={run.id} />
                              <Button size="sm" type="submit" variant="outline">
                                Close
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {publicUrl ? (
                          <>
                            <span className="truncate">Link: {publicUrl}</span>
                            <form action={togglePulsePublicLinkAction}>
                              <input name="runId" type="hidden" value={run.id} />
                              <input name="enabled" type="hidden" value="0" />
                              <Button size="sm" type="submit" variant="ghost">
                                Turn link off
                              </Button>
                            </form>
                          </>
                        ) : (
                          <form action={togglePulsePublicLinkAction}>
                            <input name="runId" type="hidden" value={run.id} />
                            <input name="enabled" type="hidden" value="1" />
                            <Button size="sm" type="submit" variant="ghost">
                              Turn public link on
                            </Button>
                          </form>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </HrTableCard>
        </>
      )}
    </div>
  );
}
