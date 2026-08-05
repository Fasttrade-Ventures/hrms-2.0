import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAnnouncementAttachment } from "@/lib/announcements/queries";
import { rolesCanAccessFolder } from "@/lib/hr/document-folder-access";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string | undefined {
  return process.env.DEFAULT_ORGANIZATION_ID;
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
}): Promise<boolean> {
  const admin = createAdminClient();
  const { data: file } = await admin
    .from("file_objects")
    .select("id, deleted_at, category")
    .eq("id", input.fileId)
    .maybeSingle();

  if (!file || file.deleted_at) return false;

  if (file.category === "announcement-attachments") {
    const organizationId = input.organizationId ?? getOrganizationId();
    if (!organizationId) return false;
    if (input.roles.includes("hr_administrator")) return true;
    return canDownloadAnnouncementFile({
      roles: input.roles,
      employeeId: input.employeeId,
      fileId: input.fileId,
      organizationId,
    });
  }

  if (file.category === "leave-attachments") {
    if (input.roles.includes("hr_administrator")) return true;
    if (!input.employeeId) return false;

    const supabase = await createClient();
    const { data: leaveReq } = await supabase
      .from("leave_requests")
      .select("employee_id, employees(manager_employee_id)")
      .eq("attachment_file_id", input.fileId)
      .maybeSingle();

    if (!leaveReq) return false;

    if (leaveReq.employee_id === input.employeeId) return true;

    const requesterManagerId = (leaveReq.employees as { manager_employee_id?: string | null } | null)?.manager_employee_id;
    if (input.roles.includes("manager") && requesterManagerId === input.employeeId) return true;

    return false;
  }

  const supabase = await createClient();
  const { data: link } = await supabase
    .from("employee_documents")
    .select("employee_id, document_folders(access_roles)")
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

  if (!input.employeeId || !input.roles.includes("manager")) return false;

  const { data: report } = await supabase
    .from("employees")
    .select("id")
    .eq("id", link.employee_id)
    .eq("manager_employee_id", input.employeeId)
    .maybeSingle();

  return Boolean(report);
}
