"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createReviewCycleAction } from "@/app/(hr)/hr/performance/actions";
import type { AppraisalTemplateListItem } from "@/lib/hr/performance-templates";

type DepartmentOption = {
  id: string;
  name: string;
};

type CreateCycleFormProps = {
  templates: AppraisalTemplateListItem[];
  departments: DepartmentOption[];
};

export function CreateCycleForm({ templates, departments }: CreateCycleFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const periodStart = String(formData.get("periodStart") ?? "");
    const periodEnd = String(formData.get("periodEnd") ?? "");
    const dueDate = String(formData.get("dueDate") ?? "");

    // Client-side quick validation
    if (!name) {
      setFeedback({ ok: false, message: "Please fill in the cycle name." });
      return;
    }
    if (!periodStart) {
      setFeedback({ ok: false, message: "Please select a period start date." });
      return;
    }
    if (!periodEnd) {
      setFeedback({ ok: false, message: "Please select a period end date." });
      return;
    }
    if (!dueDate) {
      setFeedback({ ok: false, message: "Please select a due date." });
      return;
    }
    if (periodEnd < periodStart) {
      setFeedback({
        ok: false,
        message: "Period end date cannot be earlier than period start date.",
      });
      return;
    }

    startTransition(async () => {
      const res = await createReviewCycleAction(formData);
      setFeedback(res);
      if (res.ok) {
        formRef.current?.reset();
        router.refresh();
      }
    });
  };

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>New review cycle</CardTitle>
        <CardDescription>
          Launch an appraisal period with selected evaluation template and department scope.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Cycle name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. H2 2026 Performance Review"
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="templateId">Appraisal Template</Label>
            <select
              id="templateId"
              name="templateId"
              disabled={isPending}
              className="w-full rounded-md border border-[var(--border-secondary)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--foreground-primary)]"
            >
              {(() => {
                const defaultTemplate = templates.find((t) => t.isDefault && t.isActive);
                if (defaultTemplate) {
                  return <option value="">Default: {defaultTemplate.name}</option>;
                }
                return <option value="">None (Legacy 1 to 5 Score)</option>;
              })()}
              {templates
                .filter((t) => t.isActive && !t.isDefault)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.targetDepartmentName ? `(${t.targetDepartmentName})` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDepartmentId">Target Department (Optional)</Label>
            <select
              id="targetDepartmentId"
              name="targetDepartmentId"
              disabled={isPending}
              className="w-full rounded-md border border-[var(--border-secondary)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--foreground-primary)]"
            >
              <option value="">All Departments (Company-wide)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodStart">Period start *</Label>
            <Input id="periodStart" name="periodStart" type="date" disabled={isPending} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodEnd">Period end *</Label>
            <Input id="periodEnd" name="periodEnd" type="date" disabled={isPending} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due date *</Label>
            <Input id="dueDate" name="dueDate" type="date" disabled={isPending} required />
          </div>

          <div className="flex items-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating cycle..." : "Create cycle"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
