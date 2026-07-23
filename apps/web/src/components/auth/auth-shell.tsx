import type { ReactNode } from "react";

import { CheckIcon, CircleCheckIcon } from "./auth-icons";
import { AuthBrand } from "./auth-primitives";

export type AuthBrandPanelProps = {
  headline: string;
  subhead: string;
  features?: readonly string[];
  rules?: readonly string[];
  note?: string;
  centered?: boolean;
  inviteMeta?: {
    organizationLabel?: string;
    organizationName: string;
    roleLabel: string;
  };
};

function FeatureList({ items, icon = "check" }: { items: readonly string[]; icon?: "check" | "rule" }) {
  const Icon = icon === "rule" ? CircleCheckIcon : CheckIcon;

  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li className="flex items-center gap-2.5 text-sm text-[var(--foreground-inverse-muted)]" key={item}>
          <Icon className="shrink-0 text-[var(--foreground-inverse-accent)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function AuthBrandPanel({
  headline,
  subhead,
  features,
  rules,
  note,
  centered = false,
  inviteMeta,
}: AuthBrandPanelProps) {
  return (
    <aside className="hidden min-h-screen w-[560px] shrink-0 flex-col justify-between bg-[var(--surface-inverse)] px-14 py-16 text-[var(--foreground-inverse)] lg:flex">
      <div className={`space-y-10 ${centered ? "my-auto" : ""}`}>
        {!centered ? <AuthBrand inverted /> : null}

        <div className="space-y-4">
          <h2 className="whitespace-pre-line text-[44px] font-semibold leading-[1.15] tracking-tight">
            {headline}
          </h2>
          <p className="max-w-md text-base leading-relaxed text-[var(--foreground-inverse-muted)]">{subhead}</p>
        </div>

        {inviteMeta ? (
          <div className="space-y-2 bg-[var(--surface-invite)] p-5">
            <p className="font-mono text-[11px] font-medium tracking-wide text-[var(--foreground-inverse-accent)]">
              {inviteMeta.organizationLabel ?? "ORGANIZATION"}
            </p>
            <p className="text-base font-semibold text-[var(--foreground-inverse)]">
              {inviteMeta.organizationName}
            </p>
            <p className="text-[13px] text-[var(--foreground-inverse-muted)]">{inviteMeta.roleLabel}</p>
          </div>
        ) : null}
      </div>

      {!centered && features?.length ? <FeatureList items={features} /> : null}
      {!centered && rules?.length ? <FeatureList icon="rule" items={rules} /> : null}
      {note ? <p className="max-w-md text-[13px] leading-relaxed text-[var(--foreground-inverse-accent)]">{note}</p> : null}
    </aside>
  );
}

export function AuthShell({
  brand,
  children,
}: {
  brand: AuthBrandPanelProps;
  children: ReactNode;
}) {
  return (
    <div className="auth-theme flex min-h-screen bg-[var(--surface-primary)]">
      <AuthBrandPanel {...brand} />

      <main className="flex min-h-screen flex-1 flex-col px-6 py-12 lg:justify-center lg:px-[120px] lg:py-16">
        <div className="mx-auto flex w-full max-w-[420px] flex-col gap-7 lg:gap-8">
          <div className="lg:hidden">
            <AuthBrand />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
