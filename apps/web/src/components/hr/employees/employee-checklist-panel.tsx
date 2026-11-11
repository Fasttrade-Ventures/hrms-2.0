import { EmptyState } from "@hrms/ui";

import {
  listEmployeeChecklistTasks,
  openTasksForProfile,
} from "@/lib/employees/checklist-service";
import {
  startEmployeeChecklist,
  toggleChecklistTask,
} from "@/lib/employees/checklist-actions";
import { ChecklistTaskDetailButton } from "@/components/hr/employees/checklist-task-detail-button";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { sanitizeAnnouncementHtml } from "@/lib/announcements/sanitize";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChecklistKind, EmployeeChecklistTask } from "@/lib/employees/checklists";

const KIND_LABEL: Record<ChecklistKind, string> = {
  onboarding: "Onboarding",
  offboarding: "Offboarding",
};

export async function EmployeeChecklistPanel({ employeeId }: { employeeId: string }) {
  const tasks = await listEmployeeChecklistTasks(employeeId);
  const open = openTasksForProfile(tasks);
  const done = tasks.length - open.length;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0 space-y-1">
          <CardTitle>Checklists</CardTitle>
          <CardDescription>
            {tasks.length === 0
              ? "Nothing has been copied onto this employee yet."
              : `${done} of ${tasks.length} done. The employee does not see this list.`}
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <StartChecklistButton employeeId={employeeId} kind="onboarding" />
          <StartChecklistButton employeeId={employeeId} kind="offboarding" />
        </div>
      </CardHeader>

      {tasks.length === 0 ? (
        <div className="space-y-4 px-5 py-6">
          <EmptyState
            description="Start onboarding or offboarding to copy the current template onto this employee. Edit the steps on the Checklists page."
            title="No checklist started"
            variant="flat"
          />
          <div className="flex justify-center">
            <HrLinkButton href="/hr/checklists" variant="outline">
              Open checklist templates
            </HrLinkButton>
          </div>
        </div>
      ) : (
        (["onboarding", "offboarding"] as const).map((kind) => {
          const group = tasks.filter((task) => task.kind === kind);
          if (group.length === 0) return null;
          return <ChecklistGroup employeeId={employeeId} key={kind} kind={kind} tasks={group} />;
        })
      )}
    </Card>
  );
}

function StartChecklistButton({ employeeId, kind }: { employeeId: string; kind: ChecklistKind }) {
  return (
    <form action={startEmployeeChecklist}>
      <input name="employeeId" type="hidden" value={employeeId} />
      <input name="kind" type="hidden" value={kind} />
      <Button type="submit" variant="outline">
        Start {KIND_LABEL[kind].toLowerCase()}
      </Button>
    </form>
  );
}

function ChecklistGroup({
  employeeId,
  kind,
  tasks,
}: {
  employeeId: string;
  kind: ChecklistKind;
  tasks: EmployeeChecklistTask[];
}) {
  const done = tasks.filter((task) => task.done).length;

  return (
    <section>
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-5 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">{KIND_LABEL[kind]}</h3>
        <p className="text-sm tabular-nums text-muted-foreground">
          {done} of {tasks.length} done
        </p>
      </div>
      <ul>
        {tasks.map((task, index) => (
          <li className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0" key={task.id}>
            <span className="w-6 shrink-0 text-sm tabular-nums text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className={task.done ? "font-medium text-muted-foreground" : "font-medium text-foreground"}>
                {task.title}
              </p>
              <p className="text-xs text-muted-foreground">{task.ownerLabel}</p>
            </div>
            <ChecklistTaskDetailButton
              description={sanitizeAnnouncementHtml(task.description)}
              done={task.done}
              title={task.title}
            />
            <form action={toggleChecklistTask}>
              <input name="taskId" type="hidden" value={task.id} />
              <input name="employeeId" type="hidden" value={employeeId} />
              <input name="done" type="hidden" value={String(task.done)} />
              <Button size="sm" type="submit" variant="outline">
                {task.done ? "Reopen" : "Mark done"}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
