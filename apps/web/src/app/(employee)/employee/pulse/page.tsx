import { revalidatePath } from "next/cache";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireModule } from "@/lib/entitlements";
import { listOpenPulseSurveys, submitPulseScore } from "@/lib/hr/pulse-service";

async function answerAction(formData: FormData) {
  "use server";
  await submitPulseScore(String(formData.get("surveyId") ?? ""), Number(formData.get("score")));
  revalidatePath("/employee/pulse");
}

export default async function Page() {
  await requireModule("performance");
  const surveys = await listOpenPulseSurveys();

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Answer once. Your name is not shown on the average." title="Pulse" />
      {surveys.length === 0 ? <p className="text-sm">No open survey.</p> : null}
      {surveys.map((survey) => (
        <form action={answerAction} className="space-y-3 border border-[var(--border-primary)] p-4" key={survey.id}>
          <p className="text-sm font-medium">{survey.question}</p>
          <input name="surveyId" type="hidden" value={survey.id} />
          <label className="block text-sm">
            Score from 0 to 10
            <input className="mt-1 block w-24 border border-[var(--border-primary)] px-3 py-2" max={10} min={0} name="score" required type="number" />
          </label>
          <button className="border border-[var(--border-primary)] px-4 py-2 text-sm" type="submit">
            Submit
          </button>
        </form>
      ))}
    </div>
  );
}
