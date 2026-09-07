"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

type LessonTile = {
  id: string;
  title: string;
  lessonNumber: string;
};

type LessonTileGridProps = {
  lessons: LessonTile[];
  hrefBase: string;
};

export function LessonTileGrid({ lessons, hrefBase }: LessonTileGridProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers = lessons.map((_, index) =>
      window.setTimeout(() => {
        setVisibleCount((current) => Math.max(current, index + 1));
      }, (index + 1) * 120),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [lessons]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {lessons.map((lesson, index) => {
        const visible = index < visibleCount;

        return (
          <Link
            key={lesson.id}
            href={`${hrefBase}/${lesson.id}`}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 sm:gap-4 sm:p-4",
              "dark:hover:border-primary/50 dark:hover:shadow-primary/20",
            )}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 320ms ease, transform 320ms ease",
              transitionDelay: `${(index + 1) * 120}ms`,
            }}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {lesson.lessonNumber ? `${lesson.lessonNumber} · ${lesson.title}` : lesson.title}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary/70 transition-transform group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </div>
  );
}
