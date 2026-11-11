import Link from "next/link";

import { formatDate } from "@/components/employee/employee-shared";
import { HrStatCards, HrTableCard } from "@/components/hr/hr-ui";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PulseRunDetail } from "@/lib/hr/pulse-survey-runs";
import type { PulseRunResults } from "@/lib/hr/pulse-survey-results";

export function PulseResultsView({
  run,
  results,
}: {
  run: PulseRunDetail;
  results: PulseRunResults;
}) {
  const rateLabel =
    results.responseRate == null
      ? "—"
      : `${Math.round(results.responseRate * 100)}%`;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Button render={<Link href="/hr/pulse?tab=surveys" />} variant="outline">
            Back to surveys
          </Button>
        }
        description={`${formatDate(run.opensOn)} to ${formatDate(run.closesOn)}. Names are never shown next to an answer.`}
        title={run.name}
      />

      <HrStatCards
        columns={5}
        items={[
          { label: "Status", value: run.status, hint: "Current window" },
          { label: "Invited", value: results.invitedCount, hint: "Frozen at open" },
          { label: "Staff answered", value: results.staffAnsweredCount, hint: rateLabel },
          { label: "Link answered", value: results.linkAnsweredCount, hint: "Separate from staff rate" },
          {
            label: "Previous avg",
            value: results.previousAverage == null ? "—" : results.previousAverage.toFixed(1),
            hint: "Same template, earlier survey",
          },
        ]}
      />

      <Card className="py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle>Results</CardTitle>
          <CardDescription>
            Averages and group splits appear after {results.minAnswers} staff answers. Response rate always shows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 py-5">
          {results.questions.map((question) => (
            <article className="space-y-3 rounded-xl border p-4" key={question.questionId}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{question.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {question.staffAnswerCount} staff · {question.linkAnswerCount} link
                  </p>
                </div>
                <Badge variant="outline">{question.questionType.replace("_", " ")}</Badge>
              </div>

              {question.questionType === "enps" && question.enps ? (
                <div className="grid gap-2 sm:grid-cols-4 text-sm">
                  <p>
                    eNPS:{" "}
                    <span className="font-semibold tabular-nums">
                      {question.enps.score == null ? "Hidden until enough answers" : question.enps.score}
                    </span>
                  </p>
                  <p className="tabular-nums">Promoters {question.enps.promoters}</p>
                  <p className="tabular-nums">Passive {question.enps.passive}</p>
                  <p className="tabular-nums">Detractors {question.enps.detractors}</p>
                </div>
              ) : null}

              {(question.questionType === "rating" || question.questionType === "enps") &&
              question.average != null ? (
                <p className="text-sm">
                  Average: <span className="font-semibold tabular-nums">{question.average.toFixed(1)}</span>
                </p>
              ) : null}

              {(question.questionType === "rating" || question.questionType === "enps") &&
              question.average == null &&
              question.staffAnswerCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Average hidden until {results.minAnswers} staff have answered.
                </p>
              ) : null}

              {question.yesCount != null && question.noCount != null ? (
                <p className="text-sm tabular-nums">
                  Yes {question.yesCount} · No {question.noCount}
                </p>
              ) : null}

              {question.choiceCounts ? (
                <ul className="space-y-1 text-sm">
                  {question.choiceCounts.map((choice) => (
                    <li className="flex justify-between gap-3" key={choice.choiceId}>
                      <span>{choice.label}</span>
                      <span className="tabular-nums text-muted-foreground">{choice.count}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {question.textAnswers.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Comments (no names)
                  </p>
                  <ul className="space-y-2">
                    {question.textAnswers.map((text, index) => (
                      <li className="rounded-lg bg-muted/50 px-3 py-2 text-sm" key={`${question.questionId}-${index}`}>
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {question.departmentSplits.length > 0 ? (
                <div className="text-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    By department
                  </p>
                  <ul className="space-y-1">
                    {question.departmentSplits.map((split) => (
                      <li className="flex justify-between gap-3" key={split.departmentId}>
                        <span>{split.departmentName}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {split.average?.toFixed(1) ?? "—"} · {split.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {question.branchSplits.length > 0 ? (
                <div className="text-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    By branch
                  </p>
                  <ul className="space-y-1">
                    {question.branchSplits.map((split) => (
                      <li className="flex justify-between gap-3" key={split.branchId}>
                        <span>{split.branchName}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {split.average?.toFixed(1) ?? "—"} · {split.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </CardContent>
      </Card>

      <HrTableCard>
        <div className="px-5 py-4 text-sm text-muted-foreground">
          Public link answers are counted separately and never appear in department or branch splits.
        </div>
      </HrTableCard>
    </div>
  );
}
