/** Styled multi-page PDF builder aligned with HRMS portal colors (no external deps). */

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 48;
const MARGIN_BOTTOM = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

type LayoutDensity = {
  sectionHeaderHeight: number;
  sectionPaddingBottom: number;
  sectionGap: number;
  fieldLabelHeight: number;
  fieldValueGap: number;
  fieldLineHeight: number;
  fieldPaddingBottom: number;
  rowGap: number;
  statHeight: number;
  titleSize: number;
  headerTopGap: number;
};

const DENSITY: Record<"normal" | "compact", LayoutDensity> = {
  normal: {
    sectionHeaderHeight: 28,
    sectionPaddingBottom: 18,
    sectionGap: 20,
    fieldLabelHeight: 10,
    fieldValueGap: 12,
    fieldLineHeight: 12,
    fieldPaddingBottom: 8,
    rowGap: 8,
    statHeight: 50,
    titleSize: 20,
    headerTopGap: 30,
  },
  compact: {
    sectionHeaderHeight: 22,
    sectionPaddingBottom: 10,
    sectionGap: 10,
    fieldLabelHeight: 8,
    fieldValueGap: 10,
    fieldLineHeight: 11,
    fieldPaddingBottom: 4,
    rowGap: 4,
    statHeight: 38,
    titleSize: 17,
    headerTopGap: 24,
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

const COLORS = {
  accent: hexToRgb("#2d5e3a"),
  accentSoft: hexToRgb("#e8f0ea"),
  text: hexToRgb("#1a2e22"),
  muted: hexToRgb("#6b7c70"),
  border: hexToRgb("#d8e0da"),
  white: [1, 1, 1] as [number, number, number],
};

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function rgbFill([r, g, b]: [number, number, number]): string {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`;
}

function rgbStroke([r, g, b]: [number, number, number]): string {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`;
}

function fillRect(x: number, y: number, width: number, height: number, color: [number, number, number]): string {
  return `${rgbFill(color)}\n${x} ${y} ${width} ${height} re f`;
}

function strokeRect(x: number, y: number, width: number, height: number, color: [number, number, number]): string {
  return `${rgbStroke(color)}\n${x} ${y} ${width} ${height} re S`;
}

function textBlock(
  x: number,
  y: number,
  text: string,
  font: "/F1" | "/F2",
  size: number,
  color: [number, number, number],
): string {
  return ["BT", rgbFill(color), `${font} ${size} Tf`, `${x} ${y} Td`, `(${escapePdfText(text)}) Tj`, "ET"].join(
    "\n",
  );
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["—"];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export type PdfField = { label: string; value: string };
export type PdfSection = { title: string; fields: PdfField[] };
export type PdfStat = { label: string; value: string };

export type StyledPdfOptions = {
  brandTitle: string;
  documentTitle: string;
  subtitle?: string;
  subtitleLines?: string[];
  badges?: string[];
  stats?: PdfStat[];
  sections: PdfSection[];
  footer?: string;
  compact?: boolean;
};

class PdfPageBuilder {
  private commands: string[] = [];
  private y = PAGE_HEIGHT - 40;
  private pageIndex = 0;
  private pages: string[][] = [];
  private readonly layout: LayoutDensity;

  constructor(private readonly options: StyledPdfOptions) {
    this.layout = options.compact ? DENSITY.compact : DENSITY.normal;
  }

  private push(command: string) {
    this.commands.push(command);
  }

  private drawLines(
    x: number,
    startY: number,
    lines: string[],
    font: "/F1" | "/F2",
    size: number,
    color: [number, number, number],
    lineHeight: number,
  ): number {
    lines.forEach((line, index) => {
      this.push(textBlock(x, startY - index * lineHeight, line, font, size, color));
    });
    return Math.max(1, lines.length) * lineHeight;
  }

  private ensureSpace(height: number) {
    if (this.y - height < MARGIN_BOTTOM) {
      this.finishPage();
      this.startContinuationPage();
    }
  }

  private startFirstPage() {
    const { layout } = this;
    this.pageIndex = 1;
    this.commands = [];
    this.y = PAGE_HEIGHT - 40;

    this.push(fillRect(0, PAGE_HEIGHT - 5, PAGE_WIDTH, 5, COLORS.accent));
    this.push(textBlock(MARGIN_X, this.y, this.options.brandTitle.toUpperCase(), "/F2", 8, COLORS.accent));

    const generated = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    this.push(textBlock(PAGE_WIDTH - MARGIN_X - 68, this.y, generated, "/F1", 7, COLORS.muted));

    this.y -= layout.headerTopGap;
    this.push(textBlock(MARGIN_X, this.y, this.options.documentTitle, "/F2", layout.titleSize, COLORS.text));

    this.y -= 18;
    const subtitleLines =
      this.options.subtitleLines ??
      (this.options.subtitle ? wrapText(this.options.subtitle, 88).slice(0, 3) : []);
    const subtitleHeight = this.drawLines(MARGIN_X, this.y, subtitleLines, "/F1", 9, COLORS.muted, 11);
    this.y -= subtitleHeight + 4;

    if (this.options.badges?.length) {
      const badgeLine = this.options.badges.join("   ·   ");
      this.push(textBlock(MARGIN_X, this.y, badgeLine, "/F1", 7, COLORS.accent));
      this.y -= 14;
    }

    if (this.options.stats?.length) {
      this.drawStats(this.options.stats.slice(0, 4));
      this.y -= 8;
    }

    this.push(strokeRect(MARGIN_X, this.y, CONTENT_WIDTH, 0.5, COLORS.border));
    this.y -= 12;
  }

  private drawStats(stats: PdfStat[]) {
    const { layout } = this;
    const statGap = 8;
    const statWidth = (CONTENT_WIDTH - statGap * (stats.length - 1)) / stats.length;
    const baseY = this.y - layout.statHeight;

    stats.forEach((stat, index) => {
      const x = MARGIN_X + index * (statWidth + statGap);
      this.push(fillRect(x, baseY, statWidth, layout.statHeight, COLORS.white));
      this.push(strokeRect(x, baseY, statWidth, layout.statHeight, COLORS.border));
      this.push(fillRect(x, baseY + layout.statHeight - 2, statWidth, 2, COLORS.accent));
      this.push(
        textBlock(
          x + 8,
          baseY + layout.statHeight - 14,
          stat.label.toUpperCase(),
          "/F1",
          6,
          COLORS.muted,
        ),
      );
      const valueLines = wrapText(stat.value, 20).slice(0, 2);
      this.drawLines(
        x + 8,
        baseY + layout.statHeight - 26,
        valueLines,
        "/F2",
        9,
        COLORS.text,
        10,
      );
    });

    this.y = baseY - 8;
  }

  private startContinuationPage() {
    this.pageIndex += 1;
    this.commands = [];
    this.y = PAGE_HEIGHT - 40;

    this.push(fillRect(0, PAGE_HEIGHT - 4, PAGE_WIDTH, 4, COLORS.accent));
    this.push(textBlock(MARGIN_X, this.y, this.options.documentTitle, "/F2", 11, COLORS.text));
    const subtitle =
      this.options.subtitleLines?.[0] ??
      wrapText(this.options.subtitle ?? "", 42)[0] ??
      "";
    this.push(textBlock(PAGE_WIDTH - MARGIN_X - 180, this.y, subtitle, "/F1", 7, COLORS.muted));
    this.y -= 20;
    this.push(strokeRect(MARGIN_X, this.y, CONTENT_WIDTH, 0.5, COLORS.border));
    this.y -= 12;
  }

  private measureFieldBlock(value: string, columnWidth: number): number {
    const { layout } = this;
    const maxChars = Math.max(16, Math.floor(columnWidth / 5.2));
    const lines = wrapText(value || "—", maxChars).slice(0, 3);
    return (
      layout.fieldLabelHeight +
      layout.fieldValueGap +
      lines.length * layout.fieldLineHeight +
      layout.fieldPaddingBottom
    );
  }

  private drawField(x: number, topY: number, width: number, field: PdfField) {
    const { layout } = this;
    const maxChars = Math.max(16, Math.floor(width / 5.2));
    const valueLines = wrapText(field.value || "—", maxChars).slice(0, 3);

    this.push(textBlock(x, topY, field.label.toUpperCase(), "/F1", 6, COLORS.muted));
    this.drawLines(
      x,
      topY - layout.fieldValueGap,
      valueLines,
      "/F1",
      8,
      COLORS.text,
      layout.fieldLineHeight,
    );
  }

  private drawSection(section: PdfSection) {
    const { layout } = this;
    const columns = 2;
    const columnGap = 14;
    const columnWidth = (CONTENT_WIDTH - 28 - columnGap) / columns;
    const rows: Array<[PdfField, PdfField | undefined]> = [];

    for (let index = 0; index < section.fields.length; index += columns) {
      rows.push([section.fields[index]!, section.fields[index + 1]]);
    }

    const rowHeights = rows.map(([left, right]) => {
      const leftHeight = this.measureFieldBlock(left.value, columnWidth);
      const rightHeight = right ? this.measureFieldBlock(right.value, columnWidth) : 0;
      return Math.max(leftHeight, rightHeight) + layout.rowGap;
    });

    const bodyHeight = rowHeights.reduce((sum, height) => sum + height, 0);
    const sectionHeight = layout.sectionHeaderHeight + bodyHeight + layout.sectionPaddingBottom;

    this.ensureSpace(sectionHeight + layout.sectionGap);

    const top = this.y;
    const bottom = top - sectionHeight;

    this.push(fillRect(MARGIN_X, bottom, CONTENT_WIDTH, sectionHeight, COLORS.white));
    this.push(strokeRect(MARGIN_X, bottom, CONTENT_WIDTH, sectionHeight, COLORS.border));
    const headerBottom = bottom + sectionHeight - layout.sectionHeaderHeight;
    this.push(fillRect(MARGIN_X, headerBottom, CONTENT_WIDTH, layout.sectionHeaderHeight, COLORS.accentSoft));
    this.push(fillRect(MARGIN_X, headerBottom, 3, layout.sectionHeaderHeight, COLORS.accent));
    this.push(textBlock(MARGIN_X + 12, top - 14, section.title, "/F2", 9, COLORS.accent));

    let rowTop = top - layout.sectionHeaderHeight - 8;
    rows.forEach(([left, right], rowIndex) => {
      const rowHeight = rowHeights[rowIndex] ?? 32;
      const leftX = MARGIN_X + 14;
      const rightX = MARGIN_X + 14 + columnWidth + columnGap;

      this.drawField(leftX, rowTop, columnWidth, left);
      if (right) {
        this.drawField(rightX, rowTop, columnWidth, right);
      }

      rowTop -= rowHeight;
    });

    this.y = bottom - layout.sectionGap;
  }

  private finishPage() {
    const footer = this.options.footer ?? "";
    this.push(strokeRect(MARGIN_X, 36, CONTENT_WIDTH, 0.5, COLORS.border));
    if (footer) {
      const footerLine = wrapText(footer, 95)[0] ?? footer;
      this.push(textBlock(MARGIN_X, 22, footerLine, "/F1", 6, COLORS.muted));
    }
    this.push(textBlock(PAGE_WIDTH - MARGIN_X - 32, 22, `Page ${this.pageIndex}`, "/F1", 6, COLORS.muted));
    this.pages.push(this.commands);
  }

  buildPages(): string[][] {
    this.startFirstPage();
    for (const section of this.options.sections) {
      this.drawSection(section);
    }
    this.finishPage();
    return this.pages;
  }
}

export function buildStyledPdf(options: StyledPdfOptions): Uint8Array {
  const pages = new PdfPageBuilder(options).buildPages();

  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];
  let nextId = 3;

  for (let i = 0; i < pages.length; i += 1) {
    pageObjectIds.push(nextId);
    contentObjectIds.push(nextId + 1);
    nextId += 2;
  }

  const fontRegularId = nextId;
  const fontBoldId = nextId + 1;
  const totalObjects = nextId + 1;

  const objects: string[] = new Array(totalObjects + 1).fill("");

  objects[1] = "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj";

  const kids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects[2] = `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>endobj`;

  pages.forEach((commands, index) => {
    const pageId = pageObjectIds[index]!;
    const contentId = contentObjectIds[index]!;
    const stream = commands.join("\n");
    objects[pageId] =
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> >>endobj`;
    objects[contentId] =
      `${contentId} 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}\nendstream endobj`;
  });

  objects[fontRegularId] = `${fontRegularId} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj`;
  objects[fontBoldId] = `${fontBoldId} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let i = 1; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${objects[i]}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new Uint8Array(Buffer.from(pdf, "utf8"));
}
