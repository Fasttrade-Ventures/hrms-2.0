import { revalidatePath } from "next/cache";

import { PortalGhostButton, PortalSectionCard } from "@/components/portal/portal-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addGoal, commentOnGoal, listGoals, markGoalDone, type GoalRow } from "@/lib/performance/goals";

async function addAction(formData: FormData) {
  "use server";
  await addGoal(
    String(formData.get("cycleId") ?? ""),
    String(formData.get("title") ?? ""),
    String(formData.get("note") ?? ""),
  );
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
    <PortalSectionCard
      description={
        goals.length
          ? `${goals.length} goal${goals.length === 1 ? "" : "s"} for this review cycle.`
          : "No goals added for this cycle yet."
      }
      title="Goals"
    >
      {goals.length ? (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <li
              className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-3 sm:px-4"
              key={goal.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-[var(--foreground-primary)]">{goal.title}</p>
                  {goal.note ? (
                    <p className="text-sm text-[var(--foreground-secondary)]">{goal.note}</p>
                  ) : null}
                  <p className="text-xs capitalize text-[var(--foreground-muted)]">{goal.status}</p>
                  {goal.managerNote ? (
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      Manager: {goal.managerNote}
                    </p>
                  ) : null}
                </div>
                {canAdd && goal.status === "open" ? (
                  <form action={doneAction}>
                    <input name="goalId" type="hidden" value={goal.id} />
                    <Button size="sm" type="submit" variant="outline">
                      Mark done
                    </Button>
                  </form>
                ) : null}
              </div>
              {canComment ? (
                <form action={commentAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <input name="goalId" type="hidden" value={goal.id} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label className="text-xs" htmlFor={`goal-note-${goal.id}`}>
                      Manager comment
                    </Label>
                    <Input
                      defaultValue={goal.managerNote ?? ""}
                      id={`goal-note-${goal.id}`}
                      name="managerNote"
                      placeholder="Add feedback on this goal"
                    />
                  </div>
                  <Button size="sm" type="submit" variant="outline">
                    Save comment
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canAdd ? (
        <form action={addAction} className="mt-4 space-y-3 border-t border-[var(--border-primary)] pt-4">
          <input name="cycleId" type="hidden" value={cycleId} />
          <div className="space-y-1">
            <Label htmlFor="goal-title">New goal</Label>
            <Input id="goal-title" name="title" placeholder="Goal title" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="goal-note">Note</Label>
            <Input id="goal-note" name="note" placeholder="Optional note" />
          </div>
          <PortalGhostButton type="submit">Add goal</PortalGhostButton>
        </form>
      ) : null}
    </PortalSectionCard>
  );
}
