import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function OfferPublicShell({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl space-y-6 px-4 py-10">
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--accent-primary)]">BukuHR</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{heading}</h1>
      </div>
      {children}
    </main>
  );
}

export function OfferPublicMessage({ title, description }: { title: string; description: string }) {
  return (
    <Card className="py-0">
      <CardHeader className="px-5 py-5">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function OfferSummaryCard({
  organizationName,
  candidateName,
  jobTitle,
  startDate,
  currencyCode,
  basicSalary,
  children,
}: {
  organizationName: string;
  candidateName: string;
  jobTitle: string;
  startDate: string;
  currencyCode: string;
  basicSalary: number;
  children?: ReactNode;
}) {
  return (
    <Card className="py-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle>{jobTitle}</CardTitle>
        <CardDescription>
          {organizationName} · for {candidateName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Start date</dt>
            <dd className="font-medium">{startDate}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Basic salary ({currencyCode})</dt>
            <dd className="font-medium">{basicSalary.toFixed(2)}</dd>
          </div>
        </dl>
        {children}
      </CardContent>
    </Card>
  );
}

export const OFFER_FAILURE_COPY: Record<"invalid" | "expired" | "used" | "unavailable", { title: string; description: string }> = {
  invalid: {
    title: "Link not valid",
    description: "This link isn't valid. Check that you opened the full link from your email.",
  },
  expired: {
    title: "Link expired",
    description: "This link has expired. Please ask the hiring team to send you a new one.",
  },
  used: {
    title: "Link already used",
    description: "This link has already been used. If you need help, contact the hiring team.",
  },
  unavailable: {
    title: "No longer available",
    description: "This offer is no longer open. Please contact the hiring team if you have questions.",
  },
};
