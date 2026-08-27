import Link from "next/link";

import { EmptyState } from "@hrms/ui";

import { uploadBranchDocumentAction } from "@/app/(branch-admin)/branch-admin/documents/actions";
import { UploadDocumentDialog } from "@/components/hr/documents/upload-document-dialog";
import { HrLinkButton, HrPagination } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { listBranchDocuments } from "@/lib/branch-admin/documents";
import { listDocumentFolders } from "@/lib/hr/document-folders";
import { listRequiredDocuments } from "@/lib/hr/documents";
import { listActiveEmployeesForBehalf } from "@/lib/hr/apply-behalf";

export default async function BranchDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const context = await requireBranchAdminContext();
  const query = await searchParams;
  const page = Number(query.page ?? "1") || 1;
  const [library, employees, requiredTypes, folders] = await Promise.all([
    listBranchDocuments(page, 20),
    listActiveEmployeesForBehalf({ branchIds: context.branchIds }),
    listRequiredDocuments(true),
    listDocumentFolders(),
  ]);
  const pageCount = Math.max(1, Math.ceil(library.total / library.pageSize));

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <HrLinkButton href="/branch-admin/documents/compliance" variant="outline">
              Compliance
            </HrLinkButton>
            <UploadDocumentDialog
              action={uploadBranchDocumentAction}
              employees={employees}
              folders={folders.map((folder) => ({
                id: folder.id,
                name: folder.name,
                parentName: folder.parentName,
              }))}
              requiredTypes={requiredTypes.map((type) => ({
                id: type.id,
                name: type.name,
                requiresExpiry: type.requiresExpiry,
              }))}
            />
          </div>
        }
        description={`${context.branchName} · employee documents for your branch scope`}
        title="Documents"
      />

      {library.truncated ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900">
          Showing the most recent documents (capped fetch). Open an employee profile if you need older
          files.
        </p>
      ) : null}

      {library.rows.length === 0 ? (
        <EmptyState
          description="No documents yet. Use Upload document to attach files for branch employees."
          title="No documents"
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)]">
          <div className="grid grid-cols-[1.4fr_1fr_1.2fr_6rem] gap-3 border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Employee</span>
            <span>Type</span>
            <span className="hidden md:block">File</span>
            <span>Expires</span>
          </div>
          <div className="divide-y divide-[var(--border-primary)]">
            {library.rows.map((row) => (
              <div
                className="grid grid-cols-[1.4fr_1fr_1.2fr_6rem] gap-3 px-4 py-3 text-sm"
                key={row.id}
              >
                <Link
                  className="font-medium text-[var(--accent-primary)] hover:underline"
                  href="/branch-admin/employees"
                >
                  {row.employeeName}
                </Link>
                <span>{row.documentType}</span>
                <span className="hidden truncate text-muted-foreground md:block">{row.fileName}</span>
                <span>{row.expiresAt ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <HrPagination
        from={library.total === 0 ? 0 : (library.page - 1) * library.pageSize + 1}
        itemLabel="documents"
        nextHref={
          library.page < pageCount ? `/branch-admin/documents?page=${library.page + 1}` : undefined
        }
        page={library.page}
        pageLinks={Array.from({ length: Math.min(pageCount, 5) }, (_, index) => {
          const pageNumber = index + 1;
          return { page: pageNumber, href: `/branch-admin/documents?page=${pageNumber}` };
        })}
        prevHref={library.page > 1 ? `/branch-admin/documents?page=${library.page - 1}` : undefined}
        to={Math.min(library.page * library.pageSize, library.total)}
        total={library.total}
      />
    </div>
  );
}
