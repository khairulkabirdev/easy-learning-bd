"use client";

import { useMemo, useState, type DragEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  ListOrdered,
  RotateCcw,
} from "lucide-react";

import { parseRearrangeSentenceDocument } from "@/app/admin/content/subject-section-blocks/types";
import { Button } from "@/components/ui/button";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";

type RearrangeRecord = {
  id: string;
  instruction?: string;
  details?: string;
  documentJson: string;
};

const letter = (index: number) => String.fromCharCode(97 + (index % 26));
const DRAG_PREFIX = "easy-learning-rearrange-letter:";

function RichText({ value }: { value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div
      className="prose prose-sm max-w-none min-w-0 break-words leading-6 dark:prose-invert [&_p]:my-0"
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }}
    />
  );
}

/**
 * The sentence list is a static reference. Students drag LETTERS into answer
 * slots instead of moving the passage text. The saved row IDs, never the
 * displayed a/b/c labels, are used to check the correct sequence.
 */
export function UserRearrangeSentenceViewer({ record }: { record: RearrangeRecord }) {
  const document = useMemo(
    () => parseRearrangeSentenceDocument(record.documentJson, record.id),
    [record.documentJson, record.id],
  );
  const [slots, setSlots] = useState<Array<string | null>>(() => document.rows.map(() => null));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [preview, setPreview] = useState(false);

  const originalIndices = useMemo(
    () => new Map(document.rows.map((row, index) => [row.id, index])),
    [document],
  );
  const rowMap = useMemo(() => new Map(document.rows.map((row) => [row.id, row])), [document]);
  const completeAnswerKey =
    document.correctOrder.length === document.rows.length &&
    new Set(document.correctOrder).size === document.rows.length &&
    document.correctOrder.every((id) => rowMap.has(id)) &&
    document.rows.length >= 2;
  const assignedCount = slots.filter(Boolean).length;
  const score = completeAnswerKey
    ? slots.filter((id, index) => id !== null && document.correctOrder[index] === id).length
    : 0;

  function resetFeedback() {
    setChecked(false);
    setPreview(false);
  }

  function placeLetter(id: string, position: number) {
    if (!rowMap.has(id) || position < 0 || position >= document.rows.length) return;
    setSlots((current) => {
      const next = [...current];
      const previousPosition = next.indexOf(id);
      // Moving a placed tile to another occupied slot swaps the two letters;
      // placing a bank tile returns the displaced tile to the bank.
      if (previousPosition !== -1 && previousPosition !== position) {
        next[previousPosition] = next[position];
      }
      next[position] = id;
      return next;
    });
    setSelectedId(null);
    resetFeedback();
  }

  function chooseSlot(position: number) {
    if (selectedId) {
      placeLetter(selectedId, position);
    } else if (slots[position]) {
      // Tap an occupied slot to return its letter to the bank.
      setSlots((current) => current.map((id, index) => index === position ? null : id));
      resetFeedback();
    }
  }

  function beginDrag(event: DragEvent<HTMLElement>, id: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${DRAG_PREFIX}${id}`);
    setDraggingId(id);
    setSelectedId(null);
  }

  function dropLetter(event: DragEvent<HTMLButtonElement>, position: number) {
    event.preventDefault();
    const token = event.dataTransfer.getData("text/plain");
    const id = token.startsWith(DRAG_PREFIX) ? token.slice(DRAG_PREFIX.length) : "";
    if (rowMap.has(id)) placeLetter(id, position);
    setDraggingId(null);
    setHoverSlot(null);
  }

  function reset() {
    setSlots(document.rows.map(() => null));
    setSelectedId(null);
    setDraggingId(null);
    setHoverSlot(null);
    resetFeedback();
  }

  if (document.rows.length < 2) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Rearrange Sentence questions are not available for this practice set yet.
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border/70 bg-primary/[0.035] px-4 py-3.5 sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
          <ListOrdered className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">Rearrange Sentence</h2>
          <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
            Read the story parts, then drag or tap their letters into the answer boxes.
          </p>
        </div>
        <span className="mt-1 shrink-0 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
          {document.rows.length} parts
        </span>
      </div>

      <div className="space-y-5 p-3 sm:p-5">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Story parts</h3>
          <ol className="space-y-2" aria-label="Original sentence parts">
            {document.rows.map((row, index) => (
              <li key={row.id} className="flex min-w-0 items-start gap-2 rounded-lg border border-border/75 bg-muted/20 px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-xs font-semibold text-primary ring-1 ring-border/70">
                  {letter(index)}
                </span>
                <div className="min-w-0 flex-1 text-sm text-foreground">
                  <RichText value={row.question} />
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3 border-t border-border/70 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Your story order</h3>
            <span className="text-xs text-muted-foreground">Select or drag letters into the boxes</span>
          </div>

          {/* Letter bank: letters are draggable; story sentences above are not. */}
          <div className="flex flex-wrap gap-2 rounded-xl border border-border/70 bg-muted/15 p-3" aria-label="Available sentence letters">
            {document.rows.map((row, index) => {
              const used = slots.includes(row.id);
              const selected = selectedId === row.id;
              return (
                <button
                  type="button"
                  key={row.id}
                  draggable
                  onDragStart={(event) => beginDrag(event, row.id)}
                  onDragEnd={() => { setDraggingId(null); setHoverSlot(null); }}
                  onClick={() => setSelectedId((current) => current === row.id ? null : row.id)}
                  aria-pressed={selected}
                  aria-label={`Letter ${letter(index)}${used ? ", currently in an answer box" : ""}. Tap to select or drag to a box`}
                  className={`flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg border text-sm font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/20"
                    : used ? "border-border/70 bg-background/50 text-muted-foreground"
                    : "border-primary/25 bg-background text-primary shadow-sm hover:border-primary hover:bg-primary/5"
                  } ${draggingId === row.id ? "opacity-50" : ""}`}
                >
                  {letter(index)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-3 rounded-xl border border-dashed border-border bg-background p-3 sm:gap-x-2 sm:p-4" aria-label="Your answer sequence">
            {slots.map((id, position) => {
              const index = id ? originalIndices.get(id) : undefined;
              const isCorrect = checked && completeAnswerKey && id === document.correctOrder[position];
              const isWrong = checked && id !== null && !isCorrect;
              return (
                <div key={position} className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    draggable={Boolean(id)}
                    onDragStart={(event) => { if (id) beginDrag(event, id); }}
                    onDragEnd={() => { setDraggingId(null); setHoverSlot(null); }}
                    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setHoverSlot(position); }}
                    onDragLeave={() => setHoverSlot((current) => current === position ? null : current)}
                    onDrop={(event) => dropLetter(event, position)}
                    onClick={() => chooseSlot(position)}
                    aria-label={`Answer position ${position + 1}: ${index === undefined ? "empty" : `letter ${letter(index)}`}. ${selectedId ? "Place selected letter" : id ? "Remove this letter" : "Select a letter first"}`}
                    className={`relative flex h-12 w-11 touch-manipulation items-center justify-center rounded-lg border-2 text-base font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-12 ${
                      isCorrect ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : isWrong ? "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                      : hoverSlot === position || selectedId ? "border-primary/60 bg-primary/5 text-primary"
                      : "border-dashed border-border bg-muted/20 text-foreground"
                    }`}
                  >
                    <span className="absolute -top-2 left-1 rounded bg-card px-1 text-[10px] font-medium tabular-nums text-muted-foreground">
                      {position + 1}
                    </span>
                    {index === undefined ? <span className="text-muted-foreground/50">–</span> : letter(index)}
                  </button>
                  {position < slots.length - 1 ? (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/55" aria-hidden="true" />
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {selectedId
              ? `Letter ${letter(originalIndices.get(selectedId) ?? 0)} selected. Tap an answer box to place it.`
              : `${assignedCount} of ${slots.length} boxes filled. Tap a filled box to remove its letter.`}
          </p>
        </div>

        <div className="space-y-3 border-t border-border/70 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => { setChecked(true); setPreview(false); setSelectedId(null); }}
              disabled={!completeAnswerKey}
              className="min-h-11 gap-2"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Check Answer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setPreview((current) => !current); setChecked(false); setSelectedId(null); }}
              disabled={!completeAnswerKey}
              className="min-h-11 gap-2"
            >
              {preview ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              {preview ? "Hide Answer" : "Preview Answer"}
            </Button>
            <Button type="button" variant="ghost" onClick={reset} className="min-h-11 gap-2 text-muted-foreground">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset Answer
            </Button>
          </div>

          {checked && completeAnswerKey ? (
            <p className="text-sm font-medium" aria-live="polite">
              {score} of {slots.length} positions correct.
              {assignedCount < slots.length ? ` Complete the remaining ${slots.length - assignedCount} box(es).` : score === slots.length ? " Excellent!" : " Try again."}
            </p>
          ) : null}
          {!completeAnswerKey ? (
            <p className="text-sm text-muted-foreground">This exercise has an incomplete answer key. Ask your teacher to review it.</p>
          ) : null}

          {preview && completeAnswerKey ? (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 sm:p-4">
              <h3 className="mb-2 text-sm font-semibold text-primary">Correct order</h3>
              <div className="flex flex-wrap items-center gap-1.5" aria-label="Correct sentence letter sequence">
                {document.correctOrder.map((id, position) => (
                  <div key={id} className="flex items-center gap-1.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-background text-sm font-semibold text-primary">
                      {letter(originalIndices.get(id) ?? position)}
                    </span>
                    {position < document.correctOrder.length - 1 ? (
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {record.details?.trim() ? (
          <details className="rounded-xl border border-border/70 bg-muted/10 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-muted-foreground">Additional notes</summary>
            <div className="mt-2"><RichText value={record.details} /></div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
