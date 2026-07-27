import sanitizeHtml from "sanitize-html";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h2", "h3"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

export function sanitizeAnnouncementHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

export function announcementBodyHasContent(html: string): boolean {
  const text = sanitizeAnnouncementHtml(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text.length > 0;
}

export function announcementExcerpt(html: string, maxLength = 160): string {
  const text = sanitizeAnnouncementHtml(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}
