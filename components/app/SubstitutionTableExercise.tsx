"use client";

import { useState, type CSSProperties } from "react";
import { useModelPaperReview } from "@/components/app/ModelPaperMode";
import { CheckCircle2, XCircle } from "lucide-react";
import { TableCompletionChoiceCombobox } from "@/components/app/TableCompletionChoiceCombobox";
import { PracticeAnswerActions } from "@/components/app/PracticeAnswerActions";

import type { SubstitutionTableDocumentRecord } from "@/app/admin/content/content-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CheckStatus = "idle" | "correct" | "incorrect";

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSentence(value: string) {
  return stripHtml(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s+([,;:!?])/g, "$1")
    .replace(/[.!?]+$/g, "")
    .trim();
}

function sentenceAlternatives(value: string) {
  return value
    .split("|")
    .map((item) => normalizeSentence(item))
    .filter(Boolean);
}

function getSelectedPartsSentence(
  table: SubstitutionTableDocumentRecord,
  answer: SubstitutionTableDocumentRecord["answers"][number],
) {
  return table.columns
    .map((column) => {
      const selection = answer.selections.find((item) => item.columnId === column.id);
      if (!selection?.cellId) return "";
      const cell = table.rows
        .flatMap((row) => row.cells)
        .find((item) => item.id === selection.cellId && item.columnId === column.id);
      return cell?.text?.trim() || "";
    })
    .filter(Boolean)
    .join(" ");
}

function getCorrectSentence(
  table: SubstitutionTableDocumentRecord,
  answer: SubstitutionTableDocumentRecord["answers"][number],
) {
  return answer.sentence.trim() || getSelectedPartsSentence(table, answer);
}

// Keep the table cell IDs as selection values. Repeated text represents the same
// sentence part, so display it once rather than giving the combobox duplicate labels.
type PartChoice = { id: string; label: string; text: string };
const BE_FORMS = ["be", "am", "is", "are", "was", "were"];

function getColumnChoices(table: SubstitutionTableDocumentRecord, columnId: string): PartChoice[] {
  const cells = table.rows.flatMap((row) => row.cells).filter((cell) => cell.columnId === columnId);
  const choices: PartChoice[] = [];
  const seen = new Set<string>();
  const add = (id: string, text: string) => {
    const label = text || "(No word)";
    if (seen.has(label)) return;
    seen.add(label);
    choices.push({ id, label, text });
  };
  // Preserve the optional empty cell used by some existing tables.
  for (const cell of cells) {
    const text = stripHtml(cell.text);
    add(cell.id, text);
    if (text.toLowerCase() === "be") {
      for (const form of BE_FORMS) add(`${cell.id}:be:${form}`, form);
    }
  }
  if (table.answers.some((answer) => !answer.selections.find((selection) => selection.columnId === columnId)?.cellId)) {
    add(`empty:${columnId}`, "");
  }
  return choices;
}

// Lock the starting phrase to its question-row position, never to the answer key.
// Older tables with a different number of starting phrases remain selectable.
function getFixedFirstColumn(table: SubstitutionTableDocumentRecord, choices: PartChoice[]) {
  const columnId = table.columns[0]?.id;
  if (!columnId || table.rows.length !== table.answers.length) return null;
  const fixed = table.rows.map((row) => {
    const cell = row.cells.find((item) => item.columnId === columnId);
    const text = cell ? stripHtml(cell.text) : "";
    return text ? choices.find((choice) => choice.text === text) : undefined;
  });
  return fixed.every(Boolean) ? fixed as PartChoice[] : null;
}

function buildResponse(columns: { id: string; choices: PartChoice[] }[], selection: Record<string, string> | undefined) {
  const parts = columns.map((column) => column.choices.find((choice) => choice.id === selection?.[column.id]));
  return parts.length && parts.every(Boolean) ? parts.map((part) => part!.text).filter(Boolean).join(" ") : "";
}

function ResultBadge({ status }: { status: CheckStatus }) {
  if (status === "correct") {
    return (
      <Badge className="gap-1" variant="secondary">
        <CheckCircle2 className="h-3.5 w-3.5" /> Correct
      </Badge>
    );
  }
  if (status === "incorrect") {
    return (
      <Badge className="gap-1" variant="destructive">
        <XCircle className="h-3.5 w-3.5" /> Try again
      </Badge>
    );
  }
  return null;
}

