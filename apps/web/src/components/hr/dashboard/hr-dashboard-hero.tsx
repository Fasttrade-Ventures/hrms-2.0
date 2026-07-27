import Link from "next/link";

export function HrDashboardHero({
  greeting,
  firstName,
  description,
}: {
  greeting: string;
  firstName: string;
  description: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl bg-gradient-to-br from-[#2d5e3a] via-[#234a2e] to-[#1f4028] px-5 py-4 shadow-[0_12px_32px_-8px_#1b3a2840] sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 max-w-[560px] space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-[22px]">
          {greeting}, {firstName}
        </h2>
        <p className="text-[13px] leading-snug text-[#e4ede6]">{description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          className="inline-flex h-9 min-w-[132px] flex-1 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-[#234a2e] transition-colors hover:bg-[#f3f6f4] sm:flex-none"
          href="/hr/employees"
        >
          Manage employees
        </Link>
        <Link
          className="inline-flex h-9 min-w-[132px] flex-1 items-center justify-center rounded-lg border border-white/35 bg-transparent px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:flex-none"
          href="/hr/payroll"
        >
          Open payroll
        </Link>
      </div>
    </div>
  );
}
