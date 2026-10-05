"use client";

import { useState } from "react";
import { Flag, Heart } from "lucide-react";

import {
  StudentContentViewer,
  type StudentContentRecord,
} from "@/app/user/lessons/student-content";
import { cn } from "@/lib/utils";

export function FirstPaperChapterSetCard({
  content,
  title,
  setNumber,
}: {
  content: StudentContentRecord;
  title: string;
  setNumber: number;
}) {
  const [isFlagged, setIsFlagged] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl px-2">
      <div
        aria-label={`${title} set ${setNumber}`}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative shrink-0">
                <span className="poppins flex h-7 min-w-7 items-center justify-center rounded-lg bg-sky-100 px-1.5 text-xs font-bold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                  {String(setNumber).padStart(2, "0")}
                </span>
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
              </div>

              <div className="min-w-0">
                <div className="poppins truncate text-sm font-semibold text-sky-600 dark:text-sky-400">
                  {title}
                </div>
                <div className="poppins mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                  Set {String(setNumber).padStart(2, "0")}
                </div>
              </div>
            </div>

            <div className="inline-flex shrink-0 divide-x divide-gray-200 overflow-hidden rounded-full border border-gray-200 bg-gray-50 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
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
        </div>

        <div className="border-t border-gray-100 px-3 pb-4 pt-3 dark:border-gray-800 sm:px-4 sm:pb-5">
          <StudentContentViewer content={content} showHeader={false} />
        </div>
      </div>
    </div>
  );
}
