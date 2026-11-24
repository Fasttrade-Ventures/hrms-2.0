import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  criteriaFieldName,
  type TemplateSectionForForm,
} from "@/lib/performance/criteria";
import type { CriteriaResponse } from "@/lib/performance/types";

const inputClass = cn(
  "flex h-10 w-full rounded-lg border border-input bg-[var(--surface-card)] px-3.5 text-sm outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-60",
);

const textareaClass = cn(
  "flex min-h-[88px] w-full rounded-lg border border-input bg-[var(--surface-card)] px-3.5 py-2.5 text-sm outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-60",
);

function responseFor(
  responses: CriteriaResponse[],
  questionId: string,
): CriteriaResponse | undefined {
  return responses.find((r) => r.questionId === questionId);
}

function formatSelfAnswer(
  questionType: TemplateSectionForForm["questions"][number]["questionType"],
  response: CriteriaResponse | undefined,
): string {
  if (!response) return "Not answered";
  if (questionType === "rating") {
    return response.selfRating != null ? `${response.selfRating}/5` : "Not answered";
  }
  if (questionType === "yes_no") {
    if (response.selfBoolean == null) return "Not answered";
    const base = response.selfBoolean ? "Yes" : "No";
    return response.selfText ? `${base} — ${response.selfText}` : base;
  }
  if (questionType === "number") {
    return response.selfNumber != null ? String(response.selfNumber) : "Not answered";
  }
  return response.selfText?.trim() ? response.selfText : "Not answered";
}

export function CriteriaQuestionsFields({
  sections,
  responses = [],
  mode,
}: {
  sections: TemplateSectionForForm[];
  responses?: CriteriaResponse[];
  mode: "employee_edit" | "employee_view" | "manager_view";
}) {
  if (!sections.length) return null;

  const editable = mode === "employee_edit";

  return (
    <div className="space-y-6">
      {sections.map((section, sIdx) => (
        <div className="space-y-4" key={section.id}>
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">
              {String.fromCharCode(65 + sIdx)}. {section.title}
            </h3>
            {section.description ? (
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">{section.description}</p>
            ) : null}
          </div>

          <div className="space-y-4">
            {section.questions.map((question, qIdx) => {
              const response = responseFor(responses, question.id);
              const numberLabel = `${sIdx + 1}.${qIdx + 1}`;

              return (
                <div
                  className="rounded-[var(--radius-md)] border border-[var(--border-secondary)] bg-[var(--surface-card)] px-3.5 py-3 space-y-2"
                  key={question.id}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[var(--foreground-primary)]">
                      {numberLabel} {question.title}
                      {question.required && editable ? (
                        <span className="ml-1 text-destructive">*</span>
                      ) : null}
                    </p>
                    {question.description ? (
                      <p className="text-xs text-[var(--foreground-muted)]">{question.description}</p>
                    ) : null}
                  </div>

                  {editable ? (
                    <>
                      {question.questionType === "rating" ? (
                        <div className="space-y-1.5">
                          <Label htmlFor={criteriaFieldName(question.id, "rating")}>Rating</Label>
                          <select
                            className={inputClass}
                            defaultValue={response?.selfRating ?? ""}
                            id={criteriaFieldName(question.id, "rating")}
                            name={criteriaFieldName(question.id, "rating")}
                            required={question.required}
                          >
                            <option disabled value="">
                              Select rating
                            </option>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <option key={rating} value={rating}>
                                {rating} / 5
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {question.questionType === "yes_no" ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                defaultChecked={response?.selfBoolean === true}
                                name={criteriaFieldName(question.id, "yes_no")}
                                required={question.required}
                                type="radio"
                                value="yes"
                              />
                              Yes
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                defaultChecked={response?.selfBoolean === false}
                                name={criteriaFieldName(question.id, "yes_no")}
                                type="radio"
                                value="no"
                              />
                              No
                            </label>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={criteriaFieldName(question.id, "comment")}>
                              Optional comment
                            </Label>
                            <input
                              className={inputClass}
                              defaultValue={response?.selfText ?? ""}
                              id={criteriaFieldName(question.id, "comment")}
                              name={criteriaFieldName(question.id, "comment")}
                              placeholder="Add a short note if useful"
                              type="text"
                            />
                          </div>
                        </div>
                      ) : null}

                      {question.questionType === "number" ? (
                        <div className="space-y-1.5">
                          <Label htmlFor={criteriaFieldName(question.id, "number")}>Number</Label>
                          <input
                            className={inputClass}
                            defaultValue={response?.selfNumber ?? ""}
                            id={criteriaFieldName(question.id, "number")}
                            min={0}
                            name={criteriaFieldName(question.id, "number")}
                            placeholder="0"
                            required={question.required}
                            step="1"
                            type="number"
                          />
                        </div>
                      ) : null}

                      {question.questionType === "text" ? (
                        <div className="space-y-1.5">
                          <Label htmlFor={criteriaFieldName(question.id, "text")}>Your answer</Label>
                          <textarea
                            className={textareaClass}
                            defaultValue={response?.selfText ?? ""}
                            id={criteriaFieldName(question.id, "text")}
                            name={criteriaFieldName(question.id, "text")}
                            placeholder="Write your answer here"
                            required={question.required}
                            rows={3}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm whitespace-pre-wrap text-[var(--foreground-primary)]">
                      <p>{formatSelfAnswer(question.questionType, response)}</p>
                      {mode === "manager_view" && response?.managerText ? (
                        <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                          Manager note: {response.managerText}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
