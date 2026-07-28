import Link from "next/link";

export function HrProfileTabs({
  active,
}: {
  active: "personal" | "security";
}) {
  const tabs = [
    { id: "personal" as const, label: "Personal", href: "/hr/profile" },
    { id: "security" as const, label: "Security", href: "/hr/profile/security" },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-[var(--border-primary)]">
      {tabs.map((tab) => (
        <Link
          className={`px-4 py-3 text-sm font-medium ${
            active === tab.id
              ? "border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)]"
              : "text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]"
          }`}
          href={tab.href}
          key={tab.id}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
