"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Columns3,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Merge,
  Plus,
  Redo2,
  Rows3,
  SplitSquareHorizontal,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  className?: string;
  placeholder?: string;
};

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

function TablePicker({
  onInsert,
}: {
  onInsert: (rows: number, cols: number) => void;
}) {
  const [hover, setHover] = React.useState({ rows: 1, cols: 1 });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: 8 }).map((_, rowIndex) =>
          Array.from({ length: 8 }).map((__, colIndex) => {
            const active = rowIndex < hover.rows && colIndex < hover.cols;
            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                type="button"
                className={cn(
                  "h-5 w-5 rounded border transition-colors",
                  active ? "border-primary bg-primary/20" : "border-border bg-background",
                )}
                onMouseEnter={() => setHover({ rows: rowIndex + 1, cols: colIndex + 1 })}
                onClick={() => onInsert(rowIndex + 1, colIndex + 1)}
              />
            );
          }),
        )}
      </div>
      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
        <span>
          {hover.rows} x {hover.cols}
        </span>
        <span className="text-muted-foreground">Insert table</span>
      </div>
    </div>
  );
}

export function TiptapRichTextEditor({
  value,
  onChange,
  minHeight = 220,
  className,
  placeholder = "Write here...",
}: Props) {
  const [isTablePickerOpen, setIsTablePickerOpen] = React.useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Superscript,
      Subscript,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-full px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "");
    }
  }, [editor, value]);

  const isTableActive =
    !!editor && (editor.isActive("table") || editor.isActive("tableCell") || editor.isActive("tableHeader"));

  if (!editor) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <div style={{ minHeight }} />
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-2">
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          title="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Strike" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Highlight"
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Subscript"
          active={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          <SubscriptIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Superscript"
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          <SuperscriptIcon className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          title="Bullet List"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Ordered List"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          title="Align Left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Align Center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Align Right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          title="Link"
          active={editor.isActive("link")}
          onClick={() => {
            const previous = editor.getAttributes("link").href as string | undefined;
            const href = window.prompt("Enter URL", previous || "");
            if (href === null) return;
            if (!href.trim()) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            editor.chain().focus().setLink({ href }).run();
          }}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Popover open={isTablePickerOpen} onOpenChange={setIsTablePickerOpen}>
          <PopoverTrigger>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Insert table">
              <Table2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-3">
            <TablePicker
              onInsert={(rows, cols) => {
                editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                setIsTablePickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {isTableActive ? (
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowBefore().run()}>
            <Rows3 className="mr-2 h-4 w-4" />
            Row Before
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowAfter().run()}>
            <Plus className="mr-2 h-4 w-4" />
            Row After
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteRow().run()}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Row
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnBefore().run()}>
            <Columns3 className="mr-2 h-4 w-4" />
            Col Before
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            <Plus className="mr-2 h-4 w-4" />
            Col After
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteColumn().run()}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Col
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().mergeCells().run()}>
            <Merge className="mr-2 h-4 w-4" />
            Merge
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().splitCell().run()}>
            <SplitSquareHorizontal className="mr-2 h-4 w-4" />
            Split
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
            Header Row
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
          >
            Header Col
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={() => editor.chain().focus().deleteTable().run()}>
            Delete Table
          </Button>
        </div>
      ) : null}

      <div className="admin-rich-text-editor" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .admin-rich-text-editor .ProseMirror {
          min-height: ${minHeight}px;
        }

        .admin-rich-text-editor .ProseMirror table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin: 0;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          background: var(--background);
        }

        .admin-rich-text-editor .ProseMirror th,
        .admin-rich-text-editor .ProseMirror td {
          min-width: 120px;
          border: 1px solid var(--border);
          padding: 0.75rem;
          vertical-align: top;
          background: var(--background);
        }

        .admin-rich-text-editor .ProseMirror th {
          font-weight: 600;
          background: var(--muted);
        }

        .admin-rich-text-editor .ProseMirror .selectedCell:after {
          content: "";
          position: absolute;
          inset: 0;
          background: color-mix(in oklab, var(--primary) 12%, transparent);
          pointer-events: none;
        }

        .admin-rich-text-editor .ProseMirror td,
        .admin-rich-text-editor .ProseMirror th {
          position: relative;
        }
      `}</style>
    </Card>
  );
}
