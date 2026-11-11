"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PulseQuestionType } from "@hrms/validation";

import { savePulseTemplateAction } from "@/app/(hr)/hr/pulse/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PulseTemplateDetail } from "@/lib/hr/pulse-survey-templates";

type ChoiceState = { id?: string; label: string; sortOrder: number };
type QuestionState = {
  id?: string;
  title: string;
  description: string;
  questionType: PulseQuestionType;
  required: boolean;
  sortOrder: number;
  ratingMin: number;
  ratingMax: number;
  choices: ChoiceState[];
};
type SectionState = {
  id?: string;
  title: string;
  description: string;
  sortOrder: number;
  questions: QuestionState[];
};

const QUESTION_TYPES: Array<{ value: PulseQuestionType; label: string }> = [
  { value: "rating", label: "Rating" },
  { value: "enps", label: "eNPS (0–10)" },
  { value: "yes_no", label: "Yes / No" },
  { value: "single_choice", label: "Single choice" },
  { value: "multi_choice", label: "Multiple choice" },
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
];

function emptyQuestion(sortOrder: number): QuestionState {
  return {
    title: "",
    description: "",
    questionType: "rating",
    required: true,
    sortOrder,
    ratingMin: 1,
    ratingMax: 5,
    choices: [
      { label: "Option A", sortOrder: 0 },
      { label: "Option B", sortOrder: 1 },
    ],
  };
}

