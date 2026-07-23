import { PortalPageHeader } from "@/components/portal/portal-primitives";

export default function Page() {
  const today = new Date().toLocaleDateString("en-MY", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Leave, holidays, and team events." title="Calendar" />
      <section className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <p className="text-sm text-[var(--foreground-secondary)]">
          Calendar view for {today} will connect to leave and holiday data in a later iteration.
        </p>
      </section>
    </div>
  );
}
