import Link from "next/link";

import { EmptyState } from "@hrms/ui";

import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { Badge } from "@/components/ui/badge";
import type { LetterTemplateRow } from "@/lib/letters/templates";

import { LETTER_TYPE_LABELS } from "./letter-template-form";

export function LetterTemplateList({
  templates,
  typeFilter,
}: {
  templates: LetterTemplateRow[];
  typeFilter?: LetterTemplateRow["type"];
}) {
  const filters: Array<{ label: string; href: string; active: boolean }> = [
    { label: "All", href: "/hr/letters", active: !typeFilter },
    { label: "Offer", href: "/hr/letters?type=offer", active: typeFilter === "offer" },
    {
      label: "Agreement",
      href: "/hr/letters?type=employment_agreement",
      active: typeFilter === "employment_agreement",
    },
  ];

  return (
    <PortalSectionCard
      action={
        <HrLinkButton href="/hr/letters/new" size="sm">
          New template
        </HrLinkButton>
      }
      description="Offer letters and employment agreements with merge tags."
      title="Templates"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <HrLinkButton
            href={filter.href}
            key={filter.label}
            size="sm"
            variant={filter.active ? "default" : "outline"}
          >
            {filter.label}
          </HrLinkButton>
        ))}
      </div>

      {templates.length === 0 ? (
        <EmptyState
          description="Create an offer template so recruiters can generate offer PDFs."
          title="No templates yet"
          variant="flat"
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {templates.map((template) => (
            <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={template.id}>
              <div className="min-w-0 space-y-1">
                <Link className="font-medium text-primary" href={`/hr/letters/${template.id}/edit`}>
                  {template.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(template.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{LETTER_TYPE_LABELS[template.type]}</Badge>
                <Badge variant={template.is_active ? "success" : "outline"}>
                  {template.is_active ? "Active" : "Inactive"}
                </Badge>
                <HrLinkButton href={`/hr/letters/${template.id}/edit`} size="sm" variant="outline">
                  Edit
                </HrLinkButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PortalSectionCard>
  );
}
