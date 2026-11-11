import { PDFDocument } from "../../apps/web/node_modules/pdf-lib";
import { describe, expect, it } from "vitest";

import {
  LETTER_PDF_LINE_WIDTH,
  renderLetterLines,
  renderLetterPdf,
  renderLetterPdfLines,
} from "@/lib/letters/render-pdf";

const values = {
  candidate_name: "Ada Lovelace",
  job_title: "Engineer",
  salary: 1000,
  currency: "AUD",
  organization_name: "Acme",
};

describe("renderLetterLines", () => {
  it("merges tags and keeps unknown tags literal", () => {
    const lines = renderLetterLines("Dear {{candidate_name}}\nSalary {{currency}} {{salary}}\n{{mystery}}", values);
    expect(lines).toEqual(["Dear Ada Lovelace", "Salary AUD 1000.00", "{{mystery}}"]);
  });

  it("wraps long lines to the PDF width", () => {
    const long = Array.from({ length: 60 }, () => "word").join(" ");
    const lines = renderLetterLines(long, values);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length <= LETTER_PDF_LINE_WIDTH)).toBe(true);
  });

  it("preserves blank lines", () => {
    expect(renderLetterLines("A\n\nB", values)).toEqual(["A", "", "B"]);
  });

  it("marks wrapped mid-paragraph lines as justifiable", () => {
    const long = Array.from({ length: 60 }, () => "word").join(" ");
    const lines = renderLetterPdfLines(long, values);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(0, -1).every((line) => line.justify)).toBe(true);
    expect(lines.at(-1)?.justify).toBe(false);
  });
});

describe("renderLetterLines with HTML bodies", () => {
  it("strips tags and keeps paragraph / break / list structure", () => {
    const html =
      "<h2>Offer</h2><p>Dear {{candidate_name}},</p><p>Line one<br>Line two</p><ul><li>First</li><li>Second</li></ul><ol><li>A</li><li>B</li></ol>";
    expect(renderLetterLines(html, values)).toEqual([
      "Offer",
      "Dear Ada Lovelace,",
      "Line one",
      "Line two",
      "\u2022 First",
      "\u2022 Second",
      "1. A",
      "2. B",
    ]);
  });

  it("decodes entities, drops inline markup and keeps empty paragraphs as blank lines", () => {
    const lines = renderLetterLines("<p><strong>R&amp;D</strong> &lt;team&gt;</p><p></p><p>End</p>", values);
    expect(lines).toEqual(["R&D <team>", "", "End"]);
  });

  it("drops script content", () => {
    const lines = renderLetterLines("<p>Hi</p><script>alert(1)</script>", values);
    expect(lines.join("\n")).not.toContain("alert");
  });
});

// 1x1 PNG
const PNG_1X1 = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
);

describe("renderLetterPdf", () => {
  it("returns a valid single-page PDF", async () => {
    const bytes = await renderLetterPdf("<p>Hello {{candidate_name}}</p>", values);
    expect(Buffer.from(bytes).subarray(0, 5).toString("utf8")).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("flows long bodies onto additional pages", async () => {
    const body = Array.from({ length: 150 }, (_, i) => `<p>line ${i}</p>`).join("");
    const doc = await PDFDocument.load(await renderLetterPdf(body, values));
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });

  it("embeds a PNG letterhead and survives non-Latin text", async () => {
    const withHead = await renderLetterPdf("<p>Hello \u4e2d\u6587</p>", values, PNG_1X1);
    const without = await renderLetterPdf("<p>Hello \u4e2d\u6587</p>", values);
    expect(withHead.byteLength).toBeGreaterThan(without.byteLength);
    await expect(PDFDocument.load(withHead)).resolves.toBeDefined();
  });

  it("ignores an unreadable letterhead", async () => {
    const bytes = await renderLetterPdf("<p>Hello</p>", values, new Uint8Array([1, 2, 3]));
    await expect(PDFDocument.load(bytes)).resolves.toBeDefined();
  });
});
