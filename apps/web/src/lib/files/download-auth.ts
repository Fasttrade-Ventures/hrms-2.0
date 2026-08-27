import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAnnouncementAttachment } from "@/lib/announcements/queries";
import { rolesCanAccessFolder } from "@/lib/hr/document-folder-access";
import { createClient } from "@/lib/supabase/server";

async function resolveBranchAdminScopeIds(
  organizationId: string,
  userId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, employee_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership?.employee_id) return [];

  const { data: scoped } = await supabase
    .from("organization_membership_branches")
    .select("branch_id")
    .eq("membership_id", membership.id)
    .eq("organization_id", organizationId);

  const branchIds = (scoped ?? []).map((row) => row.branch_id);
  if (branchIds.length > 0) return branchIds;

  const { data: employee } = await supabase
    .from("employees")
    .select("branch_id")
    .eq("id", membership.employee_id)
    .maybeSingle();

  return employee?.branch_id ? [employee.branch_id] : [];
}

async function canDownloadAnnouncementFile(input: {
  roles: string[];
  employeeId: string | null;
  fileId: string;
  organizationId: string;
}): Promise<boolean> {
  if (!input.employeeId) return false;

  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("branch_id, department_id")
    .eq("id", input.employeeId)
    .maybeSingle();

  return canAccessAnnouncementAttachment({
    organizationId: input.organizationId,
    fileId: input.fileId,
    viewer: {
      branchId: employee?.branch_id ?? null,
      departmentId: employee?.department_id ?? null,
      roles: input.roles,
    },
  });
}

export async function canDownloadFile(input: {
  roles: string[];
  employeeId: string | null;
  fileId: string;
  organizationId?: string;
  userId?: string;
}): Promise<boolean> {
  if (!input.organizationId) return false;

  const admin = createAdminClient();
  const { data: file } = await admin
    .from("file_objects")
    .select("id, deleted_at, category, organization_id")
    .eq("id", input.fileId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!file || file.deleted_at) return false;
  if (file.organization_id !== input.organizationId) return false;

  if (file.category === "announcement-attachments") {
    if (input.roles.includes("hr_administrator")) return true;
    return canDownloadAnnouncementFile({
      roles: input.roles,
      employeeId: input.employeeId,
      fileId: input.fileId,
      organizationId: input.organizationId,
    });
  }

  if (file.category === "leave-attachments") {
    if (input.roles.includes("hr_administrator")) return true;
    if (!input.employeeId) return false;

    const supabase = await createClient();
    const { data: leaveReq } = await supabase
      .from("leave_requests")
      .select("employee_id, employees(manager_employee_id)")
      .eq("organization_id", input.organizationId)
      .eq("attachment_file_id", input.fileId)
      .maybeSingle();

    if (!leaveReq) return false;

    if (leaveReq.employee_id === input.employeeId) return true;

    const requesterManagerId = (leaveReq.employees as { manager_employee_id?: string | null } | null)
      ?.manager_employee_id;
    if (input.roles.includes("manager") && requesterManagerId === input.employeeId) return true;

    return false;
  }

  const supabase = await createClient();
  const { data: link } = await supabase
    .from("employee_documents")
    .select("employee_id, document_folders(access_roles), employees(branch_id)")
    .eq("file_id", input.fileId)
    .maybeSingle();

  if (!link) return false;

  const folder = Array.isArray(link.document_folders)
    ? link.document_folders[0]
    : link.document_folders;
  const folderRoles = (folder as { access_roles?: string[] } | null)?.access_roles;

  if (!rolesCanAccessFolder(folderRoles, input.roles)) return false;

  if (input.roles.includes("hr_administrator")) return true;

  if (input.employeeId && link.employee_id === input.employeeId) return true;

  if (input.roles.includes("branch_admin") && input.userId) {
    const branchIds = await resolveBranchAdminScopeIds(input.organizationId, input.userId);
    const employeeBranch = (
      link.employees as { branch_id?: string | null } | null | undefined
    )?.branch_id;
    if (employeeBranch && branchIds.includes(employeeBranch)) return true;
  }

  if (!input.employeeId || !input.roles.includes("manager")) return false;

  const { data: report } = await supabase
    .from("employees")
    .select("id")
    .eq("id", link.employee_id)
    .eq("manager_employee_id", input.employeeId)
    .maybeSingle();

  return Boolean(report);
}
