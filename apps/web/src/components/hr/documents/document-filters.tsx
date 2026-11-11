"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DocumentFormField } from "@/components/hr/documents/document-form-field";
import { PortalCard } from "@/components/portal/portal-card";
import { PortalFilterChip, PortalFilterChips } from "@/components/portal/portal-filter-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DocumentLibraryFilters } from "@hrms/validation";

const ALL = "__all__";

function buildHref(base: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(base)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/hr/documents/library?${query}` : "/hr/documents/library";
}

export function DocumentFilters({
  filters,
  employees,
  requiredTypes,
  folders,
}: {
  filters: DocumentLibraryFilters;
  employees: Array<{ id: string; full_name: string; employee_number: string }>;
  requiredTypes: Array<{ id: string; name: string }>;
  folders: Array<{ id: string; name: string; parentName: string | null }>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search ?? "");
  const [employeeId, setEmployeeId] = useState(filters.employeeId ?? "");
  const [documentType, setDocumentType] = useState(filters.documentType ?? "");
  const [folderId, setFolderId] = useState(filters.folderId ?? "");

  const employeeLabel = employeeId
    ? (() => {
        const employee = employees.find((item) => item.id === employeeId);
        return employee ? `${employee.employee_number} · ${employee.full_name}` : "Employee";
      })()
    : "All employees";

  const documentTypeLabel = documentType || "All types";

  const folderLabel = folderId
    ? (() => {
        const folder = folders.find((item) => item.id === folderId);
        return folder
          ? `${folder.parentName ? `${folder.parentName} / ` : ""}${folder.name}`
          : "Folder";
      })()
    : "All folders";

  const base = {
    search: search.trim() || undefined,
    employeeId: employeeId || undefined,
    documentType: documentType || undefined,
    folderId: folderId || undefined,
  };

  function applyFilters() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (employeeId) params.set("employeeId", employeeId);
    if (documentType) params.set("documentType", documentType);
    if (folderId) params.set("folderId", folderId);
    if (filters.status !== "all") params.set("status", filters.status);
    const query = params.toString();
    router.push(query ? `/hr/documents/library?${query}` : "/hr/documents/library");
  }

  const statusKeys = ["all", "expiring", "expired", "no_expiry"] as const;
  const statusLabels: Record<(typeof statusKeys)[number], string> = {
    all: "All",
    expiring: "Expiring",
    expired: "Expired",
    no_expiry: "No expiry",
  };

  return (
    <PortalCard padding="sm">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <DocumentFormField id="search" label="Search">
            <Input
              id="search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Employee, type, file…"
              value={search}
            />
          </DocumentFormField>

          <DocumentFormField label="Employee">
            <Select
              onValueChange={(value) => setEmployeeId(!value || value === ALL ? "" : value)}
              value={employeeId || ALL}
            >
              <SelectTrigger
                className={cn("w-full", !employeeId && "text-muted-foreground")}
              >
                <span className="truncate">{employeeLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.employee_number} · {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DocumentFormField>

          <DocumentFormField label="Type">
            <Select
              onValueChange={(value) => setDocumentType(!value || value === ALL ? "" : value)}
              value={documentType || ALL}
            >
              <SelectTrigger
                className={cn("w-full", !documentType && "text-muted-foreground")}
              >
                <span className="truncate">{documentTypeLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {requiredTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DocumentFormField>

          <DocumentFormField label="Folder">
            <Select
              onValueChange={(value) => setFolderId(!value || value === ALL ? "" : value)}
              value={folderId || ALL}
            >
              <SelectTrigger
                className={cn("w-full", !folderId && "text-muted-foreground")}
              >
                <span className="truncate">{folderLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All folders</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.parentName ? `${folder.parentName} / ` : ""}
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DocumentFormField>

          <div className="flex items-end">
            <Button className="w-full md:w-auto" onClick={applyFilters} type="button">
              Apply
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PortalFilterChips>
            {statusKeys.map((status) => (
              <PortalFilterChip
                active={filters.status === status}
                href={buildHref({ ...base, status: status === "all" ? undefined : status })}
                key={status}
              >
                {statusLabels[status]}
              </PortalFilterChip>
            ))}
          </PortalFilterChips>
          <Button render={<Link href="/hr/documents/library" />} size="sm" variant="ghost">
            Clear filters
          </Button>
        </div>
      </div>
    </PortalCard>
  );
}
