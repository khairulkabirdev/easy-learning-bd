"use client";

import { useMemo, useState, type DragEvent } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  CircleHelp,
  Eye,
  EyeOff,
  GripVertical,
  MousePointerClick,
  RotateCcw,
  X,
} from "lucide-react";

import { parseMatchingDocument } from "@/app/admin/content/subject-section-blocks/types";
import { Button } from "@/components/ui/button";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";

type MatchingRecord = {
  id: string;
  instruction?: string;
  details?: string;
  documentJson: string;
};

type SelectedChoice = { columnId: string; cellId: string } | null;
type SelectedSlot = { promptId: string; columnId: string } | null;

type Choice = { id: string; text: string };
type ChoiceColumn = { id: string; label: string; choices: Choice[] };
type Prompt = { id: string; text: string };

const slotKey = (promptId: string, columnId: string) => `${promptId}::${columnId}`;
const letter = (index: number) => String.fromCharCode(97 + (index % 26));

function RichText({ value }: { value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div
      className="prose prose-sm max-w-none break-words leading-7 dark:prose-invert [&_p]:my-1"
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }}
    />
  );
}

/**
 * Uses the saved answer selections (cell IDs), NOT the visual order of Column B.
 * This means shuffled textbook columns and imported practice sets stay correct.
 */
