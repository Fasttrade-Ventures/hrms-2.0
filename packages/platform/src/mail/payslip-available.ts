export function buildPayslipAvailableEmail(input: {
  periodLabel: string;
  payslipUrl: string;
  secureLink?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your payslip for ${input.periodLabel} is ready`;
  const secureLinkSectionText = input.secureLink
    ? `\n\nSecure Download Link (expires in 7 days): ${input.secureLink}`
    : "";
  const text = `Your payslip for ${input.periodLabel} is now available.\n\nView payslip: ${input.payslipUrl}${secureLinkSectionText}`;
  
  const secureLinkSectionHtml = input.secureLink
    ? `<p>You can also download a secure PDF copy directly (expires in 7 days): <a href="${input.secureLink}">Download Secure PDF</a></p>`
    : "";
  const html = `
    <p>Your payslip for <strong>${input.periodLabel}</strong> is now available.</p>
    <p><a href="${input.payslipUrl}">View payslip online</a></p>
    ${secureLinkSectionHtml}
  `.trim();

  return { subject, html, text };
}
