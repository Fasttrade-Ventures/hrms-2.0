import { ChecklistTemplates } from "@/components/hr/checklists/checklist-templates";
import { requireRole } from "@/lib/auth/session";
import { listChecklistTemplates } from "@/lib/employees/checklist-service";

export default async function ChecklistsPage() {
  await requireRole("hr_administrator");
  const templates = await listChecklistTemplates();

  return <ChecklistTemplates templates={templates} />;
}