export function SubstitutionTableExercise({
  table,
  details,
}: {
  table: SubstitutionTableDocumentRecord;
  details?: string;
}) {
  const [responses, setResponses] = useState<Record<number, Record<string, string>>>({});
  const [statuses, setStatuses] = useState<Record<number, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  const columns = table.columns.map((column, index) => ({
    ...column,
    label: column.label || `Column ${String.fromCharCode(65 + index)}`,
    choices: getColumnChoices(table, column.id),
  }));
  const fixedFirstColumn = getFixedFirstColumn(table, columns[0]?.choices ?? []);
  const firstColumnId = columns[0]?.id;
  const correctSentences = table.answers.map((answer) => getCorrectSentence(table, answer));
  const configuredAnswers = correctSentences.filter((sentence) => normalizeSentence(sentence));
  const statusList = table.answers.map((_, index) => statuses[index] || "idle");
  const overallStatus: CheckStatus =
    statusList.every((status) => status === "idle")
      ? "idle"
      : statusList.length > 0 && statusList.every((status) => status === "correct")
        ? "correct"
        : "incorrect";

  function checkAnswers() {
    const usedCorrectAnswers = new Set<number>();
    const next: Record<number, CheckStatus> = {};

    table.answers.forEach((_, responseIndex) => {
      const fixed = fixedFirstColumn?.[responseIndex];
      const selection = fixed && firstColumnId
        ? { ...responses[responseIndex], [firstColumnId]: fixed.id }
        : responses[responseIndex];
      const response = normalizeSentence(buildResponse(columns, selection));
      if (!response) {
        next[responseIndex] = "incorrect";
        return;
      }

      const matchIndex = correctSentences.findIndex((correctSentence, correctIndex) => {
        if (usedCorrectAnswers.has(correctIndex)) return false;
        return sentenceAlternatives(correctSentence).includes(response);
      });

      if (matchIndex >= 0) {
        usedCorrectAnswers.add(matchIndex);
        next[responseIndex] = "correct";
      } else {
        next[responseIndex] = "incorrect";
      }
    });

    setStatuses(next);
  }

  const paperMode = useModelPaperReview(() => {
    if (configuredAnswers.length) checkAnswers();
    setShowAnswers(true);
  });

  return (
    <Card className="rounded-xl">
      {!paperMode && <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Substitution Table</CardTitle>
          <ResultBadge status={overallStatus} />
        </div>
        <CardDescription>
          Make meaningful and grammatically correct sentences by combining suitable parts from the columns.
        </CardDescription>
      </CardHeader>}

      <CardContent className="space-y-3">
        {details && stripHtml(details) ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            {stripHtml(details)}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-muted/50">
                {table.columns.map((column, columnIndex) => (
                  <th key={column.id} scope="col" className="border-b border-r px-2 py-2 text-left text-sm font-semibold break-words last:border-r-0">
                    {column.label || `Column ${String.fromCharCode(65 + columnIndex)}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.id}>
                  {table.columns.map((column) => {
                    const cell = row.cells.find((item) => item.columnId === column.id);
                    return (
                      <td key={cell?.id || `${row.id}-${column.id}`} className="border-b border-r px-2 py-2 text-sm break-words last:border-r-0">
                        {cell?.text || ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {table.answers.length > 0 ? (
          <div className="space-y-3" data-slot="substitution-answer-grid">
            {table.answers.map((answer, index) => {
              const status = statuses[index] || "idle";
              return (
                <div key={answer.id} role="group" aria-label={`Sentence ${index + 1}`} className="space-y-1">
                  <div className="grid grid-cols-1 min-w-0 gap-2 sm:[grid-template-columns:var(--substitution-columns)]" style={{ "--substitution-columns": `repeat(${Math.max(1, columns.length)}, minmax(0, 1fr))` } as CSSProperties}>
                    {columns.map((column, columnIndex) => {
                      const fixed = columnIndex === 0 ? fixedFirstColumn?.[index] : undefined;
                      if (fixed) return (
                        <div
                          key={column.id}
                          className="flex min-h-11 min-w-0 items-center rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm [overflow-wrap:anywhere]"
                          aria-label={`Sentence ${index + 1}, ${column.label} (fixed)`}
                        >
                          {fixed.text}
                        </div>
                      );
                      return <TableCompletionChoiceCombobox
                        key={column.id}
                        value={responses[index]?.[column.id] || ""}
                        options={column.choices}
                        placeholder={column.label}
                        ariaLabel={`Sentence ${index + 1}, ${column.label}`}
                        wrapOptions
                        disabled={paperMode === "review"}
                        className={cn(
                          "h-11 min-w-0 w-full rounded-lg bg-background",
                          status === "correct" && "border-primary",
                          status === "incorrect" && "border-destructive",
                        )}
                        onChange={(value) => {
                          setResponses((current) => ({ ...current, [index]: { ...current[index], [column.id]: value } }));
                          setStatuses({});
                        }}
                      />;
                    })}
                  </div>
                  {status !== "idle" && <ResultBadge status={status} />}
                </div>
              );
            })}
            {!paperMode && <PracticeAnswerActions
              onCheck={checkAnswers}
              checkDisabled={configuredAnswers.length === 0}
              onPreview={() => setShowAnswers((current) => !current)}
              previewLabel={showAnswers ? "Hide Answer" : "Preview Answer"}
              onReset={() => { setResponses({}); setStatuses({}); setShowAnswers(false); }}
            />}

            {showAnswers ? (
              <div className="rounded-xl border border-dashed p-4">
                <div className="mb-3 text-sm font-semibold">Correct sentences</div>
                <ol className="space-y-2 pl-5 text-sm">
                  {correctSentences.map((sentence, index) => (
                    <li key={table.answers[index]?.id || index} className="list-decimal">
                      {sentence || "Answer not configured yet."}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No answer sentences have been configured for this substitution table yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
