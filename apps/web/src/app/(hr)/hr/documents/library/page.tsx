import { documentLibraryFiltersSchema, type DocumentLibraryFilters } from "@hrms/validation";

import { DocumentFilters } from "@/components/hr/documents/document-filters";
import { DocumentLibrary } from "@/components/hr/documents/document-library";
import { HrLinkButton, HrPagination } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listActiveEmployeesForSelect } from "@/lib/employees/queries";
import { requireRole } from "@/lib/auth/session";
import { listDocumentFolders } from "@/lib/hr/document-folders";
import { listDocumentLibrary, listRequiredDocuments } from "@/lib/hr/documents";

function buildLibraryHref(filters: DocumentLibraryFilters, page?: number) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  if (filters.employeeId) query.set("employeeId", filters.employeeId);
  if (filters.documentType) query.set("documentType", filters.documentType);
  if (filters.folderId) query.set("folderId", filters.folderId);
  if (filters.status !== "all") query.set("status", filters.status);
  if (page && page > 1) query.set("page", String(page));
  const qs = query.toString();
  return qs ? `/hr/documents/library?${qs}` : "/hr/documents/library";
}

export default async function DocumentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("hr_administrator");
  const raw = await searchParams;
  const filters = documentLibraryFiltersSchema.parse({
    search: typeof raw.search === "string" ? raw.search : undefined,
    employeeId: typeof raw.employeeId === "string" ? raw.employeeId : undefined,
    documentType: typeof raw.documentType === "string" ? raw.documentType : undefined,
    folderId: typeof raw.folderId === "string" ? raw.folderId : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    page: typeof raw.page === "string" ? raw.page : undefined,
  });

  const [library, employees, requiredTypes, folders] = await Promise.all([
    listDocumentLibrary(filters),
    listActiveEmployeesForSelect(),
    listRequiredDocuments(true),
    listDocumentFolders(),
  ]);

  const { total, page, pageSize } = library;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => {
    if (pageCount <= 5) return index + 1;
    const start = Math.min(Math.max(1, page - 2), pageCount - 4);
    return start + index;
  });

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={<HrLinkButton href="/hr/documents" variant="outline">Back to hub</HrLinkButton>}
        description="Browse, upload, download, and delete employee documents."
        title="Document library"
      />
      <DocumentFilters
        employees={employees}
        filters={filters}
        folders={folders}
        requiredTypes={requiredTypes}
      />
      <DocumentLibrary
        defaultEmployeeId={filters.employeeId}
        employees={employees}
        folders={folders}
        requiredTypes={requiredTypes}
        rows={library.rows}
      />
      <HrPagination
        from={from}
        itemLabel="documents"
        nextHref={page < pageCount ? buildLibraryHref(filters, page + 1) : undefined}
        page={page}
        pageLinks={pages.map((pageNumber) => ({
          page: pageNumber,
          href: buildLibraryHref(filters, pageNumber),
        }))}
        prevHref={page > 1 ? buildLibraryHref(filters, page - 1) : undefined}
        to={to}
        total={total}
      />
    </div>
  );
}
