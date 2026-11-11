"use client";

import { useRouter } from "next/navigation";

import { submitEmployeePulseAction } from "@/app/(employee)/employee/pulse/actions";
import { SurveyAnswerForm } from "@/components/pulse/survey-answer-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/components/employee/employee-shared";
import type { PulseRunSection } from "@/lib/hr/pulse-survey-runs";

type OpenSurvey = {
  id: string;
  name: string;
  opensOn: string;
  closesOn: string;
  alreadyAnswered: boolean;
  sections: PulseRunSection[];
};

export function EmployeePulseClient({ surveys }: { surveys: OpenSurvey[] }) {
  const router = useRouter();

  if (surveys.length === 0) {
    return (
      <Card className="py-0">
        <CardHeader className="px-5 py-5">
          <CardTitle>No open survey</CardTitle>
          <CardDescription>When HR opens a pulse for you, it will appear here.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {surveys.map((survey) =>
        survey.alreadyAnswered ? (
          <Card className="py-0" key={survey.id}>
            <CardHeader className="px-5 py-5">
              <CardTitle>{survey.name}</CardTitle>
              <CardDescription>
                You already answered. Closes {formatDate(survey.closesOn)}. Your name is not shown on the average.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <SurveyAnswerForm
            description={`Open until ${formatDate(survey.closesOn)}. Answer once. Your name is not shown on the results.`}
            key={survey.id}
            onSubmit={async (answers) => {
              const result = await submitEmployeePulseAction({ runId: survey.id, answers });
              if (!result.ok) throw new Error(result.error);
              router.refresh();
            }}
            sections={survey.sections}
            title={survey.name}
          />
        ),
      )}
    </div>
  );
}
