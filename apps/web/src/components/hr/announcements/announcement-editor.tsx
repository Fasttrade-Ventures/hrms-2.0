"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnnouncementEditorProps = {
  defaultValue?: string;
  onChange?: (html: string) => void;
};

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

export function AnnouncementEditor({
  defaultValue = "",
  onChange,
}: AnnouncementEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    ],
    content: defaultValue,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[112px] px-3 py-2 text-sm focus:outline-none [&_a]:text-primary [&_a]:underline [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (defaultValue && editor.getHTML() !== defaultValue) {
      editor.commands.setContent(defaultValue, { emitUpdate: false });
    }
  }, [defaultValue, editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-background">
      <div className="flex flex-wrap gap-0.5 border-b border-input bg-muted/30 px-1.5 py-1">
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
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
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
