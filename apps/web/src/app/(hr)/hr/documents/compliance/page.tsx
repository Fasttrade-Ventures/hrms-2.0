import { ComplianceMatrix } from "@/components/hr/documents/compliance-matrix";
import { HrLinkButton, HrPagination } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { buildComplianceMatrix, listRequiredDocuments } from "@/lib/hr/documents";

const COMPLIANCE_PAGE_SIZE = 25;

function buildComplianceHref(page: number) {
  if (page <= 1) return "/hr/documents/compliance";
  return `/hr/documents/compliance?page=${page}`;
}

export default async function DocumentCompliancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("hr_administrator");
  const raw = await searchParams;
  const page = Math.max(1, Number(typeof raw.page === "string" ? raw.page : "1") || 1);

  const [allRows, requiredTypes] = await Promise.all([
    buildComplianceMatrix(),
    listRequiredDocuments(true),
  ]);

  const total = allRows.length;
  const pageCount = Math.max(1, Math.ceil(total / COMPLIANCE_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const from = total === 0 ? 0 : (currentPage - 1) * COMPLIANCE_PAGE_SIZE + 1;
  const to = Math.min(currentPage * COMPLIANCE_PAGE_SIZE, total);
  const rows = allRows.slice(from - 1, to);
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => {
    if (pageCount <= 5) return index + 1;
    const start = Math.min(Math.max(1, currentPage - 2), pageCount - 4);
    return start + index;
  });

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={<HrLinkButton href="/hr/documents" variant="outline">Back to hub</HrLinkButton>}
        description="Track missing, expiring, and valid required documents per employee."
        title="Compliance matrix"
      />
      <ComplianceMatrix requiredNames={requiredTypes.map((row) => row.name)} rows={rows} />
      <HrPagination
        from={from}
        itemLabel="employees"
        nextHref={currentPage < pageCount ? buildComplianceHref(currentPage + 1) : undefined}
        page={currentPage}
        pageLinks={pages.map((pageNumber) => ({
          page: pageNumber,
          href: buildComplianceHref(pageNumber),
        }))}
        prevHref={currentPage > 1 ? buildComplianceHref(currentPage - 1) : undefined}
        to={to}
        total={total}
      />
    </div>
  );
}
