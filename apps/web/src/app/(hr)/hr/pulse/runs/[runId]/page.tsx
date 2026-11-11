import { notFound } from "next/navigation";

import { PulseResultsView } from "@/components/hr/pulse/pulse-results";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getPulseSurveyRunDetail } from "@/lib/hr/pulse-survey-runs";
import { getPulseSurveyRunResults } from "@/lib/hr/pulse-survey-results";

export default async function Page({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  await requireRole("hr_administrator");
  await requireModule("performance");
  const { runId } = await params;
  const [run, results] = await Promise.all([
    getPulseSurveyRunDetail(runId),
    getPulseSurveyRunResults(runId),
  ]);
  if (!run || !results) notFound();

  return <PulseResultsView results={results} run={run} />;
}
