import sanitizeHtml from "sanitize-html";

const LETTER_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h2", "h3"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
};

/** True when the body contains HTML tags (TipTap output) rather than legacy plain text. */
export function looksLikeHtml(body: string): boolean {
  return /<\/?[a-z][a-z0-9]*(\s[^>]*)?\/?>/i.test(body);
}

/** Sanitize TipTap HTML for storage. Legacy plain-text bodies are returned unchanged. */
export function sanitizeLetterHtml(body: string): string {
  return looksLikeHtml(body) ? sanitizeHtml(body, LETTER_SANITIZE_OPTIONS) : body;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Plain text → minimal HTML paragraphs (used to load legacy bodies into the editor). */
export function plainTextToHtml(text: string): string {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => (line.trim() === "" ? "<p></p>" : `<p>${escape(line)}</p>`))
    .join("");
}

/**
 * Convert letter HTML into printable text. Block boundaries (`<p>`, `<li>`, headings,
 * `<br>`) become newlines; list items get a bullet or number prefix. Plain text passes through.
 */
export function letterHtmlToText(body: string): string {
  if (!looksLikeHtml(body)) return body.replace(/\r\n?/g, "\n");

  let html = body.replace(/\r\n?/g, "\n").replace(/\n/g, " ");

  // Ordered lists: number the items before generic handling.
  html = html.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_full, inner: string) => {
    let n = 0;
    return inner.replace(/<li\b[^>]*>/gi, () => {
      n += 1;
      return `<li>${n}. `;
    });
  });
  html = html.replace(/<li\b[^>]*>(?!\d+\. )/gi, "<li>\u2022 ");

  html = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|div)>/gi, "\n")
    .replace(/<\/(ul|ol)>/gi, "");

  const stripped = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  return decodeEntities(stripped)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n$/, "");
}
