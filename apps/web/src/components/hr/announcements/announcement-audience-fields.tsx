"use client";

import { useState } from "react";

import { AnnouncementFormField } from "@/components/hr/announcements/announcement-form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

const ALL_BRANCHES = "__all_branches__";

export function AnnouncementAudienceFields({
  branches,
  departments,
  defaultBranchId = "",
  defaultRoles = [],
  defaultDepartmentIds = [],
}: {
  branches: Option[];
  departments: Option[];
  defaultBranchId?: string | null;
  defaultRoles?: string[];
  defaultDepartmentIds?: string[];
}) {
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");
  const [roles, setRoles] = useState<string[]>(defaultRoles);
  const [departmentIds, setDepartmentIds] = useState<string[]>(defaultDepartmentIds);

  const branchLabel = branchId
    ? branches.find((branch) => branch.id === branchId)?.name ?? "Branch"
    : "All branches";

  const departmentLabel =
    departmentIds.length === 0
      ? "All departments"
      : departmentIds.length === 1
        ? departments.find((item) => item.id === departmentIds[0])?.name ?? "1 department"
        : `${departmentIds.length} departments`;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <input name="branchId" type="hidden" value={branchId} />
      {roles.map((role) => (
        <input key={role} name="targetRoles" type="hidden" value={role} />
      ))}
      {departmentIds.map((departmentId) => (
        <input key={departmentId} name="targetDepartmentIds" type="hidden" value={departmentId} />
      ))}

      <AnnouncementFormField hint="Empty = all branches." label="Branch">
        <Select
          onValueChange={(value) => setBranchId(!value || value === ALL_BRANCHES ? "" : value)}
          value={branchId || ALL_BRANCHES}
        >
          <SelectTrigger
            className={cn("w-full", !branchId && "text-muted-foreground")}
          >
            <span className="truncate">{branchLabel}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_BRANCHES}>All branches</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AnnouncementFormField>

      <AnnouncementFormField hint="Empty = all roles." label="Roles">
        <ToggleGroup
          className="flex w-full flex-wrap"
          onValueChange={(value) => setRoles(value)}
          spacing={0}
          value={roles}
          variant="outline"
          multiple
        >
          <ToggleGroupItem className="flex-1 text-xs" value="employee">
            Employees
          </ToggleGroupItem>
          <ToggleGroupItem className="flex-1 text-xs" value="manager">
            Managers
          </ToggleGroupItem>
        </ToggleGroup>
      </AnnouncementFormField>

      <AnnouncementFormField hint="Empty = all departments." label="Departments">
        <Select
          multiple
          onValueChange={(value) => setDepartmentIds(value)}
          value={departmentIds}
        >
          <SelectTrigger className={cn("w-full", departmentIds.length === 0 && "text-muted-foreground")}>
            <span className="truncate">{departmentLabel}</span>
          </SelectTrigger>
          <SelectContent>
            {departments.length === 0 ? (
              <SelectItem disabled value="__none__">
                No departments yet
              </SelectItem>
            ) : (
              departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </AnnouncementFormField>
    </div>
  );
}
