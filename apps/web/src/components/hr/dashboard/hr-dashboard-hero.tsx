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
    <div className="flex flex-col justify-between gap-5 rounded-[20px] bg-gradient-to-br from-[#2d5e3a] via-[#234a2e] to-[#1f4028] px-7 py-6 shadow-[0_12px_32px_-8px_#1b3a2840] sm:flex-row sm:items-center sm:gap-8">
      <div className="min-w-0 max-w-[560px] space-y-2">
        <h2 className="text-[26px] font-bold tracking-tight text-white">
          {greeting}, {firstName}
        </h2>
        <p className="text-sm leading-relaxed text-[#e4ede6]">{description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2.5">
        <Link
          className="inline-flex h-10 min-w-[150px] flex-1 items-center justify-center rounded-[10px] bg-white px-5 text-[15px] font-semibold text-[#234a2e] transition-colors hover:bg-[#f3f6f4] sm:flex-none"
          href="/hr/employees"
        >
          Manage employees
        </Link>
        <Link
          className="inline-flex h-10 min-w-[150px] flex-1 items-center justify-center rounded-[10px] border border-white/35 bg-transparent px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/10 sm:flex-none"
          href="/hr/payroll"
        >
          Open payroll
        </Link>
      </div>
    </div>
  );
}
