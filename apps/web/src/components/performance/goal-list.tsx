import { revalidatePath } from "next/cache";

import { addGoal, commentOnGoal, listGoals, markGoalDone, type GoalRow } from "@/lib/performance/goals";

async function addAction(formData: FormData) {
  "use server";
  await addGoal(String(formData.get("cycleId") ?? ""), String(formData.get("title") ?? ""), String(formData.get("note") ?? ""));
  revalidatePath("/employee/performance");
}

async function doneAction(formData: FormData) {
  "use server";
  await markGoalDone(String(formData.get("goalId") ?? ""));
  revalidatePath("/employee/performance");
}

async function commentAction(formData: FormData) {
  "use server";
  await commentOnGoal(String(formData.get("goalId") ?? ""), String(formData.get("managerNote") ?? ""));
  revalidatePath("/manager/team-performance");
}

export async function GoalList({
  cycleId,
  employeeId,
  canAdd,
  canComment,
}: {
  cycleId: string;
  employeeId: string;
  canAdd: boolean;
  canComment: boolean;
}) {
  const goals: GoalRow[] = await listGoals(cycleId, employeeId).catch(() => []);

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Goals</h2>
      <ul className="space-y-2 text-sm">
        {goals.map((goal) => (
          <li className="border border-[var(--border-primary)] p-3" key={goal.id}>
            <p className="font-medium">{goal.title}</p>
            {goal.note ? <p>{goal.note}</p> : null}
            <p className="text-[var(--foreground-muted)]">{goal.status}</p>
            {goal.managerNote ? <p>Manager: {goal.managerNote}</p> : null}
            {canAdd && goal.status === "open" ? (
              <form action={doneAction}>
                <input name="goalId" type="hidden" value={goal.id} />
                <button className="mt-2 text-sm underline" type="submit">Mark done</button>
              </form>
            ) : null}
            {canComment ? (
              <form action={commentAction} className="mt-2 flex gap-2">
                <input name="goalId" type="hidden" value={goal.id} />
                <input className="flex-1 border border-[var(--border-primary)] px-2 py-1" defaultValue={goal.managerNote ?? ""} name="managerNote" />
                <button className="border border-[var(--border-primary)] px-3 py-1" type="submit">Comment</button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {canAdd ? (
        <form action={addAction} className="space-y-2">
          <input name="cycleId" type="hidden" value={cycleId} />
          <input className="w-full border border-[var(--border-primary)] px-3 py-2 text-sm" name="title" placeholder="Goal" required />
          <input className="w-full border border-[var(--border-primary)] px-3 py-2 text-sm" name="note" placeholder="Note" />
          <button className="border border-[var(--border-primary)] px-3 py-2 text-sm" type="submit">Add goal</button>
        </form>
      ) : null}
    </section>
  );
}
