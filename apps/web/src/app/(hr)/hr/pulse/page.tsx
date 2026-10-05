import { revalidatePath } from "next/cache";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireModule } from "@/lib/entitlements";
import { createPulseSurvey, listPulseSurveys } from "@/lib/hr/pulse-service";

async function createAction(formData: FormData) {
  "use server";
  await requireModule("performance");
  await createPulseSurvey(
    String(formData.get("question") ?? ""),
    String(formData.get("opensOn") ?? ""),
    String(formData.get("closesOn") ?? ""),
  );
  revalidatePath("/hr/pulse");
}

export default async function Page() {
  await requireModule("performance");
  const surveys = await listPulseSurveys();

  return (
    <div className="space-y-6">
      <PortalPageHeader description="One question. Staff answer once. You see the average, not the names." title="Pulse" />
      <form action={createAction} className="space-y-3 border border-[var(--border-primary)] p-4">
        <label className="block text-sm">
          Question
          <input className="mt-1 w-full border border-[var(--border-primary)] px-3 py-2" name="question" required />
        </label>
        <div className="flex gap-3">
          <label className="text-sm">
            Opens
            <input className="mt-1 block border border-[var(--border-primary)] px-3 py-2" name="opensOn" required type="date" />
          </label>
          <label className="text-sm">
            Closes
            <input className="mt-1 block border border-[var(--border-primary)] px-3 py-2" name="closesOn" required type="date" />
          </label>
        </div>
        <button className="border border-[var(--border-primary)] px-4 py-2 text-sm" type="submit">
          Open survey
        </button>
      </form>
      <ul className="space-y-3">
        {surveys.map((survey) => (
          <li className="border border-[var(--border-primary)] p-4 text-sm" key={survey.id}>
            <p className="font-medium">{survey.question}</p>
            <p className="text-[var(--foreground-muted)]">
              {survey.opensOn} to {survey.closesOn} · {survey.count} answers
              {survey.average == null ? "" : ` · average ${survey.average.toFixed(1)}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
