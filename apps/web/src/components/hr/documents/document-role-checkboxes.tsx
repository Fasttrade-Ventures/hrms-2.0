"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const roleOptions = [
  { value: "hr_administrator", label: "HR administrator" },
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
] as const;

export function DocumentRoleCheckboxes({
  defaultRoles = ["hr_administrator", "employee"],
}: {
  defaultRoles?: string[];
}) {
  const [roles, setRoles] = useState<string[]>(defaultRoles);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">Access roles</Label>
      {roles.map((role) => (
        <input key={role} name="accessRoles" type="hidden" value={role} />
      ))}
      <div className="flex flex-wrap gap-4">
        {roleOptions.map((role) => (
          <label className="flex items-center gap-2 text-sm" htmlFor={`access-role-${role.value}`} key={role.value}>
            <Checkbox
              checked={roles.includes(role.value)}
              id={`access-role-${role.value}`}
              onCheckedChange={(checked) => {
                setRoles((current) =>
                  checked === true
                    ? [...current, role.value]
                    : current.filter((item) => item !== role.value),
                );
              }}
            />
            {role.label}
          </label>
        ))}
      </div>
    </div>
  );
}
