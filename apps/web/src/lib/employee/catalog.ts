import { requireEmployeeContext } from "@/lib/employee/leave";
import { createClient } from "@/lib/supabase/server";

export async function listClaimTypes() {
  const { organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("claim_types")
    .select("id, name, max_amount")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAnnouncements() {
  const { organizationId } = await requireEmployeeContext();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, posted_at")
    .eq("organization_id", organizationId)
    .or(`display_from.is.null,display_from.lte.${today}`)
    .or(`display_until.is.null,display_until.gte.${today}`)
    .order("posted_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMyAssets() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assets")
    .select("id, name, category, serial_number, issued_at")
    .eq("organization_id", organizationId)
    .eq("assigned_employee_id", employeeId)
    .is("returned_at", null)
    .order("issued_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMyDocuments() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employee_documents")
    .select("id, document_type, expires_at, created_at")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
