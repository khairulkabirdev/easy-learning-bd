"use client";

import { Textarea } from "@/components/ui/textarea";

type TiptapRichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  className?: string;
  placeholder?: string;
};

export function TiptapRichTextEditor({
  value,
  onChange,
  minHeight = 220,
  className,
  placeholder,
}: TiptapRichTextEditorProps) {
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={className}
      style={{ minHeight }}
    />
  );
}
