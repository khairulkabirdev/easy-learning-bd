"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  BookOpenText,
  Check,
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  ListChecks,
  X,
} from "lucide-react";

import {
  parseUnseenCompositionDocument,
  type InformationTransferBlock,
  type UnseenTrueFalseBlock,
  type WritingSummaryBlock,
} from "@/app/admin/content/unseen-composition/types";
import { PracticeAnswerActions } from "@/components/app/PracticeAnswerActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import { cn } from "@/lib/utils";

function RichContent({ html, className }: { html?: string; className?: string }) {
  if (!html?.trim()) return null;
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words leading-7 dark:prose-invert",
        "[&_p]:leading-7 [&_table]:w-full [&_table]:min-w-[400px] [&_th]:bg-muted/40",
        "[&_td]:border [&_td]:border-border/70 [&_td]:p-2.5",
        "[&_th]:border [&_th]:border-border/70 [&_th]:p-2.5",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
    />
  );
}

const cardClass = "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm";

function SectionHeading({
  icon: Icon,
  number,
  title,
  description,
  trailing,
}: {
  icon: typeof BookOpenText;
  number?: number;
  title: string;
  description?: string;
  trailing?: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
          {number ? <Badge variant="secondary" className="tabular-nums">{String(number).padStart(2, "0")}</Badge> : null}
        </div>
        {description ? <p className="text-xs leading-5 text-muted-foreground sm:text-sm">{description}</p> : null}
      </div>
      {trailing ? <Badge variant="outline" className="text-xs">{trailing}</Badge> : null}
    </div>
  );
}

function PreviewPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm leading-6 dark:border-emerald-900/60 dark:bg-emerald-950/20 sm:p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4" aria-hidden="true" /> Model answer
      </div>
      {children}
    </div>
  );
}

const normalizeAnswer = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/\s+/g, " ").replace(/[.,!?;:]+$/g, "");

/**
 * Insert slots only into sanitized HTML text nodes, never into tag attributes.
 * The editor saves each blank as `____` in the question HTML, while its model
 * answer lives in `block.blanks` in the same reading order.
 */
function buildInformationTransferMarkup(question: string, blankCount: number) {
  let index = 0;
  let unmatched = 0;
  const markup = sanitizeRichHtml(question)
    .split(/(<[^>]*>)/g)
    .map((part) => {
      if (part.startsWith("<")) return part;
      return part.replace(/_{2,}/g, (marker) => {
        const slot = index++;
        if (slot >= blankCount) {
          unmatched += 1;
          return marker;
        }
        return `<span data-transfer-blank-slot="${slot}" class="not-prose inline-flex min-h-10 max-w-full align-middle"></span>`;
      });
    })
    .join("");

  return { markup, slotCount: index - unmatched, unmatched };
}

