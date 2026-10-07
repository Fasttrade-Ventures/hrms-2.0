import { getSpecialistAccess } from "@/lib/employees/specialist-access";
import { updateSpecialistAccess } from "@/lib/employees/specialist-access-actions";

const FLAGS = [
  { id: "recruiter", label: "Recruiter" },
  { id: "document_custodian", label: "Document custodian" },
  { id: "asset_manager", label: "Asset manager" },
] as const;

export async function SpecialistAccessPanel({ employeeId }: { employeeId: string }) {
  const granted = await getSpecialistAccess(employeeId);

  return (
    <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
      <h2 className="text-base font-semibold">Specialist access</h2>
      <p className="text-sm text-[var(--foreground-muted)]">
        These open one HR module. They do not make the person an HR administrator.
      </p>
      <form action={updateSpecialistAccess} className="space-y-3">
        <input name="employeeId" type="hidden" value={employeeId} />
        {FLAGS.map((flag) => (
          <label className="flex items-center gap-2 text-sm" key={flag.id}>
            <input defaultChecked={granted.includes(flag.id)} name={flag.id} type="checkbox" />
            {flag.label}
          </label>
        ))}
        <button className="h-10 border border-[var(--border-primary)] px-4 text-sm" type="submit">
          Save access
        </button>
      </form>
    </section>
  );
}
