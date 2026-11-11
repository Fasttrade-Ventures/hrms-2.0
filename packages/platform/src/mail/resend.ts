import { buildAnnouncementEmail } from "./announcement";
import { buildDocumentComplianceEmail } from "./document-compliance";
import { buildEmployeeActivationEmail } from "./employee-activation";
import { buildPayslipAvailableEmail } from "./payslip-available";
import { buildAgreementToSignEmail, buildOfferSentEmail } from "./offer-sent";
import { buildPulseSurveyOpenedEmail } from "./pulse-survey";
import { buildScheduledReportEmail } from "./scheduled-report";

export type SendResult =
  | { sent: true; id?: string }
  | { sent: false; reason: "not_configured" | "request_failed"; detail?: string };

async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{ filename: string; content: string }>;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return { sent: false, reason: "request_failed", detail };
  }

  const payload = (await response.json()) as { id?: string };
  return { sent: true, id: payload.id };
}

export async function sendAnnouncementEmail(input: {
  to: string;
  title: string;
  message: string;
  announcementPath: string;
  appOrigin?: string;
}): Promise<SendResult> {
  const origin = (
    input.appOrigin ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).replace(/\/$/, "");
  const announcementUrl = origin
    ? `${origin}${input.announcementPath}`
    : input.announcementPath;
  const { subject, html, text } = buildAnnouncementEmail({
    title: input.title,
    message: input.message,
    announcementUrl,
  });

  return sendResendEmail({ to: input.to, subject, html, text });
}

export async function sendNoticeEmail(input: {
  to: string;
  subject: string;
  message: string;
}): Promise<SendResult> {
  const text = input.message;
  const html = `<p>${input.message.replace(/</g, "")}</p>`;
  return sendResendEmail({ to: input.to, subject: input.subject, html, text });
}

export async function sendDocumentComplianceEmail(input: {
  to: string;
  recipientName: string;
  employeeName: string;
  documentType: string;
  status: string;
  expiresAt?: string | null;
  audience: "employee" | "hr";
  remainingDays?: number | null;
}): Promise<SendResult> {
  const { subject, html, text } = buildDocumentComplianceEmail({
    recipientName: input.recipientName,
    employeeName: input.employeeName,
    documentType: input.documentType,
    status: input.status,
    expiresAt: input.expiresAt,
    audience: input.audience,
    remainingDays: input.remainingDays,
  });

  return sendResendEmail({ to: input.to, subject, html, text });
}

export async function sendEmployeeActivationEmail(input: {
  to: string;
  fullName: string;
  organizationName: string;
  activationLink: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" };
  }

  const { subject, html, text } = buildEmployeeActivationEmail({
    fullName: input.fullName,
    organizationName: input.organizationName,
    activationLink: input.activationLink,
  });

  return sendResendEmail({ to: input.to, subject, html, text });
}

export async function sendPayslipAvailableEmail(input: {
  to: string;
  periodLabel: string;
  payslipPath: string;
  appOrigin?: string;
  secureLink?: string;
  attachment?: { filename: string; content: string };
}): Promise<SendResult> {
  const origin = (
    input.appOrigin ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).replace(/\/$/, "");
  const payslipUrl = origin ? `${origin}${input.payslipPath}` : input.payslipPath;
  const { subject, html, text } = buildPayslipAvailableEmail({
    periodLabel: input.periodLabel,
    payslipUrl,
    secureLink: input.secureLink,
  });

  return sendResendEmail({
    to: input.to,
    subject,
    html,
    text,
    attachments: input.attachment ? [input.attachment] : undefined,
  });
}

export async function sendPulseSurveyOpenedEmail(input: {
  to: string;
  title: string;
  message: string;
  surveyPath: string;
  appOrigin?: string;
}): Promise<SendResult> {
  const origin = (
    input.appOrigin ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).replace(/\/$/, "");
  const surveyUrl = origin ? `${origin}${input.surveyPath}` : input.surveyPath;
  const { subject, html, text } = buildPulseSurveyOpenedEmail({
    title: input.title,
    message: input.message,
    surveyUrl,
  });
  return sendResendEmail({ to: input.to, subject, html, text });
}

export async function sendScheduledReportEmail(input: {
  to: string;
  reportTitle: string;
  rowCount: number;
  reportPath: string;
  schedule: string;
  appOrigin?: string;
}): Promise<SendResult> {
  const origin = (
    input.appOrigin ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).replace(/\/$/, "");
  const reportUrl = origin ? `${origin}${input.reportPath}` : input.reportPath;
  const { subject, html, text } = buildScheduledReportEmail({
    reportTitle: input.reportTitle,
    rowCount: input.rowCount,
    reportUrl,
    schedule: input.schedule,
  });

  return sendResendEmail({ to: input.to, subject, html, text });
}

function resolveOrigin(appOrigin?: string): string {
  return (
    appOrigin ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).replace(/\/$/, "");
}

export async function sendOfferSentEmail(input: {
  to: string;
  candidateName: string;
  organizationName: string;
  jobTitle: string;
  acceptPath: string;
  rejectPath: string;
  expiresInDays: number;
  attachment?: { filename: string; content: string };
  appOrigin?: string;
}): Promise<SendResult> {
  const origin = resolveOrigin(input.appOrigin);
  const { subject, html, text } = buildOfferSentEmail({
    candidateName: input.candidateName,
    organizationName: input.organizationName,
    jobTitle: input.jobTitle,
    acceptUrl: origin ? `${origin}${input.acceptPath}` : input.acceptPath,
    rejectUrl: origin ? `${origin}${input.rejectPath}` : input.rejectPath,
    expiresInDays: input.expiresInDays,
  });

  return sendResendEmail({
    to: input.to,
    subject,
    html,
    text,
    attachments: input.attachment ? [input.attachment] : undefined,
  });
}

export async function sendAgreementToSignEmail(input: {
  to: string;
  candidateName: string;
  organizationName: string;
  jobTitle: string;
  signPath: string;
  expiresInDays: number;
  attachment?: { filename: string; content: string };
  appOrigin?: string;
}): Promise<SendResult> {
  const origin = resolveOrigin(input.appOrigin);
  const { subject, html, text } = buildAgreementToSignEmail({
    candidateName: input.candidateName,
    organizationName: input.organizationName,
    jobTitle: input.jobTitle,
    signUrl: origin ? `${origin}${input.signPath}` : input.signPath,
    expiresInDays: input.expiresInDays,
    hasAttachment: Boolean(input.attachment),
  });

  return sendResendEmail({
    to: input.to,
    subject,
    html,
    text,
    attachments: input.attachment ? [input.attachment] : undefined,
  });
}
