import {
  listEmployeeChecklistTasks,
  openTasksForProfile,
  startEmployeeChecklist,
  toggleChecklistTask,
} from "@/lib/employees/checklist-service";

export async function EmployeeChecklistPanel({ employeeId }: { employeeId: string }) {
  const tasks = await listEmployeeChecklistTasks(employeeId);
  const open = openTasksForProfile(tasks);

  return (
    <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Checklists</h2>
        <p className="text-sm text-[var(--foreground-muted)]">{open.length} open</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <form action={startEmployeeChecklist}>
          <input name="employeeId" type="hidden" value={employeeId} />
          <input name="kind" type="hidden" value="onboarding" />
          <button className="h-10 border border-[var(--border-primary)] px-4 text-sm" type="submit">
            Start onboarding
          </button>
        </form>
        <form action={startEmployeeChecklist}>
          <input name="employeeId" type="hidden" value={employeeId} />
          <input name="kind" type="hidden" value="offboarding" />
          <button className="h-10 border border-[var(--border-primary)] px-4 text-sm" type="submit">
            Start offboarding
          </button>
        </form>
      </div>
      {tasks.length === 0 ? <p className="text-sm text-[var(--foreground-muted)]">No checklist started.</p> : null}
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li className="flex flex-wrap items-center justify-between gap-3 text-sm" key={task.id}>
            <span>
              {task.done ? "Done" : "Open"} · {task.kind} · {task.title} · {task.ownerLabel}
            </span>
            <form action={toggleChecklistTask}>
              <input name="taskId" type="hidden" value={task.id} />
              <input name="employeeId" type="hidden" value={employeeId} />
              <input name="done" type="hidden" value={String(task.done)} />
              <button className="h-9 border border-[var(--border-primary)] px-3" type="submit">
                {task.done ? "Mark open" : "Mark done"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
