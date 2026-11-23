"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { looksLikeHtml, plainTextToHtml } from "@/lib/letters/html-text";
import { cn } from "@/lib/utils";

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      className={cn("h-8 px-2 text-xs", active && "bg-accent")}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      size="sm"
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}

function toEditorHtml(value: string): string {
  if (!value.trim()) return "";
  return looksLikeHtml(value) ? value : plainTextToHtml(value);
}

/** TipTap editor that syncs HTML into a hidden form field. */
export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder,
  disabled = false,
  minHeightClass = "min-h-28",
  onChange,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  minHeightClass?: string;
  onChange?: (html: string) => void;
}) {
  const initial = toEditorHtml(defaultValue);
  const [value, setValue] = useState(initial);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    ],
    content: initial,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      setValue(html);
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          minHeightClass,
          "px-3 py-2 text-sm focus:outline-none",
          "[&_a]:text-[var(--accent-primary)] [&_a]:underline",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5",
        ),
        "data-placeholder": placeholder ?? "",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const next = toEditorHtml(defaultValue);
    if (next && editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
      setValue(next);
    }
  }, [defaultValue, editor]);

  if (!editor) {
    return (
      <div className="min-h-28 rounded-lg border border-input bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground-muted)]">
        Loading editor…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-input bg-[var(--surface-card)]",
        disabled && "opacity-60",
      )}
    >
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <div className="flex flex-wrap gap-0.5 border-b border-input bg-[var(--surface-muted)]/60 px-1.5 py-1">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bullets
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={() => {
            const previousUrl = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Link URL", previousUrl ?? "https://");
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
        >
          Link
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
