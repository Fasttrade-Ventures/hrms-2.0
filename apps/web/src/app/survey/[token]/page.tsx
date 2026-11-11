import { notFound } from "next/navigation";

import { PublicSurveyClient } from "@/components/pulse/public-survey-client";
import { getPulseSurveyByPublicToken } from "@/lib/hr/pulse-survey-runs";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const survey = await getPulseSurveyByPublicToken(token);
  if (!survey) notFound();

  return (
    <main className="mx-auto min-h-dvh max-w-3xl space-y-6 px-4 py-10">
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--accent-primary)]">BukuHR Pulse</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Survey</h1>
      </div>
      <PublicSurveyClient
        name={survey.name}
        sections={survey.sections}
        status={survey.status}
        token={token}
      />
    </main>
  );
}
