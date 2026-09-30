"use client";

import { useCallback, useEffect, useRef } from "react";

import { SimpleEditor, type EmbeddedSimpleEditorProps } from "@/components/tiptap-templates/simple/simple-editor";

export type TiptapRichTextEditorProps = EmbeddedSimpleEditorProps;

const RICH_TEXT_SAVE_DELAY_MS = 900;

/**
 * Keeps Tiptap typing completely local to the editor and only notifies the
 * expensive parent content editor after the user pauses, leaves the editor,
 * or presses Ctrl/Cmd+S. This prevents every keystroke from re-rendering all
 * content blocks and firing a Server Action.
 */
export function TiptapRichTextEditor({ value, onChange, ...props }: TiptapRichTextEditorProps) {
  const latestValueRef = useRef(value);
  const lastCommittedValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onChangeRef.current = onChange;

  useEffect(() => {
    latestValueRef.current = value;
    lastCommittedValueRef.current = value;
  }, [value]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    clearTimer();
    const nextValue = latestValueRef.current;
    if (nextValue === lastCommittedValueRef.current) return;

    lastCommittedValueRef.current = nextValue;
    onChangeRef.current(nextValue);
  }, [clearTimer]);

  const scheduleCommit = useCallback(
    (nextValue: string) => {
      latestValueRef.current = nextValue;
      clearTimer();
      timerRef.current = setTimeout(flush, RICH_TEXT_SAVE_DELAY_MS);
    },
    [clearTimer, flush],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return (
    <div
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        flush();
      }}
      onKeyDownCapture={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          flush();
        }
      }}
    >
      <SimpleEditor {...props} value={value} onChange={scheduleCommit} />
    </div>
  );
}
