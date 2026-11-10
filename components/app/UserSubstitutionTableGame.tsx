"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  LockKeyhole,
  RotateCcw,
  Undo2,
  XCircle,
} from "lucide-react";
import type { SubstitutionTableDocument } from "@/app/admin/content/english-second-paper-blocks/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type SelectedPhrase = { cellId: string; text: string };
type SavedSentence = SelectedPhrase[];

const BE_FORMS = ["be", "am", "is", "are", "was", "were"] as const;

/** Compare stable choice IDs; selected verb forms are validated separately. */
function sentenceKey(ids: string[]) {
  return JSON.stringify(ids);
}

function normalizeSentence(sentence: string) {
  return sentence
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .trim()
    .toLocaleLowerCase();
}

export function UserSubstitutionTableGame({ document }: { document: SubstitutionTableDocument }) {
  const columns = useMemo(
    () => [...document.columns].sort((a, b) => a.sortOrder - b.sortOrder),
    [document.columns],
  );
  const choiceColumns = useMemo(
    () => columns.map((column) => ({
      ...column,
      choices: document.rows
        .flatMap((row) => row.cells)
        .filter((cell) => cell.columnId === column.id && cell.text.trim().length > 0)
        .filter((cell, index, all) => all.findIndex((item) => item.id === cell.id) === index),
    })),
    [columns, document.rows],
  );
  const cellText = useMemo(
    () => new Map(document.rows.flatMap((row) => row.cells).map((cell) => [cell.id, cell.text] as const)),
    [document.rows],
  );
  const referenceAnswers = useMemo(() => {
    const byChoices = new Map<string, string[]>();
    for (const answer of document.answers) {
      const key = sentenceKey(
        columns.map((column) => answer.selections.find((selection) => selection.columnId === column.id)?.cellId ?? ""),
      );
      byChoices.set(key, [...(byChoices.get(key) ?? []), answer.sentence]);
    }
    return byChoices;
  }, [columns, document.answers]);
  const total = useMemo(() => {
    if (!choiceColumns.length || choiceColumns.some((column) => column.choices.length === 0)) return 0;
    const available = Math.min(...choiceColumns.map((column) => column.choices.length));
    return Math.min(available, document.answers.length || document.rows.length);
  }, [choiceColumns, document.answers.length, document.rows.length]);

  const [finished, setFinished] = useState<SavedSentence[]>([]);
  const [draft, setDraft] = useState<SavedSentence>([]);
  const [checked, setChecked] = useState(false);
  const [preview, setPreview] = useState(false);
  const [openBeCellId, setOpenBeCellId] = useState<string | null>(null);

  const usedIds = useMemo(
    () => new Set(finished.flatMap((sentence) => sentence.map((phrase) => phrase.cellId))),
    [finished],
  );
  const isComplete = total > 0 && finished.length === total;
  const activeColumn = draft.length;

  function isCorrectSentence(sentence: SavedSentence) {
    const valid = referenceAnswers.get(sentenceKey(sentence.map((phrase) => phrase.cellId)));
    if (!valid?.length) return false;

    // For an editable "be" cell, the saved model sentence is the answer key
    // for the chosen verb form, not merely its stable cell ID.
    const hasConjugatedBe = sentence.some(
      (phrase) => /^be$/i.test(cellText.get(phrase.cellId)?.trim() ?? ""),
    );
    if (!hasConjugatedBe) return true;

    const constructed = normalizeSentence(sentence.map((phrase) => phrase.text).join(" "));
    return valid.some((model) => normalizeSentence(model) === constructed);
  }

  const correctCount = finished.filter(isCorrectSentence).length;

  function choose(columnIndex: number, cellId: string, text: string) {
    if (isComplete || columnIndex !== activeColumn || usedIds.has(cellId)) return;
    const next = [...draft, { cellId, text }];
    setChecked(false);
    setOpenBeCellId(null);
    if (next.length === columns.length) {
      // Completing a sentence consumes only its underlying table cells.
      // Different conjugations of "be" cannot reuse the same cell.
      setFinished((previous) => [...previous, next]);
      setDraft([]);
    } else {
      setDraft(next);
    }
  }

  function undoLastChoice() {
    setChecked(false);
    setOpenBeCellId(null);
    setDraft((previous) => previous.slice(0, -1));
  }

  function undoLastSentence() {
    setChecked(false);
    setOpenBeCellId(null);
    setFinished((previous) => previous.slice(0, -1));
    setDraft([]);
  }

  function reset() {
    setFinished([]);
    setDraft([]);
    setChecked(false);
    setPreview(false);
    setOpenBeCellId(null);
  }

  if (!total || !columns.length) {
    return <p className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">No sentence parts are available for this exercise yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Phrase table stays above the answer boxes. */}
      <section aria-label="Phrase selection table" className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Select from the table</h3>
          <span aria-live="polite" className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {isComplete ? "All selected" : `Column ${activeColumn + 1} of ${columns.length}: ${columns[activeColumn]?.label}`}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {choiceColumns.map((column, columnIndex) => {
            const isActive = !isComplete && columnIndex === activeColumn;
            return (
              <div
                key={column.id}
                className={`${isActive || isComplete ? "block" : "hidden sm:block"} min-w-0 rounded-xl border p-2.5 transition-colors ${
                  isActive ? "border-primary/40 bg-primary/[0.045]" : "bg-muted/10"
                }`}
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {columnIndex + 1}
                  </span>
                  <span className="min-w-0 truncate">{column.label}</span>
                </div>
                <div className="space-y-1.5">
                  {column.choices.map((cell) => {
                    const consumed = usedIds.has(cell.id);
                    const isBe = /^be$/i.test(cell.text.trim());
                    const choiceClass = `flex min-h-10 w-full items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      consumed
                        ? "cursor-not-allowed border-dashed bg-muted/50 text-muted-foreground/60 line-through"
                        : isActive
                          ? "bg-background hover:border-primary hover:bg-primary/5 active:bg-primary/10"
                          : "cursor-not-allowed bg-background/75 text-muted-foreground"
                    }`;
                    if (isBe) {
                      return (
                        <Popover
                          key={cell.id}
                          open={openBeCellId === cell.id && isActive && !consumed}
                          onOpenChange={(open) => setOpenBeCellId(open ? cell.id : null)}
                        >
                          <PopoverTrigger
                            type="button"
                            disabled={!isActive || consumed}
                            className={choiceClass}
                            aria-label={`Choose a form of be from ${column.label}`}
                          >
                            <span className="min-w-0 break-words">{cell.text}</span>
                            {consumed ? <LockKeyhole aria-hidden="true" className="h-3 w-3 shrink-0" /> : <span className="text-xs text-muted-foreground">Select form</span>}
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-64 max-w-[calc(100vw-2rem)] p-3">
                            <p className="mb-2 text-sm font-medium">Choose a form of “be”</p>
                            <div className="grid grid-cols-3 gap-2">
                              {BE_FORMS.map((form) => (
                                <Button
                                  key={form}
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="min-h-10"
                                  onClick={() => choose(columnIndex, cell.id, form)}
                                >
                                  {form}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    }
                    return (
                      <button
                        key={cell.id}
                        type="button"
                        disabled={!isActive || consumed}
                        onClick={() => choose(columnIndex, cell.id, cell.text)}
                        aria-label={`${consumed ? "Used: " : "Choose "}${cell.text} from ${column.label}`}
                        className={choiceClass}
                      >
                        <span className="min-w-0 break-words">{cell.text}</span>
                        {consumed ? <LockKeyhole aria-hidden="true" className="h-3 w-3 shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="Your sentences" className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Your sentences</h3>
          <span aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
            {finished.length} / {total} complete
          </span>
        </div>
        <div className="space-y-2">
          {Array.from({ length: total }, (_, rowIndex) => {
            const saved = finished[rowIndex];
            const active = !saved && rowIndex === finished.length;
            const cells = saved || (active ? draft : []);
            const correct = saved ? isCorrectSentence(saved) : false;
            const wrong = checked && saved && !correct;
            const incomplete = checked && !saved;
            return (
              <div
                key={rowIndex}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5 transition-colors ${
                  checked && saved
                    ? correct
                      ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
                      : "border-rose-400 bg-rose-50/70 dark:border-rose-700 dark:bg-rose-950/25"
                    : incomplete
                      ? "border-rose-300 bg-rose-50/30 dark:border-rose-800 dark:bg-rose-950/15"
                      : active
                        ? "border-primary/35 bg-primary/[0.035]"
                        : "bg-muted/10"
                }`}
              >
                <span className="w-8 shrink-0 text-xs font-semibold text-foreground">
                  {`${String.fromCharCode(97 + rowIndex)})`}
                </span>
                <input
                  type="text"
                  readOnly
                  value={cells.map((phrase) => phrase.text).join(" ")}
                  placeholder={active ? "Select phrases from the table above" : "—"}
                  aria-label={`Sentence ${String.fromCharCode(97 + rowIndex)} answer`}
                  aria-invalid={Boolean(wrong || incomplete)}
                  title={cells.map((phrase) => phrase.text).join(" ")}
                  className={`h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                    wrong || incomplete
                      ? "border-rose-400 bg-rose-100/60 text-rose-900 dark:border-rose-700 dark:bg-rose-950/35 dark:text-rose-200"
                      : checked && saved && correct
                        ? "border-emerald-400 bg-emerald-100/40 text-foreground dark:border-emerald-800 dark:bg-emerald-950/25"
                        : cells.length
                          ? "border-primary/25 bg-primary/5 text-foreground"
                          : "border-dashed bg-background text-muted-foreground"
                  }`}
                />
                {checked ? (
                  <span
                    role="status"
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      saved && correct ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {saved && correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {saved ? (correct ? "Correct" : "Incorrect") : "Incomplete"}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        {draft.length > 0 || finished.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {draft.length > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={undoLastChoice} className="min-h-9 text-xs">
                <Undo2 className="h-3.5 w-3.5" /> Undo choice
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={undoLastSentence} className="min-h-9 text-xs">
                <Undo2 className="h-3.5 w-3.5" /> Undo sentence
              </Button>
            )}
          </div>
        ) : null}
      </section>

      {checked ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            isComplete && correctCount === total
              ? "border-emerald-300 bg-emerald-50/60 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-300"
              : "border-rose-300 bg-rose-50/60 text-rose-800 dark:border-rose-800 dark:bg-rose-950/25 dark:text-rose-300"
          }`}
        >
          Score: {correctCount} / {total}
          {finished.length < total ? <span className="ml-1 font-normal">— {total - finished.length} unfinished</span> : null}
        </div>
      ) : null}
      {preview ? (
        <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
          <strong className="block text-primary">Valid sentences</strong>
          <div className="space-y-2">
            {document.answers.map((answer, index) => (
              <div key={answer.id} className="flex items-start gap-2">
                <span className="w-5 shrink-0 font-semibold text-primary">{`${String.fromCharCode(97 + index)})`}</span>
                <p className="min-w-0 flex-1 break-words">{answer.sentence}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Button type="button" onClick={() => setChecked(true)} disabled={!finished.length} className="min-h-11">
          <CheckCircle2 className="h-4 w-4" /> Check Answer
        </Button>
        <Button type="button" variant="outline" onClick={() => setPreview((value) => !value)} className="min-h-11">
          <Eye className="h-4 w-4" /> {preview ? "Hide Answers" : "Preview Answer"}
        </Button>
        <Button type="button" variant="ghost" onClick={reset} className="min-h-11">
          <RotateCcw className="h-4 w-4" /> Reset Answer
        </Button>
      </div>
    </div>
  );
}
