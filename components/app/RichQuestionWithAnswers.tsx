"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { prepareRichQuestionAnswers } from "@/lib/sanitize-rich-html";
import { cn } from "@/lib/utils";

/** Shared read-only rich question with interactive answer slots. The sanitized
 * HTML remains stable while the controlled answers update through React portals. */
export function RichQuestionWithAnswers({ question, count, renderAnswer, mode = "blanks", appendMissing = false, className }: {
  question: string;
  count: number;
  renderAnswer: (index: number) => ReactNode;
  mode?: "blanks" | "underlines";
  appendMissing?: boolean;
  className?: string;
}) {
  const html = useMemo(() => prepareRichQuestionAnswers(question, count, mode, appendMissing), [question, count, mode, appendMissing]);
  const markup = useMemo(() => ({ __html: html }), [html]);
  const ref = useRef<HTMLDivElement>(null);
  const [anchors, setAnchors] = useState<{ html: string; elements: HTMLElement[] } | null>(null);

  useEffect(() => {
    const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-elesson-answer-anchor]") ?? []);
    setAnchors({ html, elements });
  }, [html]);

  return (
    <>
      <div
        key={html}
        ref={ref}
        data-slot="inline-blank-question"
        className={cn(
          "min-w-0 max-w-full overflow-x-auto text-base leading-9 [overflow-wrap:anywhere]",
          !/<[a-z][^>]*>/i.test(question) && "whitespace-pre-wrap",
          "[&_p]:mb-2 [&_p:last-child]:mb-0 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:leading-normal",
          "[&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-middle [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted/40",
          "[&_td_p]:m-0 [&_th_p]:m-0 [&_img]:h-auto [&_img]:max-w-full [&_pre]:overflow-x-auto [&_col]:!w-auto",
          "[&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-semibold",
          "[&_code]:font-mono [&_pre]:whitespace-pre-wrap [&_hr]:my-3",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-5 [&_a]:text-primary [&_a]:underline [&_u]:underline",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic",
          className,
        )}
        dangerouslySetInnerHTML={markup}
      />
      {anchors?.html === html && anchors.elements.map(element => {
        const index = Number(element.dataset.elessonAnswerAnchor);
        return createPortal(renderAnswer(index), element, String(index));
      })}
    </>
  );
}
