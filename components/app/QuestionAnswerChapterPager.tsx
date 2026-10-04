"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Flag,
  Heart,
  LoaderCircle,
} from "lucide-react";

import type { QuestionAnswerRowRecord } from "@/app/admin/content/content-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QUESTIONS_PER_PAGE = 10;

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function RichContent({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  if (!stripHtml(value)) return null;

  return (
    <div
      className={cn(
        "overflow-x-auto text-sm leading-7",
        "[&_a]:text-sky-600 [&_a]:underline dark:[&_a]:text-sky-400",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic dark:[&_blockquote]:border-gray-700",
        "[&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-3 [&_p:last-child]:mb-0",
        "[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 dark:[&_td]:border-gray-700",
        "[&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:p-2 dark:[&_th]:border-gray-700 dark:[&_th]:bg-gray-800",
        "[&_ul]:list-disc [&_ul]:space-y-1",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}

function alphaLabel(index: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return alphabet[index] || String(index + 1);
}

export function QuestionAnswerChapterPager({
  title,
  passage,
  rows,
}: {
  title: string;
  passage: string;
  rows: QuestionAnswerRowRecord[];
}) {
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isFlagged, setIsFlagged] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const pageCount = Math.ceil(rows.length / QUESTIONS_PER_PAGE);
  const start = page * QUESTIONS_PER_PAGE;
  const visibleRows = useMemo(
    () => rows.slice(start, start + QUESTIONS_PER_PAGE),
    [rows, start],
  );

  useEffect(() => {
    if (!isLoading) return;

    const timer = window.setTimeout(() => setIsLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    setExpandedQuestionIds(new Set());
  }, [page]);

  function goToPage(nextPage: number) {
    setIsLoading(true);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (isLoading) {
    return (
      <div className="mx-auto mt-5 flex min-h-48 max-w-3xl items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <LoaderCircle className="h-5 w-5 animate-spin text-sky-600 dark:text-sky-400" />
          প্রশ্ন লোড হচ্ছে...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-5 min-h-screen max-w-3xl px-2 pb-6">
      <div
        aria-label={title || "Question Answer"}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="px-4 pb-3 pt-4 sm:px-5 sm:pb-3 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative shrink-0">
                <span className="poppins flex h-7 min-w-7 items-center justify-center rounded-lg bg-sky-100 px-1.5 text-xs font-bold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                  {String(page + 1).padStart(2, "0")}
                </span>
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
              </div>

              <span className="poppins truncate text-sm font-semibold text-sky-600 dark:text-sky-400">
                Question {String(page + 1).padStart(2, "0")}
              </span>
            </div>

            <div className="inline-flex shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50 divide-x divide-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:divide-gray-700">
              <button
                type="button"
                onClick={() => setIsFlagged((current) => !current)}
                className={cn(
                  "flex h-8 items-center gap-1.5 px-2.5 text-xs font-medium transition-all",
                  isFlagged
                    ? "bg-sky-50 text-sky-600 dark:bg-sky-900/25 dark:text-sky-400"
                    : "text-gray-500 hover:bg-sky-50 hover:text-sky-600 dark:text-gray-400 dark:hover:bg-sky-900/20 dark:hover:text-sky-400",
                )}
                title="Flag"
                aria-pressed={isFlagged}
              >
                <Flag className={cn("h-4 w-4", isFlagged && "fill-current")} />
                <span className="poppins hidden sm:inline">Flag</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFavorite((current) => !current)}
                className={cn(
                  "flex h-8 items-center gap-1.5 px-2.5 text-xs font-medium transition-all",
                  isFavorite
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-900/25 dark:text-rose-400"
                    : "text-gray-500 hover:bg-rose-50 hover:text-rose-600 dark:text-gray-400 dark:hover:bg-rose-900/20 dark:hover:text-rose-400",
                )}
                title="Fav"
                aria-pressed={isFavorite}
              >
                <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                <span className="poppins hidden sm:inline">Fav</span>
              </button>
            </div>
          </div>

          {stripHtml(passage) ? (
            <div className="mt-3">
              <RichContent
                value={passage}
                className={cn(
                  "noto text-sm  leading-relaxed text-gray-800 dark:text-gray-200 sm:text-base",
                  "[&_p]:text-justify",
                  "[&_img]:rounded [&_img]:bg-white [&_img]:p-1",
                  "[&_*]:!text-inherit",
                )}
              />
            </div>
          ) : null}
        </div>

        <div className="grid gap-1.5 px-4 pb-4 sm:px-5 sm:pb-5">
          {visibleRows.length ? (
            visibleRows.map((row, index) => {
              const isOpen = expandedQuestionIds.has(row.id);
              const questionNumber = start + index;

              return (
                <div
                  key={row.id}
                  className={cn(
                    "overflow-hidden rounded-lg border transition-all duration-200",
                    isOpen
                      ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/25"
                      : "border-gray-200 bg-gray-50 hover:border-sky-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-sky-600",
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setExpandedQuestionIds((current) => {
                        const next = new Set(current);
                        if (next.has(row.id)) {
                          next.delete(row.id);
                        } else {
                          next.add(row.id);
                        }
                        return next;
                      })
                    }
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
                  >
                    <span
                      className={cn(
                        "poppins mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all duration-200",
                        isOpen
                          ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-500"
                          : "border-gray-300 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400",
                      )}
                    >
                      {alphaLabel(questionNumber)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <RichContent
                        value={row.question}
                        className={cn(
                          "noto text-sm font-medium leading-6 sm:text-[15px] sm:leading-7",
                          isOpen
                            ? "text-gray-900 dark:text-gray-100"
                            : "text-gray-700 dark:text-gray-300",
                          "[&_img]:rounded [&_img]:bg-white [&_img]:p-1",
                          "[&_*]:!text-inherit",
                        )}
                      />
                    </div>

                    <ChevronDown
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500",
                        isOpen && "rotate-180 text-emerald-600 dark:text-emerald-400",
                      )}
                    />
                  </button>

                  {isOpen ? (
                    <div className="mx-3 mb-3 rounded-lg border border-emerald-200 bg-white px-3 py-3 dark:border-emerald-900/70 dark:bg-gray-900">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 fill-emerald-100 dark:fill-emerald-950" />
                        <span className="noto">Ans</span>
                      </div>

                      <RichContent
                        value={row.answer}
                        className={cn(
                          "noto text-sm leading-7 text-gray-800 dark:text-gray-200 sm:text-[15px]",
                          "[&_img]:rounded [&_img]:bg-white [&_img]:p-1",
                          "[&_*]:!text-inherit",
                        )}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              এই Question Answer ব্লকে এখনো কোনো প্রশ্ন যোগ করা হয়নি।
            </div>
          )}
        </div>
      </div>

      {pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <Button
            type="button"
            variant="outline"
            disabled={page === 0 || isLoading}
            onClick={() => goToPage(page - 1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            আগের ১০টি
          </Button>

          <Badge variant="outline" className="font-normal">
            {page + 1} / {pageCount}
          </Badge>

          <Button
            type="button"
            disabled={page === pageCount - 1 || isLoading}
            onClick={() => goToPage(page + 1)}
          >
            পরের ১০টি
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