export function UserMatchingSentencesViewer({ record }: { record: MatchingRecord }) {
  const document = useMemo(
    () => parseMatchingDocument(record.documentJson, record.id),
    [record.documentJson, record.id],
  );

  const exercise = useMemo(() => {
    const columns = [...document.columns].sort((a, b) => a.sortOrder - b.sortOrder);
    const sourceColumn = columns[0];
    const prompts: Prompt[] = sourceColumn
      ? document.rows.map((row) => {
          const cell = row.cells.find((item) => item.columnId === sourceColumn.id);
          return { id: cell?.id || "", text: cell?.text || "" };
        }).filter((prompt) => prompt.id)
      : [];

    const choiceColumns: ChoiceColumn[] = columns.slice(1).map((column) => ({
      id: column.id,
      label: column.label,
      choices: document.rows
        .map((row) => row.cells.find((item) => item.columnId === column.id))
        .filter((cell): cell is NonNullable<typeof cell> => Boolean(cell?.id))
        .map((cell) => ({ id: cell.id, text: cell.text })),
    }));

    const correct: Record<string, string> = {};
    for (const answer of document.answers) {
      const promptId = answer.selections.find((selection) => selection.columnId === sourceColumn?.id)?.cellId;
      if (!promptId || !prompts.some((prompt) => prompt.id === promptId)) continue;
      for (const column of choiceColumns) {
        const cellId = answer.selections.find((selection) => selection.columnId === column.id)?.cellId;
        if (cellId && column.choices.some((choice) => choice.id === cellId)) {
          correct[slotKey(promptId, column.id)] = cellId;
        }
      }
    }
    return { prompts, choiceColumns, correct };
  }, [document]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedChoice, setSelectedChoice] = useState<SelectedChoice>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [preview, setPreview] = useState(false);

  const total = exercise.prompts.length * exercise.choiceColumns.length;
  const filled = Object.values(answers).filter(Boolean).length;
  const score = Object.entries(exercise.correct).filter(([key, value]) => answers[key] === value).length;
  const hasAnswerKey = Object.keys(exercise.correct).length === total && total > 0;

  const choiceText = (columnId: string, cellId: string) =>
    exercise.choiceColumns.find((column) => column.id === columnId)?.choices.find((choice) => choice.id === cellId)?.text || "";

  function assign(promptId: string, columnId: string, cellId: string) {
    if (!exercise.choiceColumns.some((column) => column.id === columnId && column.choices.some((choice) => choice.id === cellId))) return;
    if (!exercise.prompts.some((prompt) => prompt.id === promptId)) return;

    setAnswers((current) => {
      const updated = { ...current };
      // An answer option can be placed only once in its column.
      for (const [key, value] of Object.entries(updated)) {
        if (value === cellId) delete updated[key];
      }
      updated[slotKey(promptId, columnId)] = cellId;
      return updated;
    });
    setSelectedChoice(null);
    setSelectedSlot(null);
    setDragOverSlot(null);
    setChecked(false);
    setPreview(false);
  }

  function selectChoice(columnId: string, cellId: string) {
    if (selectedSlot?.columnId === columnId) {
      assign(selectedSlot.promptId, columnId, cellId);
      return;
    }
    setSelectedSlot(null);
    setSelectedChoice((current) =>
      current?.columnId === columnId && current.cellId === cellId ? null : { columnId, cellId },
    );
  }

  function selectSlot(promptId: string, columnId: string) {
    if (selectedChoice?.columnId === columnId) {
      assign(promptId, columnId, selectedChoice.cellId);
      return;
    }
    setSelectedChoice(null);
    setSelectedSlot((current) =>
      current?.promptId === promptId && current.columnId === columnId ? null : { promptId, columnId },
    );
  }

  function removeAssignment(promptId: string, columnId: string) {
    const key = slotKey(promptId, columnId);
    setAnswers((current) => {
      const updated = { ...current };
      delete updated[key];
      return updated;
    });
    setChecked(false);
    setPreview(false);
  }

  function beginDrag(event: DragEvent<HTMLElement>, choice: SelectedChoice) {
    if (!choice) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(choice));
    setSelectedChoice(choice);
    setSelectedSlot(null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>, promptId: string, columnId: string) {
    event.preventDefault();
    setDragOverSlot(null);
    try {
      const payload: unknown = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (!payload || typeof payload !== "object" || !("columnId" in payload) || !("cellId" in payload)) return;
      const choice = payload as { columnId: unknown; cellId: unknown };
      if (choice.columnId === columnId && typeof choice.cellId === "string") {
        assign(promptId, columnId, choice.cellId);
      }
    } catch {
      // Ignore drops that do not carry an EasyLearningBD choice token.
    }
  }

  function reset() {
    setAnswers({});
    setChecked(false);
    setPreview(false);
    setSelectedChoice(null);
    setSelectedSlot(null);
    setDragOverSlot(null);
  }

  if (!exercise.prompts.length || !exercise.choiceColumns.length) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Matching questions are not available for this practice set yet.
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="border-b bg-primary/[0.035] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
            <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Match the sentences</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Drag a choice into its matching blank, or tap a choice and then tap a blank.
            </p>
          </div>
          <span className="shrink-0 rounded-full border bg-background px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
            {filled}/{total}
          </span>
        </div>
        {record.instruction?.trim() ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm">
            <RichText value={record.instruction} />
          </div>
        ) : null}
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <div className="space-y-4">
          {exercise.choiceColumns.map((column) => (
            <div key={column.id} className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{column.label} · Answer choices</h3>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <GripVertical className="h-3.5 w-3.5" aria-hidden="true" /> Drag or tap
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {column.choices.map((choice, index) => {
                  const picked = selectedChoice?.cellId === choice.id && selectedChoice.columnId === column.id;
                  const placed = Object.values(answers).includes(choice.id);
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      draggable
                      onDragStart={(event) => beginDrag(event, { columnId: column.id, cellId: choice.id })}
                      onDragEnd={() => setDragOverSlot(null)}
                      onClick={() => selectChoice(column.id, choice.id)}
                      aria-pressed={picked}
                      className={`flex min-h-12 min-w-0 items-start gap-2 rounded-xl border px-3 py-3 text-left text-sm leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        picked
                          ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                          : "border-border/80 bg-background hover:border-primary/40 hover:bg-primary/[0.035]"
                      } ${placed ? "opacity-65" : ""}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 break-words">{choice.text}</span>
                      {placed ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-label="Placed" /> : <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/70 pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Match each sentence</h3>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" /> Tap a blank to choose its match
            </span>
          </div>
          <div className="space-y-3">
            {exercise.prompts.map((prompt, index) => (
              <div key={prompt.id} className="rounded-xl border border-border/80 bg-muted/15 p-3 sm:p-4">
                <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
                  <div className="flex min-w-0 items-start gap-2.5 py-1">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{letter(index)}</span>
                    <p className="min-w-0 flex-1 break-words text-sm font-medium leading-7">{prompt.text}</p>
                  </div>
                  <div className="space-y-2">
                    {exercise.choiceColumns.map((column) => {
                      const key = slotKey(prompt.id, column.id);
                      const value = answers[key];
                      const isActive = dragOverSlot === key || (selectedSlot?.promptId === prompt.id && selectedSlot.columnId === column.id);
                      const isCorrect = checked && value === exercise.correct[key];
                      const isWrong = checked && value !== exercise.correct[key];
                      return (
                        <div key={column.id} className="min-w-0 space-y-1">
                          {exercise.choiceColumns.length > 1 ? <p className="text-xs text-muted-foreground">{column.label}</p> : null}
                          <div
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = "move";
                              setDragOverSlot(key);
                            }}
                            onDragLeave={() => setDragOverSlot((current) => current === key ? null : current)}
                            onDrop={(event) => onDrop(event, prompt.id, column.id)}
                            className={`flex min-h-12 min-w-0 items-center gap-1 rounded-xl border border-dashed p-1 transition-colors ${
                              isCorrect ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/25"
                              : isWrong ? "border-rose-400 bg-rose-50 dark:bg-rose-950/25"
                              : isActive ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                              : value ? "border-primary/30 bg-primary/[0.055]" : "border-border bg-background"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => selectSlot(prompt.id, column.id)}
                              aria-label={`Match sentence ${letter(index)} with ${column.label}${value ? `, currently ${choiceText(column.id, value)}` : ", empty"}`}
                              aria-pressed={isActive}
                              className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 text-left text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {value ? (
                                <span
                                  draggable
                                  onDragStart={(event) => beginDrag(event, { columnId: column.id, cellId: value })}
                                  onDragEnd={() => setDragOverSlot(null)}
                                  className="min-w-0 flex-1 cursor-grab break-words font-medium active:cursor-grabbing"
                                >
                                  {choiceText(column.id, value)}
                                </span>
                              ) : (
                                <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                  <CircleHelp className="h-4 w-4 shrink-0" aria-hidden="true" /> Drop or tap to match
                                </span>
                              )}
                            </button>
                            {value ? (
                              <button
                                type="button"
                                onClick={() => removeAssignment(prompt.id, column.id)}
                                aria-label={`Remove match for sentence ${letter(index)}`}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </button>
                            ) : null}
                          </div>
                          {checked ? (
                            <p className={`text-xs font-medium ${isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                              {isCorrect ? "Correct match" : value ? "Not quite — try a different choice" : "Add a match"}
                            </p>
                          ) : null}
                          {preview && hasAnswerKey ? (
                            <div className="rounded-lg border border-primary/15 bg-primary/[0.06] px-3 py-2 text-xs leading-5">
                              <span className="font-semibold text-primary">Correct answer: </span>
                              {choiceText(column.id, exercise.correct[key])}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t border-border/70 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => { setChecked(true); setPreview(false); setSelectedChoice(null); setSelectedSlot(null); }}
              disabled={!hasAnswerKey}
              className="min-h-11 gap-2"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Check Answer
            </Button>
            <Button type="button" variant="outline" disabled={!hasAnswerKey} onClick={() => { setPreview((current) => !current); setChecked(false); }} className="min-h-11 gap-2">
              {preview ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              {preview ? "Hide Answers" : "Preview Answer"}
            </Button>
            <Button type="button" variant="ghost" onClick={reset} className="min-h-11 gap-2 text-muted-foreground">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset Answer
            </Button>
          </div>
          <div aria-live="polite" className="text-sm text-muted-foreground">
            {checked ? (
              <p className="font-medium text-foreground">{score} of {total} matches correct. {score === total ? "Excellent work!" : "You can adjust your matches and check again."}</p>
            ) : preview ? (
              <p>Correct pairs are shown under each sentence. Your choices have not changed.</p>
            ) : selectedChoice ? (
              <p>Choice selected. Tap the matching blank to place it.</p>
            ) : selectedSlot ? (
              <p>Blank selected. Tap an answer choice to fill it.</p>
            ) : !hasAnswerKey ? (
              <p>The answer key for this exercise is incomplete. Ask your teacher to review it.</p>
            ) : (
              <p>{filled} of {total} matches filled. You can change any match before checking.</p>
            )}
          </div>
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
