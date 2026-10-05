import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { addChecklistTemplateItem, listChecklistTemplates } from "@/lib/employees/checklist-service";
import { requireRole } from "@/lib/auth/session";

export default async function ChecklistsPage() {
  await requireRole("hr_administrator");
  const templates = await listChecklistTemplates();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="These tasks are copied onto an employee when HR starts onboarding or offboarding."
        title="Checklists"
      />
      {templates.map((template) => (
        <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6" key={template.kind}>
          <h2 className="text-base font-semibold capitalize">{template.kind}</h2>
          {template.items.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)]">No tasks yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {template.items.map((item) => (
                <li key={item.id}>
                  {item.title} · {item.ownerLabel}
                </li>
              ))}
            </ul>
          )}
          <form action={addChecklistTemplateItem} className="flex flex-wrap items-end gap-3">
            <input name="kind" type="hidden" value={template.kind} />
            <label className="text-sm">
              Task
              <input className="mt-1 block h-10 border border-[var(--border-primary)] px-3" name="title" required />
            </label>
            <label className="text-sm">
              Owner
              <input className="mt-1 block h-10 border border-[var(--border-primary)] px-3" defaultValue="HR" name="ownerLabel" />
            </label>
            <button className="h-10 bg-[var(--accent-primary)] px-4 text-sm text-white" type="submit">
              Add task
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}
