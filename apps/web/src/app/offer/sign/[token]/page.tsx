import { OfferSignClient } from "@/components/offer/offer-sign-client";
import {
  OFFER_FAILURE_COPY,
  OfferPublicMessage,
  OfferPublicShell,
  OfferSummaryCard,
} from "@/components/offer/offer-public-shell";
import { getOfferSignContext } from "@/lib/recruitment/offer-candidate";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const context = await getOfferSignContext(token);

  if (context.state !== "ok") {
    const copy = OFFER_FAILURE_COPY[context.state];
    return (
      <OfferPublicShell heading="Employment agreement">
        <OfferPublicMessage description={copy.description} title={copy.title} />
      </OfferPublicShell>
    );
  }

  const { summary } = context;

  return (
    <OfferPublicShell heading="Employment agreement">
      <OfferSummaryCard
        basicSalary={summary.basicSalary}
        candidateName={summary.candidateName}
        currencyCode={summary.currencyCode}
        jobTitle={summary.jobTitle}
        organizationName={summary.organizationName}
        startDate={summary.startDate}
      >
        {summary.hasAgreementPdf ? (
          <a
            className="inline-block text-sm font-medium text-primary underline"
            href={`/offer/sign/${encodeURIComponent(token)}/download`}
          >
            Download agreement (PDF)
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">
            The agreement PDF isn&apos;t attached yet. Check your email or contact the hiring team.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Download, sign, then upload the signed copy below.
        </p>
      </OfferSummaryCard>
      <OfferSignClient token={token} />
    </OfferPublicShell>
  );
}
