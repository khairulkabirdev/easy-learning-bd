"use client";

import { SimpleEditor, type EmbeddedSimpleEditorProps } from "@/components/tiptap-templates/simple/simple-editor";

export type TiptapRichTextEditorProps = EmbeddedSimpleEditorProps;

export function TiptapRichTextEditor(props: TiptapRichTextEditorProps) {
  return <SimpleEditor {...props} />;
}
