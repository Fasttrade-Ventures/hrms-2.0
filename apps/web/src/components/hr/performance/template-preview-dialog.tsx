"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@hrms/ui";
import type { AppraisalTemplateDetail } from "@/lib/hr/performance-templates";

type TemplatePreviewProps = {
  template: AppraisalTemplateDetail;
  triggerButton?: React.ReactElement;
};

export function TemplatePreviewDialog({ template, triggerButton }: TemplatePreviewProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"employee" | "manager">("employee");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        id={`template-preview-trigger-${template.id}`}
        render={
          triggerButton ?? (
            <Button variant="outline" size="sm">
              Preview
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[min(90vh,52rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{template.name}</DialogTitle>
            {template.isDefault ? <StatusPill label="Default" tone="success" /> : null}
            {!template.isActive ? <StatusPill label="Inactive" tone="pending" /> : null}
          </div>
          <DialogDescription>
            {template.description || "Live preview of how employees and managers will complete this appraisal form."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="space-y-3 border-b pb-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Preview
              </span>
              <span className="text-xs text-muted-foreground">
                {template.targetDepartmentName ? template.targetDepartmentName : "All departments"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setActiveTab("employee")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  activeTab === "employee"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Employee
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("manager")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  activeTab === "manager"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Manager
              </button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Rating scale, 1 to 5</p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((val) => {
                const label = template.ratingScale.labels?.[String(val)] ?? `Score ${val}`;
                return (
                  <div key={val} className="min-w-0 rounded-md border bg-card px-1.5 py-2 text-center">
                    <span className="block text-sm font-semibold text-foreground">{val}</span>
                    <span className="mt-1 block text-[11px] leading-tight break-words text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sections List */}
          {template.sections.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-[var(--foreground-muted)]">
              No sections defined in this template yet.
            </div>
          ) : (
            <div className="space-y-6">
              {template.sections.map((section, sIdx) => (
                <div
                  key={section.id || sIdx}
                  className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between gap-4 border-b pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--foreground-primary)]">
                        {sIdx + 1}. {section.title}
                      </h4>
                      {section.description ? (
                        <p className="mt-1 text-xs text-[var(--foreground-muted)]">{section.description}</p>
                      ) : null}
                    </div>
                    {section.weightPct > 0 ? (
                      <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--foreground-secondary)]">
                        Weight: {section.weightPct}%
                      </span>
                    ) : null}
                  </div>

                  {/* Questions */}
                  <div className="space-y-4">
                    {section.questions.map((q, qIdx) => (
                      <div key={q.id || qIdx} className="rounded-lg border border-[var(--border-secondary)] p-3 space-y-2">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                          <p className="min-w-0 text-sm font-medium text-foreground">
                            {sIdx + 1}.{qIdx + 1} {q.title}
                            {q.required ? <span className="ml-1 text-destructive">*</span> : null}
                          </p>
                          <span className="shrink-0 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                            {q.questionType === "rating" ? "Rating" : q.questionType === "yes_no" ? "Yes / No" : "Text"}
                          </span>
                        </div>

                        {q.description ? (
                          <p className="text-[11px] text-[var(--foreground-muted)]">{q.description}</p>
                        ) : null}

                        {/* Interactive simulation controls */}
                        <div className="pt-1">
                          {q.questionType === "rating" ? (
                            <div className="flex flex-wrap gap-2">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-primary)] bg-[var(--surface-card)] text-xs font-medium text-[var(--foreground-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:outline-none"
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          ) : q.questionType === "yes_no" ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="rounded-md border border-[var(--border-primary)] px-3 py-1 text-xs font-medium hover:border-[var(--accent-primary)] focus:outline-none"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-[var(--border-primary)] px-3 py-1 text-xs font-medium hover:border-[var(--accent-primary)] focus:outline-none"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <textarea
                              disabled
                              rows={2}
                              placeholder={
                                activeTab === "employee"
                                  ? "Employee self-evaluation response..."
                                  : "Manager evaluation comments..."
                              }
                              className="w-full rounded-md border border-[var(--border-secondary)] bg-[var(--surface-muted)] p-2 text-xs text-[var(--foreground-secondary)]"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
