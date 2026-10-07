import { notFound } from "next/navigation";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { TemplateBuilder } from "@/components/hr/performance/template-builder";
import { listTemplateKpis } from "@/lib/performance/kpi-service";
import { addTemplateKpi } from "@/lib/performance/kpi-actions";
import { getAppraisalTemplateDetail } from "@/lib/hr/performance-templates";
import { listDepartments } from "@/lib/hr/organization";
import { requireModule } from "@/lib/entitlements";
import { requireRole } from "@/lib/auth/session";

type Props = {
  params: Promise<{ templateId: string }>;
};

export default async function EditAppraisalTemplatePage({ params }: Props) {
  await requireRole("hr_administrator");
  await requireModule("performance");

  const { templateId } = await params;
  const [template, departments, kpis] = await Promise.all([
    getAppraisalTemplateDetail(templateId).catch(() => null),
    listDepartments().catch(() => []),
    listTemplateKpis(templateId).catch(() => []),
  ]);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={`Edit Template: ${template.name}`}
        description="Update evaluation criteria, question descriptions, and weighting."
      />

      <TemplateBuilder
        initialData={template}
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      />

      <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold">KPIs</h2>
        {kpis.length === 0 ? <p className="text-sm text-[var(--foreground-muted)]">No KPI rows yet.</p> : null}
        <ul className="space-y-1 text-sm">
          {kpis.map((kpi) => (
            <li key={kpi.id}>
              {kpi.name} · weight {kpi.weight}
              {kpi.target ? ` · target ${kpi.target}` : ""}
            </li>
          ))}
        </ul>
        <form action={addTemplateKpi} className="flex flex-wrap items-end gap-3">
          <input name="templateId" type="hidden" value={template.id} />
          <label className="text-sm">
            Name
            <input className="mt-1 block h-10 border border-[var(--border-primary)] px-3" name="name" required />
          </label>
          <label className="text-sm">
            Weight
            <input className="mt-1 block h-10 w-24 border border-[var(--border-primary)] px-3" max={100} min={1} name="weight" required type="number" />
          </label>
          <label className="text-sm">
            Target
            <input className="mt-1 block h-10 border border-[var(--border-primary)] px-3" name="target" />
          </label>
          <button className="h-10 bg-[var(--accent-primary)] px-4 text-sm text-white" type="submit">
            Add KPI
          </button>
        </form>
      </section>
    </div>
  );
}
