"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { DeveloperApiTab } from "@/components/hr/integrations/developer-api-tab";
import { cn } from "@/lib/utils";

export type { DeveloperApiTab } from "@/components/hr/integrations/developer-api-tab";

const TABS: Array<{ id: DeveloperApiTab; label: string }> = [
  { id: "api", label: "API keys" },
  { id: "bukucloud", label: "BukuCloud" },
  { id: "virtual-hirix", label: "Virtual Hirix" },
];

export function DeveloperApiTabs({ active }: { active: DeveloperApiTab }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex flex-wrap gap-2 border-b border-[var(--border-primary)] pb-2">
      {TABS.map((tab) => {
        const params = new URLSearchParams(searchParams.toString());
        if (tab.id === "api") params.delete("tab");
        else params.set("tab", tab.id);
        const href = params.toString() ? `${pathname}?${params}` : pathname;
        const isActive = active === tab.id;
        return (
          <Link
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-[var(--surface-muted)] text-[var(--foreground-primary)]"
                : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]",
            )}
            href={href}
            key={tab.id}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
