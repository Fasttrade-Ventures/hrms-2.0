import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import { letterHtmlToText } from "./html-text";
import { applyMergeTags, type LetterMergeValues } from "./merge-tags";

/** Characters per line that fit the 11pt Helvetica body width (approx). */
export const LETTER_PDF_LINE_WIDTH = 90;

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 50;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 50;
const FONT_SIZE = 11;
const LINE_HEIGHT = 14;
/** Body text width between side margins — used for justified word spacing. */
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
/** Cap letterhead height so a tall asset cannot push the body off page 1. */
const LETTERHEAD_MAX_HEIGHT = 160;
/** Small gap between full-bleed letterhead and the first body line. */
const LETTERHEAD_GAP = 12;

export type LetterPdfLine = {
  text: string;
  /** Justify when the source paragraph wrapped onto multiple lines (not the last fragment). */
  justify: boolean;
};

function wrapLine(line: string, width: number): string[] {
  if (line.length <= width) return [line];
  const out: string[] = [];
  let current = "";
  for (const word of line.split(/\s+/)) {
    if (!word) continue;
    if (word.length > width) {
      if (current) {
        out.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += width) out.push(word.slice(i, i + width));
      continue;
    }
    if (!current) current = word;
    else if (current.length + 1 + word.length <= width) current = `${current} ${word}`;
    else {
      out.push(current);
      current = word;
    }
  }
  if (current) out.push(current);
  return out.length > 0 ? out : [""];
}

/** HTML (or legacy plain text) → merge tags → wrapped PDF lines with justify flags. */
export function renderLetterPdfLines(body: string, values: LetterMergeValues): LetterPdfLine[] {
  const text = letterHtmlToText(body);
  const merged = applyMergeTags(text, values).replace(/\r\n?/g, "\n");
  return merged.split("\n").flatMap((line) => {
    const wrapped = wrapLine(line, LETTER_PDF_LINE_WIDTH);
    return wrapped.map((textLine, index) => ({
      text: textLine,
      justify: textLine.trim().length > 0 && wrapped.length > 1 && index < wrapped.length - 1,
    }));
  });
}

/** @deprecated Prefer `renderLetterPdfLines` when justify flags matter. */
export function renderLetterLines(body: string, values: LetterMergeValues): string[] {
  return renderLetterPdfLines(body, values).map((line) => line.text);
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

async function embedLetterhead(doc: PDFDocument, bytes: Uint8Array): Promise<PDFImage | null> {
  try {
    if (isPng(bytes)) return await doc.embedPng(bytes);
    if (isJpeg(bytes)) return await doc.embedJpg(bytes);
  } catch {
    // Corrupt image: fall through to a letter without letterhead.
  }
  return null;
}

/** Helvetica only supports WinAnsi; replace anything else so drawing never throws. */
function toDrawable(line: string, font: PDFFont): string {
  const supported = new Set(font.getCharacterSet());
  let out = "";
  for (const char of line) {
    const code = char.codePointAt(0) ?? 0;
    out += supported.has(code) ? char : "?";
  }
  return out;
}

function drawJustifiedText(
  page: PDFPage,
  line: string,
  font: PDFFont,
  x: number,
  y: number,
  maxWidth: number,
): void {
  const drawable = toDrawable(line, font);
  const words = drawable.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    page.drawText(drawable, { x, y, size: FONT_SIZE, font, color: rgb(0, 0, 0) });
    return;
  }

  const spaceWidth = font.widthOfTextAtSize(" ", FONT_SIZE);
  const wordsWidth = words.reduce((sum, word) => sum + font.widthOfTextAtSize(word, FONT_SIZE), 0);
  const gaps = words.length - 1;
  const free = maxWidth - wordsWidth;
  // Avoid absurd stretching on short lines; fall back to natural spacing.
  const gap = free / gaps;
  if (gap < spaceWidth || gap > spaceWidth * 4) {
    page.drawText(drawable, { x, y, size: FONT_SIZE, font, color: rgb(0, 0, 0) });
    return;
  }

  let cursor = x;
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]!;
    page.drawText(word, { x: cursor, y, size: FONT_SIZE, font, color: rgb(0, 0, 0) });
    cursor += font.widthOfTextAtSize(word, FONT_SIZE) + (i < gaps ? gap : 0);
  }
}

/**
 * Builds the letter PDF: optional PNG/JPG letterhead full-bleed across the top of the
 * first page (no left/right/top inset), then justified body text over as many A4 pages
 * as needed.
 */
export async function renderLetterPdf(
  body: string,
  values: LetterMergeValues,
  letterheadBytes?: Uint8Array | null,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const lines = renderLetterPdfLines(body, values);
  const image = letterheadBytes ? await embedLetterhead(doc, letterheadBytes) : null;

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  if (image) {
    // Prefer full page width (no left/right padding). Cap height; center if height-bound.
    const fullWidthScale = PAGE_WIDTH / image.width;
    let width = PAGE_WIDTH;
    let height = image.height * fullWidthScale;
    if (height > LETTERHEAD_MAX_HEIGHT) {
      height = LETTERHEAD_MAX_HEIGHT;
      width = image.width * (LETTERHEAD_MAX_HEIGHT / image.height);
    }
    const x = (PAGE_WIDTH - width) / 2;
    page.drawImage(image, { x, y: PAGE_HEIGHT - height, width, height });
    y = PAGE_HEIGHT - height - LETTERHEAD_GAP;
  }

  y -= FONT_SIZE;
  for (const line of lines) {
    if (y < MARGIN_BOTTOM) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP - FONT_SIZE;
    }
    if (line.text) {
      if (line.justify) {
        drawJustifiedText(page, line.text, font, MARGIN_X, y, CONTENT_WIDTH);
      } else {
        page.drawText(toDrawable(line.text, font), {
          x: MARGIN_X,
          y,
          size: FONT_SIZE,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }
    y -= LINE_HEIGHT;
  }

  return doc.save();
}

/** Plain-text preview (used by the template editor). */
export function renderLetterPreview(body: string, values: LetterMergeValues): string {
  return renderLetterLines(body, values).join("\n");
}

export const SAMPLE_MERGE_VALUES: LetterMergeValues = {
  candidate_name: "Aisyah Rahman",
  candidate_email: "aisyah@example.com",
  job_title: "Senior Accountant",
  salary: 4500,
  currency: "MYR",
  start_date: "2027-01-04",
  organization_name: "Acme Sdn Bhd",
  requisition_title: "Senior Accountant (Finance)",
  offer_date: "11 November 2026",
  department: "Finance",
  employment_type: "Full time",
  work_location: "Kuala Lumpur HQ",
  company_email: "hr@acme.test",
  company_phone: "+60 3 1234 5678",
};
