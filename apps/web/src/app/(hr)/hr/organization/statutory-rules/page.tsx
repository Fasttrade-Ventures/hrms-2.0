import { ListCard } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { listStatutoryRuleVersions } from "@/lib/payroll/settings";

export default async function StatutoryRulesPage() {
  requireModule("payroll");
  await requireRole("hr_administrator");
  const rules = await listStatutoryRuleVersions();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Effective-dated KWSP, PERKESO, and LHDN rule packs used for payroll calculations."
        title="Statutory rules"
      />
      <ListCard
        columns={[
          { key: "rule", label: "Rule set" },
          { key: "from", label: "Effective from" },
          { key: "to", label: "Effective to" },
        ]}
        header={<p className="text-sm font-medium">Rule versions ({rules.length})</p>}
        rows={rules.map((rule) => ({
          id: rule.id,
          cells: {
            rule: rule.rule_set,
            from: rule.effective_from,
            to: rule.effective_to ?? "—",
          },
        }))}
      />
    </div>
  );
}
