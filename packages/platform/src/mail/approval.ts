function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ApprovalDetailItem = {
  label: string;
  value: string;
};

export type ApprovalPendingEmailInput = {
  recipientName: string;
  requesterName: string;
  requesterEmployeeNumber?: string | null;
  requestTypeLabel: string;
  requestSummary: string;
  details?: ApprovalDetailItem[];
  actionUrl: string;
  dueDate?: string | null;
  isEscalated?: boolean;
};

export function buildApprovalPendingEmail(input: ApprovalPendingEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const prefix = input.isEscalated ? "[Escalated] " : "";
  const subject = `${prefix}Action needed: ${input.requestTypeLabel} request from ${input.requesterName} (${input.requestSummary})`;

  const detailRowsHtml = (input.details ?? [])
    .map(
      (d) => `
      <tr>
        <td style="padding: 6px 12px 6px 0; color: #4a6b52; font-size: 13px; font-weight: 500; vertical-align: top; width: 140px;">
          ${escapeHtml(d.label)}
        </td>
        <td style="padding: 6px 0; color: #1b3a28; font-size: 13px; font-weight: 600; vertical-align: top;">
          ${escapeHtml(d.value)}
        </td>
      </tr>`,
    )
    .join("");

  const detailText = (input.details ?? [])
    .map((d) => `• ${d.label}: ${d.value}`)
    .join("\n");

  const dueNoticeHtml = input.dueDate
    ? `<p style="margin: 12px 0 0 0; font-size: 12px; color: #8a6a1b;">Due date: <strong>${escapeHtml(input.dueDate)}</strong></p>`
    : "";

  const dueNoticeText = input.dueDate ? `Due date: ${input.dueDate}\n` : "";

  const introText = input.isEscalated
    ? `A ${input.requestTypeLabel.toLowerCase()} request from ${input.requesterName} has timed out and has been escalated to you for approval.`
    : `A new ${input.requestTypeLabel.toLowerCase()} request from ${input.requesterName} is awaiting your review and approval.`;

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; color: #1b3a28; line-height: 1.6; margin: 0 auto; padding: 24px 16px;">
      <p style="font-size: 11px; font-weight: 700; color: #4a6b52; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 20px;">
        BUKUHR APPROVALS
      </p>
      <h2 style="margin-top: 0; margin-bottom: 12px; font-size: 19px; font-weight: 700; color: #1b3a28; letter-spacing: -0.01em;">
        ${escapeHtml(input.requestTypeLabel)} pending your approval
      </h2>
      <p style="margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #1b3a28;">
        ${escapeHtml(introText)}
      </p>

      <div style="background-color: #f7f9f7; border: 1px solid #d5d0c4; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="padding: 6px 12px 6px 0; color: #4a6b52; font-size: 13px; font-weight: 500; vertical-align: top; width: 140px;">
                Requester
              </td>
              <td style="padding: 6px 0; color: #1b3a28; font-size: 13px; font-weight: 600; vertical-align: top;">
                ${escapeHtml(input.requesterName)}${input.requesterEmployeeNumber ? ` (${escapeHtml(input.requesterEmployeeNumber)})` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0; color: #4a6b52; font-size: 13px; font-weight: 500; vertical-align: top;">
                Summary
              </td>
              <td style="padding: 6px 0; color: #1b3a28; font-size: 13px; font-weight: 600; vertical-align: top;">
                ${escapeHtml(input.requestSummary)}
              </td>
            </tr>
            ${detailRowsHtml}
          </tbody>
        </table>
        ${dueNoticeHtml}
      </div>

      <p style="margin: 24px 0;">
        <a href="${escapeHtml(input.actionUrl)}" style="background-color: #2d5e3a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; display: inline-block;">
          Review &amp; Action in BukuHR
        </a>
      </p>

      <p style="font-size: 13px; color: #5a7560; margin-top: 16px;">
        Or paste this link into your browser:<br />
        <a href="${escapeHtml(input.actionUrl)}" style="color: #2d5e3a; word-break: break-all;">${escapeHtml(input.actionUrl)}</a>
      </p>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #d5d0c4; color: #7a8f7e; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 4px 0;">This is an automated notification from BukuHR. Please do not reply directly to this email.</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} BukuHR. All rights reserved.</p>
      </div>
    </div>
  `.trim();

  const text = [
    `BUKUHR APPROVALS: ${input.requestTypeLabel.toUpperCase()} PENDING APPROVAL`,
    "",
    `Hi ${input.recipientName},`,
    "",
    introText,
    "",
    `Requester: ${input.requesterName}${input.requesterEmployeeNumber ? ` (${input.requesterEmployeeNumber})` : ""}`,
    `Summary: ${input.requestSummary}`,
    detailText,
    dueNoticeText,
    `Review and action this request: ${input.actionUrl}`,
    "",
    "This is an automated notification from BukuHR.",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { subject, html, text };
}

export type ApprovalConfirmationEmailInput = {
  employeeName: string;
  requestTypeLabel: string;
  requestSummary: string;
  details?: ApprovalDetailItem[];
  viewUrl: string;
};

export function buildApprovalConfirmationEmail(input: ApprovalConfirmationEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Request submitted: Your ${input.requestTypeLabel.toLowerCase()} is pending approval`;

  const detailRowsHtml = (input.details ?? [])
    .map(
      (d) => `
      <tr>
        <td style="padding: 6px 12px 6px 0; color: #4a6b52; font-size: 13px; font-weight: 500; vertical-align: top; width: 140px;">
          ${escapeHtml(d.label)}
        </td>
        <td style="padding: 6px 0; color: #1b3a28; font-size: 13px; font-weight: 600; vertical-align: top;">
          ${escapeHtml(d.value)}
        </td>
      </tr>`,
    )
    .join("");

  const detailText = (input.details ?? [])
    .map((d) => `• ${d.label}: ${d.value}`)
    .join("\n");

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; color: #1b3a28; line-height: 1.6; margin: 0 auto; padding: 24px 16px;">
      <p style="font-size: 11px; font-weight: 700; color: #4a6b52; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 20px;">
        BUKUHR SELF SERVICE
      </p>
      <h2 style="margin-top: 0; margin-bottom: 12px; font-size: 19px; font-weight: 700; color: #1b3a28; letter-spacing: -0.01em;">
        ${escapeHtml(input.requestTypeLabel)} submitted
      </h2>
      <p style="margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #1b3a28;">
        Hi ${escapeHtml(input.employeeName)}, your ${escapeHtml(input.requestTypeLabel.toLowerCase())} request was submitted successfully and is currently awaiting approval.
      </p>

      <div style="background-color: #f7f9f7; border: 1px solid #d5d0c4; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="padding: 6px 12px 6px 0; color: #4a6b52; font-size: 13px; font-weight: 500; vertical-align: top; width: 140px;">
                Summary
              </td>
              <td style="padding: 6px 0; color: #1b3a28; font-size: 13px; font-weight: 600; vertical-align: top;">
                ${escapeHtml(input.requestSummary)}
              </td>
            </tr>
            ${detailRowsHtml}
          </tbody>
        </table>
      </div>

      <p style="margin: 24px 0;">
        <a href="${escapeHtml(input.viewUrl)}" style="background-color: #2d5e3a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; display: inline-block;">
          View in Employee Portal
        </a>
      </p>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #d5d0c4; color: #7a8f7e; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 4px 0;">This is an automated confirmation from BukuHR. Please do not reply directly to this email.</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} BukuHR. All rights reserved.</p>
      </div>
    </div>
  `.trim();

  const text = [
    `BUKUHR: ${input.requestTypeLabel.toUpperCase()} SUBMITTED`,
    "",
    `Hi ${input.employeeName},`,
    "",
    `Your ${input.requestTypeLabel.toLowerCase()} request was submitted successfully and is pending approval.`,
    "",
    `Summary: ${input.requestSummary}`,
    detailText,
    "",
    `Track your request status in BukuHR: ${input.viewUrl}`,
    "",
    "This is an automated confirmation from BukuHR.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

export type ApprovalDecisionEmailInput = {
  employeeName: string;
  requestTypeLabel: string;
  requestSummary: string;
  status: "approved" | "rejected";
  approverComment?: string | null;
  viewUrl: string;
};

export function buildApprovalDecisionEmail(input: ApprovalDecisionEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const isApproved = input.status === "approved";
  const actionWord = isApproved ? "approved" : "rejected";
  const subject = `Your ${input.requestTypeLabel.toLowerCase()} request was ${actionWord} (${input.requestSummary})`;

  const statusBg = isApproved ? "#edf7ee" : "#fdf0ef";
  const statusBorder = isApproved ? "#b8deb9" : "#f5c2bf";
  const statusColor = isApproved ? "#1e5e22" : "#981b1b";

  const commentHtml = input.approverComment
    ? `
      <div style="margin-top: 16px; padding: 12px 14px; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #555555; text-transform: uppercase;">
          Approver remarks
        </p>
        <p style="margin: 0; font-size: 13px; color: #222222; font-style: italic;">
          &ldquo;${escapeHtml(input.approverComment)}&rdquo;
        </p>
      </div>`
    : "";

  const commentText = input.approverComment
    ? `Approver remarks: "${input.approverComment}"\n`
    : "";

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; color: #1b3a28; line-height: 1.6; margin: 0 auto; padding: 24px 16px;">
      <p style="font-size: 11px; font-weight: 700; color: #4a6b52; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 20px;">
        BUKUHR UPDATES
      </p>
      <h2 style="margin-top: 0; margin-bottom: 12px; font-size: 19px; font-weight: 700; color: #1b3a28; letter-spacing: -0.01em;">
        ${escapeHtml(input.requestTypeLabel)} ${isApproved ? "Approved" : "Rejected"}
      </h2>
      <p style="margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #1b3a28;">
        Hi ${escapeHtml(input.employeeName)}, your ${escapeHtml(input.requestTypeLabel.toLowerCase())} request has been <strong>${actionWord}</strong>.
      </p>

      <div style="background-color: ${statusBg}; border: 1px solid ${statusBorder}; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; font-weight: 700; color: ${statusColor};">
          Status: ${isApproved ? "Approved" : "Rejected"}
        </p>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #1b3a28;">
          ${escapeHtml(input.requestSummary)}
        </p>
        ${commentHtml}
      </div>

      <p style="margin: 24px 0;">
        <a href="${escapeHtml(input.viewUrl)}" style="background-color: #2d5e3a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; display: inline-block;">
          View Request in BukuHR
        </a>
      </p>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #d5d0c4; color: #7a8f7e; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 4px 0;">This is an automated notification from BukuHR. Please do not reply directly to this email.</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} BukuHR. All rights reserved.</p>
      </div>
    </div>
  `.trim();

  const text = [
    `BUKUHR: ${input.requestTypeLabel.toUpperCase()} ${actionWord.toUpperCase()}`,
    "",
    `Hi ${input.employeeName},`,
    "",
    `Your ${input.requestTypeLabel.toLowerCase()} request has been ${actionWord}.`,
    `Summary: ${input.requestSummary}`,
    commentText,
    `View request details in BukuHR: ${input.viewUrl}`,
    "",
    "This is an automated notification from BukuHR.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

