import { EmptyState } from "@hrms/ui";

import { AddChecklistTaskButton } from "@/components/hr/checklists/add-checklist-task-dialog";
import { RemoveTemplateItemButton } from "@/components/hr/checklists/remove-template-item-button";
import { HrStatCards } from "@/components/hr/hr-ui";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChecklistKind } from "@/lib/employees/checklists";

type TemplateItem = { id: string; title: string; ownerLabel: string };

const PROGRAMS: Record<ChecklistKind, { title: string; summary: string; empty: string }> = {
  onboarding: {
    title: "Onboarding",
    summary: "Appears on an employee profile after HR starts onboarding.",
    empty: "Add the tasks every new joiner should move through.",
  },
  offboarding: {
    title: "Offboarding",
    summary: "Appears on an employee profile after HR starts offboarding.",
    empty: "Add the tasks every leaver should move through.",
  },
};

export function ChecklistTemplates({
  templates,
}: {
  templates: Array<{ kind: ChecklistKind; items: TemplateItem[] }>;
}) {
  const onboarding = templates.find((template) => template.kind === "onboarding")?.items.length ?? 0;
  const offboarding = templates.find((template) => template.kind === "offboarding")?.items.length ?? 0;
  const owners = new Set(
    templates.flatMap((template) => template.items.map((item) => item.ownerLabel.trim()).filter(Boolean)),
  );

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Add the steps here. They stay on this page until HR opens an employee and starts onboarding or offboarding. Only HR sees the copied list, on that employee's profile."
        title="Checklists"
      />

      <HrStatCards
        items={[
          { label: "Onboarding tasks", value: onboarding, hint: "In the joiner template" },
          { label: "Offboarding tasks", value: offboarding, hint: "In the leaver template" },
          { label: "Roles", value: owners.size, hint: "Named on a task" },
        ]}
      />

      <div className="grid items-stretch gap-4">
        {templates.map((template) => (
          <ChecklistProgram items={template.items} key={template.kind} kind={template.kind} />
        ))}
      </div>
    </div>
  );
}

function ChecklistProgram({ kind, items }: { kind: ChecklistKind; items: TemplateItem[] }) {
  const program = PROGRAMS[kind];

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0 space-y-1">
          <CardTitle>{program.title}</CardTitle>
          <CardDescription>{program.summary}</CardDescription>
        </div>
        <p className="shrink-0 pt-0.5 text-sm tabular-nums text-muted-foreground">
          {items.length} {items.length === 1 ? "task" : "tasks"}
        </p>
      </CardHeader>

      {items.length === 0 ? (
        <div className="px-5 py-6">
          <EmptyState description={program.empty} title="No tasks yet" variant="flat" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-16 px-5 py-3 font-semibold" scope="col">
                  Step
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Task
                </th>
                <th className="w-40 px-4 py-3 font-semibold" scope="col">
                  Role
                </th>
                <th className="w-24 px-3 py-3" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr className="border-b border-border last:border-b-0" key={item.id}>
                  <td className="px-5 py-3.5 tabular-nums text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3.5 font-medium text-foreground">{item.title}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{item.ownerLabel}</td>
                  <td className="px-3 py-2 text-right">
                    <RemoveTemplateItemButton itemId={item.id} title={item.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CardFooter className="mt-auto flex justify-end bg-card px-5 py-4">
        <AddChecklistTaskButton kind={kind} />
      </CardFooter>
    </Card>
  );
}
