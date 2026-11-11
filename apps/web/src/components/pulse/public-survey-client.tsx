"use client";

import { useState } from "react";

import { submitPublicPulseAction } from "@/app/survey/[token]/actions";
import { SurveyAnswerForm } from "@/components/pulse/survey-answer-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PulseRunSection } from "@/lib/hr/pulse-survey-runs";

export function PublicSurveyClient({
  token,
  name,
  status,
  sections,
}: {
  token: string;
  name: string;
  status: string;
  sections: PulseRunSection[];
}) {
  const [done, setDone] = useState(false);

  if (status !== "open") {
    return (
      <Card className="py-0">
        <CardHeader className="px-5 py-5">
          <CardTitle>{name}</CardTitle>
          <CardDescription>This survey is not accepting answers right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="py-0">
        <CardHeader className="px-5 py-5">
          <CardTitle>Thank you</CardTitle>
          <CardDescription>Your answers were saved. You can close this page.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <SurveyAnswerForm
      description="This is a public link. Answers are counted separately from staff login answers."
      onSubmit={async (answers) => {
        const result = await submitPublicPulseAction(token, answers);
        if (!result.ok) throw new Error(result.error);
        setDone(true);
      }}
      sections={sections}
      title={name}
    />
  );
}
