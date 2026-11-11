"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PulseRunSection } from "@/lib/hr/pulse-survey-runs";

export type SurveyAnswerPayload = {
  questionId: string;
  score?: number | null;
  textValue?: string | null;
  booleanValue?: boolean | null;
  choiceIds: string[];
};

export function SurveyAnswerForm({
  title,
  description,
  sections,
  onSubmit,
  submitLabel = "Submit answers",
}: {
  title: string;
  description?: string;
  sections: PulseRunSection[];
  onSubmit: (answers: SurveyAnswerPayload[]) => Promise<void>;
  submitLabel?: string;
}) {
  const questions = useMemo(() => sections.flatMap((section) => section.questions), [sections]);
  const [answers, setAnswers] = useState<Record<string, SurveyAnswerPayload>>(() => {
    const initial: Record<string, SurveyAnswerPayload> = {};
    for (const question of questions) {
      initial[question.id] = { questionId: question.id, choiceIds: [] };
    }
    return initial;
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const setAnswer = (questionId: string, updates: Partial<SurveyAnswerPayload>) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? { questionId, choiceIds: [] };
      const next: SurveyAnswerPayload = {
        ...current,
        ...updates,
        questionId,
        choiceIds: updates.choiceIds ?? current.choiceIds,
      };
      return { ...prev, [questionId]: next };
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await onSubmit(Object.values(answers));
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : "Could not submit.");
      }
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card className="py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-6 px-5 py-5">
          {sections.map((section) => (
            <section className="space-y-4" key={section.id}>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                {section.description ? (
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                ) : null}
              </div>
              {section.questions.map((question) => {
                const answer = answers[question.id];
                return (
                  <div className="space-y-2 rounded-xl border p-4" key={question.id}>
                    <p className="text-sm font-medium text-foreground">
                      {question.title}
                      {question.required ? <span className="ml-1 text-destructive">*</span> : null}
                    </p>
                    {question.description ? (
                      <p className="text-xs text-muted-foreground">{question.description}</p>
                    ) : null}

                    {question.questionType === "rating" || question.questionType === "enps" ? (
                      <div className="flex flex-wrap gap-2">
                        {Array.from(
                          {
                            length:
                              (question.questionType === "enps"
                                ? 10
                                : (question.ratingScale?.max ?? 5)) -
                              (question.questionType === "enps"
                                ? 0
                                : (question.ratingScale?.min ?? 1)) +
                              1,
                          },
                          (_, index) => {
                            const min = question.questionType === "enps" ? 0 : (question.ratingScale?.min ?? 1);
                            const value = min + index;
                            const selected = answer?.score === value;
                            return (
                              <button
                                className={`flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-medium ${
                                  selected
                                    ? "border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]"
                                    : "border-border bg-card text-foreground hover:border-[var(--accent-primary)]"
                                }`}
                                key={value}
                                onClick={() => setAnswer(question.id, { score: value })}
                                type="button"
                              >
                                {value}
                              </button>
                            );
                          },
                        )}
                      </div>
                    ) : null}

                    {question.questionType === "yes_no" ? (
                      <div className="flex gap-2">
                        {([true, false] as const).map((value) => (
                          <button
                            className={`rounded-md border px-3 py-1.5 text-sm ${
                              answer?.booleanValue === value
                                ? "border-[var(--accent-primary)] bg-[var(--surface-accent-soft)]"
                                : "border-border"
                            }`}
                            key={String(value)}
                            onClick={() => setAnswer(question.id, { booleanValue: value })}
                            type="button"
                          >
                            {value ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {question.questionType === "single_choice" ? (
                      <div className="space-y-2">
                        {question.choices.map((choice) => (
                          <label className="flex items-center gap-2 text-sm" key={choice.id}>
                            <input
                              checked={answer?.choiceIds[0] === choice.id}
                              className="size-4 accent-primary"
                              name={`q-${question.id}`}
                              onChange={() => setAnswer(question.id, { choiceIds: [choice.id] })}
                              type="radio"
                            />
                            {choice.label}
                          </label>
                        ))}
                      </div>
                    ) : null}

                    {question.questionType === "multi_choice" ? (
                      <div className="space-y-2">
                        {question.choices.map((choice) => {
                          const checked = answer?.choiceIds.includes(choice.id) ?? false;
                          return (
                            <label className="flex items-center gap-2 text-sm" key={choice.id}>
                              <input
                                checked={checked}
                                className="size-4 accent-primary"
                                onChange={() => {
                                  const current = answer?.choiceIds ?? [];
                                  setAnswer(question.id, {
                                    choiceIds: checked
                                      ? current.filter((id) => id !== choice.id)
                                      : [...current, choice.id],
                                  });
                                }}
                                type="checkbox"
                              />
                              {choice.label}
                            </label>
                          );
                        })}
                      </div>
                    ) : null}

                    {question.questionType === "short_text" ? (
                      <Input
                        onChange={(event) => setAnswer(question.id, { textValue: event.target.value })}
                        value={answer?.textValue ?? ""}
                      />
                    ) : null}

                    {question.questionType === "long_text" ? (
                      <textarea
                        className="min-h-24 w-full rounded-lg border border-input bg-[var(--surface-card)] px-3 py-2 text-sm"
                        onChange={(event) => setAnswer(question.id, { textValue: event.target.value })}
                        value={answer?.textValue ?? ""}
                      />
                    ) : null}
                  </div>
                );
              })}
            </section>
          ))}
        </CardContent>
      </Card>
      {errorMsg ? <p className="text-sm text-destructive">{errorMsg}</p> : null}
      <Button disabled={isPending} type="submit">
        {isPending ? "Submitting…" : submitLabel}
      </Button>
    </form>
  );
}
