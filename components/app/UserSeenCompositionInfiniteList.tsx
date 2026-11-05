"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Loader2, Search } from "lucide-react";

import { loadSeenCompositionPageAction } from "@/app/user/chapter-preparation/seen-composition/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type SeenCompositionInfiniteRow = {
  id: string;
  title: string;
  createdAt: string;
  unit: { id: string; title: string };
  lesson: { id: string; title: string };
  topic: { id: string; title: string } | null;
  blocksCount: number;
};

function stripSeenPassagePrefix(title: string | null | undefined) {
  const value = title?.trim() || "";
  return value.replace(/^Seen\s+Passage\s+[12]\s*[—–-]\s*/i, "").trim();
}

function hrefWithParams(basePath: string, values: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function UserSeenCompositionInfiniteList({
  basePath,
  subjectId,
  passage,
  unitId,
  lessonId,
  query,
  initialRows,
  total,
  initialPage,
  totalPages,
  emptyMessage,
}: {
  basePath: string;
  subjectId: string;
  passage: "1" | "2";
  unitId: string;
  lessonId: string;
  query: string;
  initialRows: SeenCompositionInfiniteRow[];
  total: number;
  initialPage: number;
  totalPages: number;
  emptyMessage: string;
}) {
  const resetKey = `${subjectId}:${passage}:${unitId}:${lessonId}:${query}`;
  const [rows, setRows] = useState(initialRows);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [knownTotalPages, setKnownTotalPages] = useState(totalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setRows(initialRows);
    setCurrentPage(initialPage);
    setKnownTotalPages(totalPages);
    setIsLoading(false);
    setLoadError("");
    loadingRef.current = false;
  }, [resetKey, initialRows, initialPage, totalPages]);

  const hasMore = currentPage < knownTotalPages;

  const loadNextPage = useCallback(async () => {
    if (!hasMore || loadingRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);
    setLoadError("");

    try {
      const nextPage = currentPage + 1;
      const result = await loadSeenCompositionPageAction({
        subjectId,
        passage,
        unitId,
        lessonId,
        query,
        page: nextPage,
        pageSize: 10,
      });

      setRows((existing) => {
        const seen = new Set(existing.map((row) => row.id));
        return [...existing, ...result.rows.filter((row) => !seen.has(row.id))];
      });
      setCurrentPage(result.page);
      setKnownTotalPages(result.totalPages);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load more content.");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [currentPage, hasMore, lessonId, passage, query, subjectId, unitId]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadError) void loadNextPage();
      },
      { rootMargin: "500px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadError, loadNextPage]);

  return (
    <div className="space-y-4">
      <form method="get" action={basePath} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="passage" value={passage} />
        <input type="hidden" name="unitId" value={unitId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Search title..." className="min-h-10 pl-9" />
        </div>
        <Button type="submit" variant="outline" className="min-h-10">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{total} record{total === 1 ? "" : "s"}</span>
        {total > 0 ? (
          <Badge variant="outline">
            {Math.min(rows.length, total)} of {total} loaded
          </Badge>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const title = stripSeenPassagePrefix(row.title) || `Untitled Passage ${passage}`;
            const href = hrefWithParams(basePath, {
              passage,
              unitId,
              lessonId,
              q: query,
              contentId: row.id,
            });

            return (
              <Link
                key={row.id}
                href={href}
                className="group rounded-2xl border bg-background p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary">
                      <BookOpen className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-6">{title}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        {row.unit.title} · {row.lesson.title}
                      </div>
                      <div className="text-xs leading-5 text-muted-foreground">
                        {row.topic?.title || `Passage ${passage}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary">{row.blocksCount} blocks</Badge>
                    <ArrowRight className="h-4 w-4 text-primary/70 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">{emptyMessage}</CardContent>
        </Card>
      )}

      {hasMore ? (
        <div ref={sentinelRef} className="flex min-h-20 items-center justify-center py-4" aria-live="polite">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading more content…
            </div>
          ) : loadError ? (
            <Button type="button" variant="outline" className="min-h-10" onClick={() => void loadNextPage()}>
              Retry loading
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Scroll to load more</span>
          )}
        </div>
      ) : rows.length > 0 ? (
        <div className="py-3 text-center text-xs text-muted-foreground">All {total} records loaded</div>
      ) : null}

      {loadError && hasMore ? (
        <p className="text-center text-xs text-destructive" role="alert">{loadError}</p>
      ) : null}
    </div>
  );
}
