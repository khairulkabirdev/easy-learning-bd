"use client";

import { useState } from "react";
import { CheckCircle2, Eye, XCircle } from "lucide-react";

import type { SubstitutionTableDocumentRecord } from "@/app/admin/content/content-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  return <Badge variant="outline">Not checked</Badge>;
}

export function SubstitutionTableExercise({
  table,
  details,
}: {
  table: SubstitutionTableDocumentRecord;
  details?: string;
}) {
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [statuses, setStatuses] = useState<Record<number, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);

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
      const response = normalizeSentence(responses[responseIndex] || "");
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

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Substitution Table</CardTitle>
          <ResultBadge status={overallStatus} />
        </div>
        <CardDescription>
          Make meaningful and grammatically correct sentences by combining suitable parts from the columns.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {details && stripHtml(details) ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            {stripHtml(details)}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="bg-muted/50">
                {table.columns.map((column, columnIndex) => (
                  <th key={column.id} className="border-b border-r px-4 py-3 text-left text-sm font-semibold last:border-r-0">
                    {column.label || `Column ${String.fromCharCode(65 + columnIndex)}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.id}>
                  {table.columns.map((column, columnIndex) => {
                    const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                    return (
                      <td key={cell?.id || `${row.id}-${column.id}`} className="border-b border-r px-4 py-3 text-sm last:border-r-0">
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
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Make {table.answers.length} correct sentence{table.answers.length === 1 ? "" : "s"}</h3>
              <p className="text-sm text-muted-foreground">
                Type complete sentences from the table. You can enter the correct sentences in any order, and table parts may be reused where needed.
              </p>
            </div>

            <div className="space-y-3">
              {table.answers.map((answer, index) => {
                const status = statuses[index] || "idle";
                return (
                  <div
                    key={answer.id}
                    className={cn(
                      "rounded-xl border p-4",
                      status === "correct" && "border-emerald-500/50 bg-emerald-500/5",
                      status === "incorrect" && "border-destructive/50 bg-destructive/5",
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold">Sentence #{index + 1}</div>
                      <ResultBadge status={status} />
                    </div>
                    <Input
                      value={responses[index] || ""}
                      onChange={(event) => {
                        setResponses((current) => ({ ...current, [index]: event.target.value }));
                        setStatuses((current) => ({ ...current, [index]: "idle" }));
                      }}
                      placeholder="Write one complete sentence..."
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={checkAnswers} disabled={configuredAnswers.length === 0}>
                Check Answer
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAnswers((current) => !current)}>
                <Eye className="mr-2 h-4 w-4" />
                {showAnswers ? "Hide Answer" : "Review Answer"}
              </Button>
            </div>

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
