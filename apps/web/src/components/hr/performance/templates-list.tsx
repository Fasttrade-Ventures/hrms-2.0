"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusPill, EmptyState, ListCard, ConfirmDialog } from "@hrms/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  cloneAppraisalTemplateAction,
  deleteAppraisalTemplateAction,
  setDefaultAppraisalTemplateAction,
  toggleAppraisalTemplateActiveAction,
} from "@/app/(hr)/hr/performance/actions";
import { TemplatePreviewDialog } from "@/components/hr/performance/template-preview-dialog";
import type { AppraisalTemplateDetail, AppraisalTemplateListItem } from "@/lib/hr/performance-templates";

type TemplatesListProps = {
  templates: AppraisalTemplateListItem[];
  templateDetailsMap: Record<string, AppraisalTemplateDetail>;
};

export function TemplatesList({ templates, templateDetailsMap }: TemplatesListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<{
    id: string;
    name: string;
    hasCycles: boolean;
    isActive: boolean;
  } | null>(null);

  const filtered = templates.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.targetDepartmentName && t.targetDepartmentName.toLowerCase().includes(term))
    );
  });

  const handleToggleActive = (templateId: string, nextActive: boolean) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleAppraisalTemplateActiveAction(templateId, nextActive);
      setFeedback(res);
      if (res.ok) router.refresh();
    });
  };

  const handleSetDefault = (templateId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await setDefaultAppraisalTemplateAction(templateId);
      setFeedback(res);
      if (res.ok) router.refresh();
    });
  };

  const handleClone = (templateId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await cloneAppraisalTemplateAction(templateId);
      setFeedback(res);
      if (res.ok) router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!templateToDelete) return;
    const { id } = templateToDelete;
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteAppraisalTemplateAction(id);
      setTemplateToDelete(null);
      setFeedback(res);
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {feedback ? (
        <div
          className={`rounded-lg p-3 text-xs font-medium ${
            feedback.ok
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search templates or departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs"
          />
        </div>
        <Button render={<Link href="/hr/performance/templates/create">New Template</Link>} size="sm" />
      </div>

      <ListCard
        columns={[
          { key: "name", label: "Template" },
          { key: "department", label: "Department", className: "w-32 hidden sm:block" },
          { key: "structure", label: "Structure", className: "w-44 hidden md:block" },
          { key: "usage", label: "Active Cycles", className: "w-32 shrink-0" },
          { key: "actions", label: "", className: "w-[440px] shrink-0" },
        ]}
        empty={
          <EmptyState
            title="No appraisal templates found"
            description="Create structured appraisal templates with custom rating scales, sections, and criteria."
          />
        }
        header={<p className="text-sm font-medium text-[var(--foreground-primary)]">Appraisal Templates</p>}
        rows={filtered.map((t) => {
          const detail = templateDetailsMap[t.id];
          return {
            id: t.id,
            cells: {
              name: (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--foreground-primary)]">{t.name}</span>
                    {t.isDefault ? <StatusPill label="Default" tone="success" /> : null}
                    {!t.isActive ? <StatusPill label="Inactive" tone="pending" /> : null}
                  </div>
                  {t.description ? (
                    <p className="line-clamp-1 text-xs text-[var(--foreground-muted)]">{t.description}</p>
                  ) : null}
                </div>
              ),
              department: (
                <span className="text-xs text-[var(--foreground-secondary)]">
                  {t.targetDepartmentName ?? "All Departments"}
                </span>
              ),
              structure: (
                <span className="text-xs text-[var(--foreground-secondary)]">
                  {t.sectionsCount} sections · {t.questionsCount} questions
                </span>
              ),
              usage: (
                <div className="flex items-center whitespace-nowrap">
                  <StatusPill
                    label={t.activeCyclesCount > 0 ? `${t.activeCyclesCount} In Use` : "None"}
                    tone={t.activeCyclesCount > 0 ? "pending" : "neutral"}
                  />
                </div>
              ),
              actions: (
                <div className="flex items-center justify-end gap-1 flex-nowrap">
                  {detail ? <TemplatePreviewDialog template={detail} /> : null}

                  <Button render={<Link href={`/hr/performance/templates/${t.id}/edit`}>Edit</Link>} size="sm" variant="outline" />

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleToggleActive(t.id, !t.isActive)}
                    title={t.isActive ? "Deactivate (retire) template" : "Reactivate template"}
                    className="px-2 text-xs"
                  >
                    {t.isActive ? "Deactivate" : "Activate"}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleClone(t.id)}
                    title="Duplicate template"
                    className="px-2 text-xs"
                  >
                    Clone
                  </Button>

                  {!t.isDefault ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleSetDefault(t.id)}
                      title="Set as organization default"
                      className="px-2 text-xs"
                    >
                      Make Default
                    </Button>
                  ) : null}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    disabled={isPending}
                    onClick={() =>
                      setTemplateToDelete({
                        id: t.id,
                        name: t.name,
                        hasCycles: t.totalCyclesCount > 0 || t.activeCyclesCount > 0,
                        isActive: t.isActive,
                      })
                    }
                    title={t.activeCyclesCount > 0 ? "Assigned to active cycles" : "Delete template"}
                  >
                    Delete
                  </Button>
                </div>
              ),
            },
          };
        })}
      />

      <ConfirmDialog
        open={Boolean(templateToDelete)}
        title={
          templateToDelete?.hasCycles
            ? "Template Linked to Existing Cycles"
            : "Delete Appraisal Template?"
        }
        message={
          templateToDelete ? (
            templateToDelete.hasCycles ? (
              <div className="space-y-2">
                <p>
                  Template <strong>&ldquo;{templateToDelete.name}&rdquo;</strong> is attached to existing review cycles. It cannot be deleted because historical evaluation records must be preserved.
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  To retire this template so it won&apos;t appear for new review cycles, you can deactivate it instead.
                </p>
              </div>
            ) : (
              <span>
                Are you sure you want to delete template <strong>&ldquo;{templateToDelete.name}&rdquo;</strong>? This action will permanently remove all sections and criteria questions associated with this template.
              </span>
            )
          ) : (
            ""
          )
        }
        confirmLabel={
          templateToDelete?.hasCycles
            ? templateToDelete.isActive
              ? "Deactivate Template Instead"
              : "Close"
            : "Delete Template"
        }
        cancelLabel={templateToDelete?.hasCycles ? undefined : "Cancel"}
        tone={templateToDelete?.hasCycles ? "warning" : "danger"}
        isPending={isPending}
        onConfirm={() => {
          if (templateToDelete?.hasCycles) {
            if (templateToDelete.isActive) {
              const { id } = templateToDelete;
              setTemplateToDelete(null);
              handleToggleActive(id, false);
            } else {
              setTemplateToDelete(null);
            }
          } else {
            confirmDelete();
          }
        }}
        onCancel={() => setTemplateToDelete(null)}
      />
    </div>
  );
}
