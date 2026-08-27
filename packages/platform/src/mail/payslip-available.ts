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
    ? `
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #d5d0c4;">
        <p style="margin-top: 0; margin-bottom: 8px; font-size: 13px; color: #4a6b52;">
          You can also download a secure PDF copy directly (expires in 7 days):
        </p>
        <a href="${input.secureLink}" style="color: #2d5e3a; font-size: 13px; font-weight: 600; text-decoration: underline;">
          Download Secure PDF &rarr;
        </a>
      </div>
    `
    : "";
  
  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; color: #1b3a28; line-height: 1.6;">
      <p style="font-size: 11px; font-weight: 700; color: #4a6b52; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 24px;">
        FASTTRADE VENTURES
      </p>
      <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700; color: #1b3a28; letter-spacing: -0.01em;">
        Your payslip for ${input.periodLabel} is ready
      </h2>
      <p style="margin-top: 0; margin-bottom: 24px; font-size: 14px; color: #1b3a28;">
        Your salary statement for <strong>${input.periodLabel}</strong> is now available for view.
      </p>
      
      <p style="margin: 24px 0;">
        <a href="${input.payslipUrl}" style="background-color: #2d5e3a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; display: inline-block;">
          View Payslip Online
        </a>
      </p>
      
      ${secureLinkSectionHtml}
      
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #d5d0c4; color: #7a8f7e; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 4px 0;">This is an automated notification from the Fasttrade Ventures HRMS. Please do not reply directly to this email.</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Fasttrade Ventures. All rights reserved.</p>
      </div>
    </div>
  `.trim();

  return { subject, html, text };
}
