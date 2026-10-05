"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@hrms/ui";
import { saveAppraisalTemplateAction } from "@/app/(hr)/hr/performance/actions";
import { TemplatePreviewDialog } from "@/components/hr/performance/template-preview-dialog";
import type { AppraisalTemplateDetail } from "@/lib/hr/performance-templates";
import type { AppraisalQuestionType } from "@hrms/validation";

type DepartmentOption = {
  id: string;
  name: string;
};

type TemplateBuilderProps = {
  initialData?: AppraisalTemplateDetail | null;
  departments: DepartmentOption[];
};

type SectionState = {
  id?: string;
  title: string;
  description: string;
  weightPct: number;
  sortOrder: number;
  questions: QuestionState[];
};

type QuestionState = {
  id?: string;
  title: string;
  description: string;
  questionType: AppraisalQuestionType;
  required: boolean;
  sortOrder: number;
};

const DEFAULT_RATING_LABELS: Record<string, string> = {
  "1": "Unsatisfactory",
  "2": "Needs Improvement",
  "3": "Meets Expectations",
  "4": "Exceeds Expectations",
  "5": "Outstanding",
};

export function TemplateBuilder({ initialData, departments }: TemplateBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // General fields
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [targetDepartmentId, setTargetDepartmentId] = useState(initialData?.targetDepartmentId ?? "");
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? false);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  // Rating scale labels
  const [ratingLabels, setRatingLabels] = useState<Record<string, string>>(
    initialData?.ratingScale?.labels ?? DEFAULT_RATING_LABELS,
  );

  // Sections
  const [sections, setSections] = useState<SectionState[]>(
    initialData?.sections && initialData.sections.length > 0
      ? initialData.sections.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description ?? "",
          weightPct: s.weightPct,
          sortOrder: s.sortOrder,
          questions: s.questions.map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description ?? "",
            questionType: q.questionType,
            required: q.required,
            sortOrder: q.sortOrder,
          })),
        }))
      : [
          {
            title: "Core Competencies & Values",
            description: "Demonstrated behaviors, communication, teamwork, and accountability.",
            weightPct: 50,
            sortOrder: 0,
            questions: [
              {
                title: "Quality of Work & Accuracy",
                description: "Delivers thorough, accurate, and high-quality outputs consistently.",
                questionType: "rating",
                required: true,
                sortOrder: 0,
              },
              {
                title: "Collaboration & Teamwork",
                description: "Communicates effectively with peers, managers, and cross-functional teams.",
                questionType: "rating",
                required: true,
                sortOrder: 1,
              },
            ],
          },
          {
            title: "Key Results & Accomplishments",
            description: "Delivery against business targets and personal goals.",
            weightPct: 50,
            sortOrder: 1,
            questions: [
              {
                title: "Key Projects & Deliverables",
                description: "Summarize major achievements and milestones delivered this cycle.",
                questionType: "text",
                required: true,
                sortOrder: 0,
              },
              {
                title: "Areas for Growth & Next Cycle Goals",
                description: "Targeted skill development and priorities for the upcoming cycle.",
                questionType: "text",
                required: false,
                sortOrder: 1,
              },
            ],
          },
        ],
  );

  const isLocked = Boolean(initialData && initialData.activeCyclesCount > 0);

  const totalWeight = sections.reduce((sum, s) => sum + (Number(s.weightPct) || 0), 0);

  // Section handlers
  const handleAddSection = () => {
    setSections((prev) => [
      ...prev,
      {
        title: `Section ${prev.length + 1}`,
        description: "",
        weightPct: 0,
        sortOrder: prev.length,
        questions: [
          {
            title: "New Criteria",
            description: "",
            questionType: "rating",
            required: true,
            sortOrder: 0,
          },
        ],
      },
    ]);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length <= 1) {
      setErrorMsg("Template must contain at least one section.");
      return;
    }
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSection = (index: number, updates: Partial<SectionState>) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s)),
    );
  };

  // Question handlers
  const handleAddQuestion = (sectionIndex: number) => {
    setSections((prev) =>
      prev.map((sec, sIdx) => {
        if (sIdx !== sectionIndex) return sec;
        return {
          ...sec,
          questions: [
            ...sec.questions,
            {
              title: "",
              description: "",
              questionType: "rating",
              required: true,
              sortOrder: sec.questions.length,
            },
          ],
        };
      }),
    );
  };

  const handleRemoveQuestion = (sectionIndex: number, questionIndex: number) => {
    setSections((prev) =>
      prev.map((sec, sIdx) => {
        if (sIdx !== sectionIndex) return sec;
        if (sec.questions.length <= 1) {
          setErrorMsg("Each section must have at least one question.");
          return sec;
        }
        return {
          ...sec,
          questions: sec.questions.filter((_, qIdx) => qIdx !== questionIndex),
        };
      }),
    );
  };

  const handleUpdateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    updates: Partial<QuestionState>,
  ) => {
    setSections((prev) =>
      prev.map((sec, sIdx) => {
        if (sIdx !== sectionIndex) return sec;
        return {
          ...sec,
          questions: sec.questions.map((q, qIdx) =>
            qIdx === questionIndex ? { ...q, ...updates } : q,
          ),
        };
      }),
    );
  };

  const handleRatingLabelChange = (val: string, text: string) => {
    setRatingLabels((prev) => ({ ...prev, [val]: text }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Please enter a template name.");
      return;
    }

    if (sections.length === 0) {
      setErrorMsg("Please add at least one section.");
      return;
    }

    for (const [sIdx, s] of sections.entries()) {
      if (!s.title.trim()) {
        setErrorMsg(`Section ${sIdx + 1} must have a title.`);
        return;
      }
      if (s.questions.length === 0) {
        setErrorMsg(`Section "${s.title}" must have at least one question.`);
        return;
      }
      for (const [qIdx, q] of s.questions.entries()) {
        if (!q.title.trim()) {
          setErrorMsg(`Question ${qIdx + 1} in section "${s.title}" must have a title.`);
          return;
        }
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      targetDepartmentId: targetDepartmentId || null,
      isDefault,
      isActive,
      ratingScale: {
        min: 1,
        max: 5,
        step: 1,
        labels: ratingLabels,
      },
      sections: sections.map((s, sIdx) => ({
        id: s.id,
        title: s.title.trim(),
        description: s.description.trim() || null,
        weightPct: Number(s.weightPct) || 0,
        sortOrder: sIdx,
        questions: s.questions.map((q, qIdx) => ({
          id: q.id,
          title: q.title.trim(),
          description: q.description.trim() || null,
          questionType: q.questionType,
          required: q.required,
          sortOrder: qIdx,
        })),
      })),
    };

    startTransition(async () => {
      const res = await saveAppraisalTemplateAction(initialData?.id ?? null, payload);
      if (res.ok) {
        router.push("/hr/performance");
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const previewTemplateData: AppraisalTemplateDetail = {
    id: initialData?.id ?? "preview",
    name: name || "Untitled Template",
    description: description || null,
    targetDepartmentId: targetDepartmentId || null,
    targetDepartmentName:
      departments.find((d) => d.id === targetDepartmentId)?.name ?? null,
    isDefault,
    isActive,
    ratingScale: {
      min: 1,
      max: 5,
      step: 1,
      labels: ratingLabels,
    },
    sections: sections.map((s, sIdx) => ({
      id: s.id ?? `s-${sIdx}`,
      templateId: initialData?.id ?? "preview",
      title: s.title || `Section ${sIdx + 1}`,
      description: s.description || null,
      weightPct: Number(s.weightPct) || 0,
      sortOrder: sIdx,
      questions: s.questions.map((q, qIdx) => ({
        id: q.id ?? `q-${sIdx}-${qIdx}`,
        sectionId: s.id ?? `s-${sIdx}`,
        title: q.title || `Question ${qIdx + 1}`,
        description: q.description || null,
        questionType: q.questionType,
        required: q.required,
        sortOrder: qIdx,
      })),
    })),
    activeCyclesCount: initialData?.activeCyclesCount ?? 0,
    totalCyclesCount: initialData?.totalCyclesCount ?? 0,
    createdAt: initialData?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      ) : null}

      {isLocked ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-xs font-medium text-amber-700 dark:text-amber-400">
          <strong>Notice:</strong> This template is currently assigned to {initialData?.activeCyclesCount} active appraisal cycle(s). Modifying structural sections is restricted to protect ongoing evaluations.
        </div>
      ) : null}

      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground-primary)]">
            {initialData ? `Edit Template: ${initialData.name}` : "Create Appraisal Template"}
          </h2>
          <p className="text-xs text-[var(--foreground-muted)]">
            Configure evaluation sections, criteria questions, rating scale matrix, and department scope.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TemplatePreviewDialog
            template={previewTemplateData}
            triggerButton={<Button type="button" variant="outline" size="sm">Live Preview</Button>}
          />
          <Button render={<Link href="/hr/performance">Cancel</Link>} type="button" variant="ghost" size="sm" />
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving..." : initialData ? "Save Changes" : "Create Template"}
          </Button>
        </div>
      </div>

      {/* Template Status & Lifecycle Card */}
      <Card size="sm" className="border-l-4 border-l-[var(--accent-primary)]">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Template Status & Availability</CardTitle>
              <CardDescription>
                Control whether this template is active for launching new appraisal review cycles.
              </CardDescription>
            </div>
            <StatusPill
              label={isActive ? "Active (Available)" : "Retired / Inactive"}
              tone={isActive ? "success" : "pending"}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsActive(true)}
              className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                isActive
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)]"
                  : "border-[var(--border-secondary)] bg-[var(--surface-card)] hover:border-[var(--border-primary)] opacity-75"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-[var(--foreground-primary)]">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                Active Template
              </div>
              <p className="mt-1 text-[11px] text-[var(--foreground-muted)]">
                Visible in review cycle dropdowns. Available for new employee performance appraisals.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsActive(false)}
              className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                !isActive
                  ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                  : "border-[var(--border-secondary)] bg-[var(--surface-card)] hover:border-[var(--border-primary)] opacity-75"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-[var(--foreground-primary)]">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
                Deactivated / Retired
              </div>
              <p className="mt-1 text-[11px] text-[var(--foreground-muted)]">
                Hidden when creating new review cycles. All historical evaluations and past cycles remain preserved.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Template Overview</CardTitle>
          <CardDescription>Basic identifiers and organization scoping.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tpl-name">Template Name *</Label>
            <Input
              id="tpl-name"
              placeholder="e.g. Annual Operations Review 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tpl-desc">Description</Label>
            <textarea
              id="tpl-desc"
              rows={2}
              placeholder="Brief summary of what this appraisal template evaluates and when it is used."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-[var(--border-secondary)] bg-[var(--surface-card)] p-2 text-xs text-[var(--foreground-primary)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-dept">Target Department (Optional)</Label>
            <select
              id="tpl-dept"
              value={targetDepartmentId}
              onChange={(e) => setTargetDepartmentId(e.target.value)}
              className="w-full rounded-md border border-[var(--border-secondary)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--foreground-primary)]"
            >
              <option value="">All Departments (General)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end gap-2 sm:col-span-1">
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--foreground-primary)] cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-[var(--border-secondary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
              />
              Set as Organization Default Template
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Rating Scale Descriptors */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Rating Scale Matrix (1 to 5)</CardTitle>
          <CardDescription>Customize the performance standard labels for each numerical score.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((val) => (
              <div key={val} className="space-y-1.5">
                <Label htmlFor={`rating-${val}`} className="text-xs font-bold text-[var(--foreground-primary)]">
                  Score {val}
                </Label>
                <Input
                  id={`rating-${val}`}
                  value={ratingLabels[String(val)] ?? ""}
                  onChange={(e) => handleRatingLabelChange(String(val), e.target.value)}
                  placeholder={`Level ${val}`}
                  disabled={isLocked}
                  className="text-xs"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sections and Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[var(--foreground-primary)]">Evaluation Sections</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                totalWeight === 100
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              Total Weight: {totalWeight}%
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddSection}
            disabled={isLocked}
          >
            + Add Section
          </Button>
        </div>

        {sections.map((section, sIdx) => (
          <Card key={section.id || sIdx} size="sm" className="border-l-4 border-l-[var(--accent-primary)]">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-bold text-[var(--foreground-primary)]">
                      {sIdx + 1}
                    </span>
                    <Input
                      placeholder="Section Title (e.g. Leadership & Strategic Thinking)"
                      value={section.title}
                      onChange={(e) => handleUpdateSection(sIdx, { title: e.target.value })}
                      disabled={isLocked}
                      className="font-semibold text-sm"
                    />
                  </div>
                  <Input
                    placeholder="Section guidance notes or instructions for evaluators..."
                    value={section.description}
                    onChange={(e) => handleUpdateSection(sIdx, { description: e.target.value })}
                    disabled={isLocked}
                    className="text-xs text-[var(--foreground-secondary)]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs whitespace-nowrap">Weight %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={section.weightPct}
                      onChange={(e) =>
                        handleUpdateSection(sIdx, { weightPct: Number(e.target.value) || 0 })
                      }
                      disabled={isLocked}
                      className="w-16 text-center text-xs"
                    />
                  </div>

                  {!isLocked && sections.length > 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => handleRemoveSection(sIdx)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                  Section Criteria / Questions
                </p>

                {section.questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="rounded-lg border border-[var(--border-secondary)] bg-[var(--surface-muted)]/50 p-3 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex-1 w-full space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--foreground-muted)]">
                            {sIdx + 1}.{qIdx + 1}
                          </span>
                          <Input
                            placeholder="Question / Criteria prompt (e.g. Problem Solving & Critical Thinking)"
                            value={q.title}
                            onChange={(e) =>
                              handleUpdateQuestion(sIdx, qIdx, { title: e.target.value })
                            }
                            disabled={isLocked}
                            className="text-xs font-medium"
                          />
                        </div>
                        <Input
                          placeholder="Optional description / rubric explanation..."
                          value={q.description}
                          onChange={(e) =>
                            handleUpdateQuestion(sIdx, qIdx, { description: e.target.value })
                          }
                          disabled={isLocked}
                          className="text-[11px] text-[var(--foreground-muted)]"
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <select
                          value={q.questionType}
                          onChange={(e) =>
                            handleUpdateQuestion(sIdx, qIdx, {
                              questionType: e.target.value as AppraisalQuestionType,
                            })
                          }
                          disabled={isLocked}
                          className="rounded-md border border-[var(--border-secondary)] bg-[var(--surface-card)] px-2 py-1.5 text-xs text-[var(--foreground-primary)]"
                        >
                          <option value="rating">Rating (1 to 5)</option>
                          <option value="text">Open Text Response</option>
                          <option value="yes_no">Yes / No</option>
                        </select>

                        <label className="flex items-center gap-1 text-[11px] text-[var(--foreground-secondary)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) =>
                              handleUpdateQuestion(sIdx, qIdx, { required: e.target.checked })
                            }
                            disabled={isLocked}
                            className="rounded text-[var(--accent-primary)]"
                          />
                          Required
                        </label>

                        {!isLocked && section.questions.length > 1 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => handleRemoveQuestion(sIdx, qIdx)}
                          >
                            ✕
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!isLocked ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-xs text-[var(--accent-primary)]"
                  onClick={() => handleAddQuestion(sIdx)}
                >
                  + Add Question to Section
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button render={<Link href="/hr/performance">Cancel</Link>} type="button" variant="outline" />
        <Button type="submit" disabled={isPending || isLocked}>
          {isPending ? "Saving..." : initialData ? "Update Template" : "Save Template"}
        </Button>
      </div>
    </form>
  );
}