function InformationTransferExercise({ block, number }: { block: InformationTransferBlock; number: number }) {
  const blanks = useMemo(() => [...block.blanks].sort((a, b) => a.sortOrder - b.sortOrder), [block.blanks]);
  const { markup, slotCount, unmatched } = useMemo(
    () => buildInformationTransferMarkup(block.question, blanks.length),
    [block.question, blanks.length],
  );
  const questionRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<HTMLElement[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [preview, setPreview] = useState(false);
  const complete = blanks.filter((blank) => Boolean(answers[blank.id]?.trim())).length;

  // Portals keep the inputs fully React-controlled while preserving the rich
  // text/table markup and placing each input at its original ____ position.
  useEffect(() => {
    const root = questionRef.current;
    if (!root) {
      setSlots([]);
      return;
    }
    setSlots(Array.from(root.querySelectorAll<HTMLElement>("[data-transfer-blank-slot]")));
  }, [markup]);

  const reset = () => {
    setAnswers({});
    setChecked(false);
    setPreview(false);
  };

  return (
    <section className={cardClass} aria-label="Information Transfer">
      <SectionHeading icon={ClipboardList} number={number} title="Information Transfer" description="Fill in each blank directly in the table or question below." trailing={`${blanks.length} blanks`} />
      <div className="space-y-4 p-4 sm:p-5">
        {block.details ? <RichContent html={block.details} className="text-muted-foreground" /> : null}
        {block.question ? (
          <div className="overflow-x-auto rounded-xl border border-border/70 bg-muted/15 p-3 sm:p-4" aria-label="Information transfer question">
            <div
              ref={questionRef}
              className={cn(
                "prose prose-sm max-w-none break-words leading-7 dark:prose-invert",
                "[&_p]:leading-7 [&_table]:w-full [&_table]:min-w-[400px] [&_th]:bg-muted/40",
                "[&_td]:border [&_td]:border-border/70 [&_td]:p-2.5",
                "[&_th]:border [&_th]:border-border/70 [&_th]:p-2.5",
              )}
              dangerouslySetInnerHTML={{ __html: markup }}
            />
            {slots.slice(0, slotCount).map((element, index) => {
              const blank = blanks[index];
              if (!blank) return null;
              const value = answers[blank.id] ?? "";
              const isMatching = Boolean(value.trim()) && normalizeAnswer(value) === normalizeAnswer(blank.answer);
              return createPortal(
                <span className="not-prose inline-flex max-w-full flex-col gap-1 align-middle">
                  <Input
                    id={`unseen-blank-${blank.id}`}
                    aria-label={`Blank ${index + 1}`}
                    aria-invalid={checked && !isMatching}
                    value={value}
                    placeholder={String(index + 1)}
                    autoComplete="off"
                    className={cn(
                      "h-10 w-36 max-w-full rounded-lg bg-background px-2 text-center text-sm sm:w-44",
                      checked && (isMatching
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                        : "border-destructive/70"),
                    )}
                    onChange={(event) => {
                      setAnswers((current) => ({ ...current, [blank.id]: event.target.value }));
                      setChecked(false);
                    }}
                  />
                  {checked ? (
                    <span className={cn("text-[11px] font-medium leading-4", isMatching ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
                      {isMatching ? "Correct" : value.trim() ? "Check again" : "Not answered"}
                    </span>
                  ) : null}
                  {preview ? (
                    <span className="max-w-48 break-words text-[11px] font-medium leading-4 text-emerald-700 dark:text-emerald-400">
                      {blank.answer || "No model answer"}
                    </span>
                  ) : null}
                </span>,
                element,
                blank.id,
              );
            })}
          </div>
        ) : null}
        {unmatched > 0 || slotCount < blanks.length ? (
          <p className="text-xs text-amber-700 dark:text-amber-400" role="status">
            Some question blanks do not match the saved answer fields. Ask your teacher to review this exercise.
          </p>
        ) : null}
        {blanks.length > 0 ? (
          <div className="border-t border-border/60 pt-4">
            <div className="mb-3 text-xs tabular-nums text-muted-foreground">{complete}/{blanks.length} filled</div>
            <PracticeAnswerActions
              onCheck={() => { setChecked(true); setPreview(false); }}
              checkDisabled={complete === 0}
              onPreview={() => setPreview((current) => !current)}
              onReset={reset}
              previewLabel={preview ? "Hide Answers" : "Preview Answers"}
              resetLabel="Reset Answers"
            />
            <p className="mt-2 text-xs text-muted-foreground">Checking compares your wording with the saved model; other correct wording may also be valid.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TrueFalseExercise({ block, number }: { block: UnseenTrueFalseBlock; number: number }) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState(false);
  const [preview, setPreview] = useState(false);
  const completed = block.rows.filter((row) => answers[row.id] !== undefined).length;
  const reset = () => { setAnswers({}); setChecked(false); setPreview(false); };

  return (
    <section className={cardClass} aria-label="True or False">
      <SectionHeading icon={ListChecks} number={number} title="True / False" description="Decide whether each statement is true or false." trailing={`${block.rows.length} questions`} />
      <div className="space-y-4 p-4 sm:p-5">
        {block.instruction ? <RichContent html={block.instruction} className="text-muted-foreground" /> : null}
        <div className="space-y-3">
          {block.rows.map((row, index) => {
            const selected = answers[row.id];
            return (
              <div key={row.id} className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold tabular-nums text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="min-w-0 flex-1 text-sm leading-7">{row.statement}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:max-w-72" role="group" aria-label={`Statement ${index + 1} answer`}>
                  {([true, false] as const).map((choice) => (
                    <Button
                      key={String(choice)}
                      type="button"
                      variant="outline"
                      aria-pressed={selected === choice}
                      className={cn("min-h-11 border-border/80 text-sm", selected === choice && "border-primary bg-primary/10 text-primary hover:bg-primary/15")}
                      onClick={() => {
                        setAnswers((current) => ({ ...current, [row.id]: choice }));
                        setChecked(false);
                      }}
                    >
                      {choice ? "True" : "False"}
                    </Button>
                  ))}
                </div>
                {checked && selected !== undefined ? (
                  <div className={cn("flex items-center gap-2 text-xs", selected === row.expectedAnswer ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
                    {selected === row.expectedAnswer ? <Check className="size-4" /> : <X className="size-4" />}
                    {selected === row.expectedAnswer ? "Correct" : "Review this statement"}
                  </div>
                ) : null}
                {preview ? (
                  <PreviewPanel>
                    <p className="font-medium">{row.expectedAnswer ? "True" : "False"}</p>
                    {!row.expectedAnswer && row.correction ? <p className="mt-1 break-words">Correction: {row.correction}</p> : null}
                  </PreviewPanel>
                ) : null}
              </div>
            );
          })}
        </div>
        {block.rows.length > 0 ? (
          <div className="border-t border-border/60 pt-4">
            <div className="mb-3 text-xs tabular-nums text-muted-foreground">{completed}/{block.rows.length} answered</div>
            <PracticeAnswerActions
              onCheck={() => { setChecked(true); setPreview(false); }}
              checkDisabled={completed === 0}
              onPreview={() => setPreview((current) => !current)}
              onReset={reset}
              previewLabel={preview ? "Hide Answers" : "Preview Answers"}
              resetLabel="Reset Answers"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SummaryExercise({ block, number }: { block: WritingSummaryBlock; number: number }) {
  const [response, setResponse] = useState("");
  const [preview, setPreview] = useState(false);
  const wordCount = response.trim() ? response.trim().split(/\s+/).length : 0;
  return (
    <section className={cardClass} aria-label="Writing Summary">
      <SectionHeading icon={FilePenLine} number={number} title="Writing Summary" description="Write your own summary, then compare it with the model." />
      <div className="space-y-4 p-4 sm:p-5">
        {block.instruction ? <RichContent html={block.instruction} /> : null}
        <div className="space-y-2">
          <label htmlFor={`unseen-summary-${block.id}`} className="text-sm font-medium">Your summary</label>
          <Textarea
            id={`unseen-summary-${block.id}`}
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            rows={5}
            placeholder="Write a short summary in your own words…"
            className="min-h-36 resize-y bg-muted/10 p-3 text-sm leading-7"
          />
          <p className="text-right text-xs tabular-nums text-muted-foreground">{wordCount} {wordCount === 1 ? "word" : "words"}</p>
        </div>
        {preview && block.modelAnswer ? <PreviewPanel><RichContent html={block.modelAnswer} /></PreviewPanel> : null}
        <div className="border-t border-border/60 pt-4">
          <PracticeAnswerActions
            onPreview={() => setPreview((current) => !current)}
            onReset={() => { setResponse(""); setPreview(false); }}
            previewLabel={preview ? "Hide Answer" : "Preview Answer"}
            resetLabel="Reset Answer"
          />
          <p className="mt-2 text-xs text-muted-foreground">A summary can have different correct wording. Compare your key ideas with the model.</p>
        </div>
      </div>
    </section>
  );
}

export function UserUnseenCompositionViewer({ documentJson }: { documentJson: string }) {
  const document = useMemo(() => parseUnseenCompositionDocument(documentJson), [documentJson]);
  if (document.blocks.length === 0) {
    return <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No published exercises are available for this passage yet.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-6 sm:space-y-6">
      {document.blocks.map((block, index) => {
        if (block.kind === "unseen-passage") {
          if (!block.body?.trim()) return null;
          return (
            <section key={block.id} className={cardClass} aria-label="Unseen reading passage">
              <SectionHeading icon={BookOpenText} title="Reading Passage" description="Read carefully before answering the questions below." trailing="Unseen Passage" />
              <div className="p-4 sm:p-5">
                <div className="rounded-xl border border-border/60 bg-muted/15 px-4 py-4 sm:px-5 sm:py-5">
                  <RichContent html={block.body} className="text-sm leading-8 sm:text-[0.9375rem] [&_p]:leading-8" />
                </div>
              </div>
            </section>
          );
        }
        if (block.kind === "information-transfer") return <InformationTransferExercise key={block.id} block={block} number={index + 1} />;
        if (block.kind === "true-false") return <TrueFalseExercise key={block.id} block={block} number={index + 1} />;
        if (block.kind === "writing-summary") return <SummaryExercise key={block.id} block={block} number={index + 1} />;
        return null;
      })}
    </div>
  );
}
