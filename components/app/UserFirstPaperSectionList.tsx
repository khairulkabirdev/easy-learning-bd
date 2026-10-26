import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type UserFirstPaperListRow = {
  id: string;
  title: string;
  meta?: string;
  secondaryMeta?: string;
  count?: number;
};

function hrefWithParams(basePath: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function UserFirstPaperSectionList({
  basePath,
  rows,
  total,
  page,
  totalPages,
  query,
  emptyMessage,
  recordParam = "recordId",
  preserve = {},
}: {
  basePath: string;
  rows: UserFirstPaperListRow[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
  emptyMessage: string;
  recordParam?: string;
  preserve?: Record<string, string | undefined>;
}) {
  const makeParams = () => {
    const params = new URLSearchParams();
    Object.entries(preserve).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (query) params.set("q", query);
    return params;
  };

  return (
    <div className="space-y-4">
      <form method="get" action={basePath} className="flex flex-col gap-2 sm:flex-row">
        {Object.entries(preserve).map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null,
        )}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Search title..." className="min-h-10 pl-9" />
        </div>
        <Button type="submit" variant="outline" className="min-h-10">Search</Button>
      </form>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{total} record{total === 1 ? "" : "s"}</span>
        <Badge variant="outline">Page {page} of {totalPages}</Badge>
      </div>

      {rows.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const params = makeParams();
            params.set(recordParam, row.id);
            params.set("page", String(page));
            return (
              <Link
                key={row.id}
                href={hrefWithParams(basePath, params)}
                className="group rounded-2xl border bg-background p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary">
                      <BookOpen className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-6">{row.title || "Untitled record"}</div>
                      {row.meta ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{row.meta}</div> : null}
                      {row.secondaryMeta ? <div className="text-xs leading-5 text-muted-foreground">{row.secondaryMeta}</div> : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    {typeof row.count === "number" ? <Badge variant="secondary">{row.count} blocks</Badge> : <span />}
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

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 pt-2">
          {page > 1 ? (
            (() => {
              const params = makeParams();
              params.set("page", String(page - 1));
              return (
                <Link href={hrefWithParams(basePath, params)} className={cn(buttonVariants({ variant: "outline" }), "min-h-10")}>
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Link>
              );
            })()
          ) : <span />}
          {page < totalPages ? (
            (() => {
              const params = makeParams();
              params.set("page", String(page + 1));
              return (
                <Link href={hrefWithParams(basePath, params)} className={cn(buttonVariants({ variant: "outline" }), "min-h-10")}>
                  Next <ArrowRight className="h-4 w-4" />
                </Link>
              );
            })()
          ) : <span />}
        </div>
      ) : null}
    </div>
  );
}
