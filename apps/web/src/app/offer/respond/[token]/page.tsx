import { OfferRespondClient } from "@/components/offer/offer-respond-client";
import {
  OFFER_FAILURE_COPY,
  OfferPublicMessage,
  OfferPublicShell,
  OfferSummaryCard,
} from "@/components/offer/offer-public-shell";
import { getOfferRespondContext } from "@/lib/recruitment/offer-candidate";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ decision?: string }>;
}) {
  const { token } = await params;
  const { decision } = await searchParams;
  const context = await getOfferRespondContext(token);

  if (context.state !== "ok") {
    const copy = OFFER_FAILURE_COPY[context.state];
    return (
      <OfferPublicShell heading="Your offer">
        <OfferPublicMessage description={copy.description} title={copy.title} />
      </OfferPublicShell>
    );
  }

  const { summary } = context;
  const preselect = decision === "accept" || decision === "reject" ? decision : null;

  return (
    <OfferPublicShell heading="Your offer">
      <OfferSummaryCard
        basicSalary={summary.basicSalary}
        candidateName={summary.candidateName}
        currencyCode={summary.currencyCode}
        jobTitle={summary.jobTitle}
        organizationName={summary.organizationName}
        startDate={summary.startDate}
      >
        {summary.hasOfferPdf ? (
          <a
            className="inline-block text-sm font-medium text-primary underline"
            href={`/offer/respond/${encodeURIComponent(token)}/download`}
          >
            Download offer letter (PDF)
          </a>
        ) : null}
      </OfferSummaryCard>
      <OfferRespondClient preselect={preselect} token={token} />
    </OfferPublicShell>
  );
}
