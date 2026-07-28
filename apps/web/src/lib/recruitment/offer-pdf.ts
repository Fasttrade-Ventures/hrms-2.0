import { buildSimplePdf } from "@/lib/files/simple-pdf";

export function buildOfferPdfLines(input: {
  organizationName: string;
  candidateName: string;
  jobTitle: string;
  basicSalary: number;
  startDate: string;
}): string[] {
  return [
    "OFFER OF EMPLOYMENT",
    "",
    `Organization: ${input.organizationName}`,
    `Candidate: ${input.candidateName}`,
    `Position: ${input.jobTitle}`,
    `Basic salary (RM): ${input.basicSalary.toFixed(2)}`,
    `Proposed start date: ${input.startDate}`,
    "",
    "This offer is subject to HR review and completion of onboarding.",
  ];
}

export function buildOfferPdf(input: Parameters<typeof buildOfferPdfLines>[0]): Uint8Array {
  return buildSimplePdf(buildOfferPdfLines(input));
}
