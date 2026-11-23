import { letterHtmlToText, looksLikeHtml, sanitizeLetterHtml } from "@/lib/letters/html-text";
import { cn } from "@/lib/utils";

/** Renders TipTap / plain-text comment bodies safely. */
export function RichText({
  value,
  className,
  empty = "—",
}: {
  value: string | null | undefined;
  className?: string;
  empty?: string;
}) {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return <p className={cn("text-sm text-[var(--foreground-muted)]", className)}>{empty}</p>;
  }

  if (!looksLikeHtml(raw)) {
    return (
      <p className={cn("whitespace-pre-wrap text-sm text-[var(--foreground-primary)]", className)}>
        {raw}
      </p>
    );
  }

  const html = sanitizeLetterHtml(raw);
  if (!letterHtmlToText(html).trim()) {
    return <p className={cn("text-sm text-[var(--foreground-muted)]", className)}>{empty}</p>;
  }

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-[var(--foreground-primary)]",
        "[&_a]:text-[var(--accent-primary)] [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