export function SurveyTemplateBuilder({ initialData }: { initialData?: PulseTemplateDetail | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [sections, setSections] = useState<SectionState[]>(
    initialData?.sections?.length
      ? initialData.sections.map((section, sIdx) => ({
          id: section.id,
          title: section.title,
          description: section.description ?? "",
          sortOrder: section.sortOrder ?? sIdx,
          questions: section.questions.map((question, qIdx) => ({
            id: question.id,
            title: question.title,
            description: question.description ?? "",
            questionType: question.questionType,
            required: question.required,
            sortOrder: question.sortOrder ?? qIdx,
            ratingMin: question.ratingScale?.min ?? 1,
            ratingMax: question.ratingScale?.max ?? 5,
            choices:
              question.choices.length > 0
                ? question.choices.map((choice, cIdx) => ({
                    id: choice.id,
                    label: choice.label,
                    sortOrder: choice.sortOrder ?? cIdx,
                  }))
                : [
                    { label: "Option A", sortOrder: 0 },
                    { label: "Option B", sortOrder: 1 },
                  ],
          })),
        }))
      : [
          {
            title: "Engagement",
            description: "",
            sortOrder: 0,
            questions: [
              {
                title: "How likely are you to recommend working here?",
                description: "0 = not at all, 10 = extremely likely.",
                questionType: "enps",
                required: true,
                sortOrder: 0,
                ratingMin: 0,
                ratingMax: 10,
                choices: [
                  { label: "Option A", sortOrder: 0 },
                  { label: "Option B", sortOrder: 1 },
                ],
              },
            ],
          },
        ],
  );

  const updateSection = (index: number, updates: Partial<SectionState>) => {
    setSections((prev) => prev.map((section, i) => (i === index ? { ...section, ...updates } : section)));
  };

  const updateQuestion = (sectionIndex: number, questionIndex: number, updates: Partial<QuestionState>) => {
    setSections((prev) =>
      prev.map((section, sIdx) => {
        if (sIdx !== sectionIndex) return section;
        return {
          ...section,
          questions: section.questions.map((question, qIdx) =>
            qIdx === questionIndex ? { ...question, ...updates } : question,
          ),
        };
      }),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg("Enter a template name.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      isActive,
      sections: sections.map((section, sIdx) => ({
        id: section.id,
        title: section.title.trim() || `Section ${sIdx + 1}`,
        description: section.description.trim() || null,
        sortOrder: sIdx,
        questions: section.questions.map((question, qIdx) => ({
          id: question.id,
          title: question.title.trim(),
          description: question.description.trim() || null,
          questionType: question.questionType,
          required: question.required,
          sortOrder: qIdx,
          ratingScale:
            question.questionType === "rating"
              ? { min: question.ratingMin, max: question.ratingMax }
              : question.questionType === "enps"
                ? { min: 0, max: 10 }
                : null,
          choices:
            question.questionType === "single_choice" || question.questionType === "multi_choice"
              ? question.choices
                  .filter((choice) => choice.label.trim())
                  .map((choice, cIdx) => ({
                    id: choice.id,
                    label: choice.label.trim(),
                    sortOrder: cIdx,
                  }))
              : [],
        })),
      })),
    };

    startTransition(async () => {
      const result = await savePulseTemplateAction({
        templateId: initialData?.id,
        payload,
      });
      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }
      router.push("/hr/pulse?tab=templates");
      router.refresh();
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card className="py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle>{initialData ? "Edit template" : "New survey template"}</CardTitle>
          <CardDescription>Sections group questions. Everyone invited to a survey sees the same questions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pulse-template-name">Name</Label>
            <Input
              id="pulse-template-name"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pulse-template-description">Description</Label>
            <Input
              id="pulse-template-description"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              checked={isActive}
              className="size-4 accent-primary"
              onChange={(event) => setIsActive(event.target.checked)}
              type="checkbox"
            />
            Active and available when opening a survey
          </label>
        </CardContent>
      </Card>

      {sections.map((section, sectionIndex) => (
        <Card className="py-0" key={section.id ?? `section-${sectionIndex}`}>
          <CardHeader className="flex flex-row items-start justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Input
                aria-label="Section title"
                onChange={(event) => updateSection(sectionIndex, { title: event.target.value })}
                value={section.title}
              />
              <Input
                aria-label="Section description"
                onChange={(event) => updateSection(sectionIndex, { description: event.target.value })}
                placeholder="Optional description"
                value={section.description}
              />
            </div>
            <Button
              onClick={() => {
                if (sections.length <= 1) {
                  setErrorMsg("Keep at least one section.");
                  return;
                }
                setSections((prev) => prev.filter((_, i) => i !== sectionIndex));
              }}
              type="button"
              variant="outline"
            >
              Remove section
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 px-5 py-5">
            {section.questions.map((question, questionIndex) => (
              <div className="space-y-3 rounded-xl border p-4" key={question.id ?? `q-${sectionIndex}-${questionIndex}`}>
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_auto]">
                  <Input
                    aria-label="Question title"
                    onChange={(event) => updateQuestion(sectionIndex, questionIndex, { title: event.target.value })}
                    placeholder="Question"
                    value={question.title}
                  />
                  <select
                    aria-label="Question type"
                    className="h-10 rounded-lg border border-input bg-[var(--surface-card)] px-3 text-sm"
                    onChange={(event) =>
                      updateQuestion(sectionIndex, questionIndex, {
                        questionType: event.target.value as PulseQuestionType,
                      })
                    }
                    value={question.questionType}
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      checked={question.required}
                      className="size-4 accent-primary"
                      onChange={(event) =>
                        updateQuestion(sectionIndex, questionIndex, { required: event.target.checked })
                      }
                      type="checkbox"
                    />
                    Required
                  </label>
                </div>
                <Input
                  aria-label="Question help text"
                  onChange={(event) =>
                    updateQuestion(sectionIndex, questionIndex, { description: event.target.value })
                  }
                  placeholder="Optional help text"
                  value={question.description}
                />

                {question.questionType === "rating" ? (
                  <div className="flex flex-wrap gap-3 text-sm">
                    <label className="flex items-center gap-2">
                      Min
                      <Input
                        className="w-20"
                        max={9}
                        min={0}
                        onChange={(event) =>
                          updateQuestion(sectionIndex, questionIndex, {
                            ratingMin: Number(event.target.value),
                          })
                        }
                        type="number"
                        value={question.ratingMin}
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      Max
                      <Input
                        className="w-20"
                        max={10}
                        min={1}
                        onChange={(event) =>
                          updateQuestion(sectionIndex, questionIndex, {
                            ratingMax: Number(event.target.value),
                          })
                        }
                        type="number"
                        value={question.ratingMax}
                      />
                    </label>
                  </div>
                ) : null}

                {question.questionType === "single_choice" || question.questionType === "multi_choice" ? (
                  <div className="space-y-2">
                    {question.choices.map((choice, choiceIndex) => (
                      <div className="flex gap-2" key={`${choiceIndex}-${choice.label}`}>
                        <Input
                          onChange={(event) => {
                            const next = question.choices.map((item, idx) =>
                              idx === choiceIndex ? { ...item, label: event.target.value } : item,
                            );
                            updateQuestion(sectionIndex, questionIndex, { choices: next });
                          }}
                          value={choice.label}
                        />
                        <Button
                          onClick={() => {
                            if (question.choices.length <= 2) return;
                            updateQuestion(sectionIndex, questionIndex, {
                              choices: question.choices.filter((_, idx) => idx !== choiceIndex),
                            });
                          }}
                          type="button"
                          variant="outline"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      onClick={() =>
                        updateQuestion(sectionIndex, questionIndex, {
                          choices: [
                            ...question.choices,
                            { label: `Option ${question.choices.length + 1}`, sortOrder: question.choices.length },
                          ],
                        })
                      }
                      type="button"
                      variant="outline"
                    >
                      Add option
                    </Button>
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (section.questions.length <= 1) {
                        setErrorMsg("Each section needs at least one question.");
                        return;
                      }
                      setSections((prev) =>
                        prev.map((item, idx) =>
                          idx === sectionIndex
                            ? {
                                ...item,
                                questions: item.questions.filter((_, qIdx) => qIdx !== questionIndex),
                              }
                            : item,
                        ),
                      );
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Remove question
                  </Button>
                </div>
              </div>
            ))}
            <Button
              onClick={() =>
                updateSection(sectionIndex, {
                  questions: [...section.questions, emptyQuestion(section.questions.length)],
                })
              }
              type="button"
              variant="outline"
            >
              Add question
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() =>
            setSections((prev) => [
              ...prev,
              {
                title: `Section ${prev.length + 1}`,
                description: "",
                sortOrder: prev.length,
                questions: [emptyQuestion(0)],
              },
            ])
          }
          type="button"
          variant="outline"
        >
          Add section
        </Button>
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving…" : "Save template"}
        </Button>
        <Button onClick={() => router.push("/hr/pulse?tab=templates")} type="button" variant="ghost">
          Cancel
        </Button>
      </div>
      {errorMsg ? <p className="text-sm text-destructive">{errorMsg}</p> : null}
    </form>
  );
}
