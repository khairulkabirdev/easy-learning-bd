"use client";

import { useMemo, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  Eye,
  Flag,
  Heart,
  RotateCcw,
} from "lucide-react";

import { parseQuestionAnswerDocument } from "@/app/admin/content/subject-section-blocks/types";
import { Button } from "@/components/ui/button";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";

type PoemRecord = {
  id: string;
  instruction?: string;
  details?: string;
  documentJson: string;
};

function RichText({ value, className = "" }: { value?: string; className?: string }) {
  if (!value?.trim()) return null;
  return (
    <div
      className={`prose prose-sm min-w-0 max-w-none break-words leading-7 dark:prose-invert [&_p]:my-0 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }}
    />
  );
}

/**
 * Uses the same compact question/answer accordion layout as Short-answer Questions.
 * Answers are only shown when a question is opened or Preview All is selected.
 */
export function UserPoemQuestionsViewer({
  record,
  kind = "poems",
}: {
  record: PoemRecord;
  kind?: "poems" | "story";
}) {
  const document = useMemo(
    () => parseQuestionAnswerDocument(record.documentJson, record.id),
    [record.documentJson, record.id],
  );
  const rows = useMemo(
    () =>
      [...document.rows]
        .filter((row) => {
          // Legacy story records can contain placeholder rows with no question.
          // Don't render empty cards; keep image-only questions if present.
          const html = row.question?.trim() || "";
          return /<(img|video|audio)\b/i.test(html) ||
            html.replace(/<[^>]*>/g, "").replace(/&(?:nbsp|#160);/gi, " ").trim().length > 0;
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [document.rows],
  );

  const [openedIds, setOpenedIds] = useState<Record<string, boolean>>({});
  const [flaggedIds, setFlaggedIds] = useState<Record<string, boolean>>({});
  const [favouriteIds, setFavouriteIds] = useState<Record<string, boolean>>({});
  const allOpen = rows.length > 0 && rows.every((row) => openedIds[row.id]);

  function toggleQuestion(id: string) {
    setOpenedIds((current) => {
      const onlyThisQuestionOpen =
        Boolean(current[id]) && Object.values(current).filter(Boolean).length === 1;

      // Opening a question closes every other question. Clicking the sole
      // open question closes it; after Preview All, clicking one focuses it.
      return onlyThisQuestionOpen ? {} : { [id]: true };
    });
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
            <BookOpenText className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {kind === "story" ? "Question from Story" : "Question from Poems"}
            </h2>
            <p className="text-sm leading-5 text-muted-foreground">
              Tap a question to view its answer.
            </p>
          </div>
        </div>
        <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-xs tabular-nums text-muted-foreground">
          {rows.length} {rows.length === 1 ? "question" : "questions"}
        </span>
      </div>

      {record.instruction?.trim() || record.details?.trim() ? (
        <div className="space-y-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-3 text-sm sm:px-4">
          <RichText value={record.instruction} className="text-muted-foreground" />
          <RichText value={record.details} />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No {kind === "story" ? "story" : "poem"} questions are available in this practice set.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => {
            const open = Boolean(openedIds[row.id]);
            const answerId = `question-answer-${record.id}-${row.id}`;
            return (
              <article
                key={row.id}
                className={`overflow-hidden rounded-xl border transition-colors ${
                  open
                    ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/25"
                    : "border-border/80 bg-muted/45 hover:border-primary/30 hover:bg-muted/60 dark:bg-muted/25 dark:hover:bg-muted/40"
                }`}
              >
                <div className="flex min-w-0 items-stretch">
                  <button
                    type="button"
                    className="group flex min-h-14 min-w-0 flex-1 touch-manipulation items-start gap-3 px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4 sm:py-3.5"
                    aria-expanded={open}
                    aria-controls={answerId}
                    onClick={() => toggleQuestion(row.id)}
                  >
                    <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-[11px] font-bold tabular-nums text-muted-foreground group-hover:border-emerald-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      {String(index + 1).padStart(2, "0")}
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <RichText
                        value={row.question}
                        className="text-sm font-medium leading-6 text-foreground sm:text-[15px] sm:leading-6 [&_p]:leading-6"
                      />
                    </div>
                  </button>

                  <div className="flex shrink-0 items-start gap-0.5 pr-2 pt-2.5 sm:pr-3 sm:pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={flaggedIds[row.id] ? "Unmark question" : "Mark question for review"}
                      aria-pressed={Boolean(flaggedIds[row.id])}
                      onClick={() => setFlaggedIds((current) => ({ ...current, [row.id]: !current[row.id] }))}
                      className={`h-9 w-9 rounded-full text-muted-foreground ${flaggedIds[row.id] ? "text-amber-600" : ""}`}
                    >
                      <Flag className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={favouriteIds[row.id] ? "Remove from favourites" : "Add to favourites"}
                      aria-pressed={Boolean(favouriteIds[row.id])}
                      onClick={() => setFavouriteIds((current) => ({ ...current, [row.id]: !current[row.id] }))}
                      className={`h-9 w-9 rounded-full text-muted-foreground ${favouriteIds[row.id] ? "text-rose-500" : ""}`}
                    >
                      <Heart className={`h-4 w-4 ${favouriteIds[row.id] ? "fill-current" : ""}`} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={open ? "Hide answer" : "Show answer"}
                      aria-expanded={open}
                      aria-controls={answerId}
                      onClick={() => toggleQuestion(row.id)}
                      className="h-9 w-9 rounded-full text-muted-foreground"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {open ? (
                  <div id={answerId} className="px-3 pb-3 sm:px-4 sm:pb-4">
                    <div className="rounded-xl border border-emerald-200 bg-background/90 px-3 py-3 shadow-sm dark:border-emerald-900 dark:bg-background/80 sm:px-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        Model answer
                      </div>
                      {row.answer?.trim() ? (
                        <RichText value={row.answer} className="text-sm leading-6 text-foreground sm:text-[15px] sm:leading-7" />
                      ) : (
                        <p className="text-sm text-muted-foreground">No model answer has been added yet.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-10"
            onClick={() =>
              setOpenedIds(allOpen ? {} : Object.fromEntries(rows.map((row) => [row.id, true])))
            }
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {allOpen ? "Hide All Answers" : "Preview All Answers"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-10"
            onClick={() => setOpenedIds({})}
            disabled={!Object.values(openedIds).some(Boolean)}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset Answers
          </Button>
        </div>
      ) : null}
    </section>
  );
}
