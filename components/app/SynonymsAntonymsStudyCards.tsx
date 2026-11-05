import { ArrowLeftRight, BookOpen, Check, ChevronDown, X } from "lucide-react";

import type { SynonymsAntonymsEntryRecord } from "@/app/admin/content/content-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";

function splitWords(value: string | null | undefined) {
  return (value ?? "")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Compact dictionary-style comparison cards shared by both student viewers. */
export function SynonymsAntonymsStudyCards({
  entries,
}: {
  entries: SynonymsAntonymsEntryRecord[];
}) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-border/70 bg-card py-0 shadow-sm ring-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 bg-muted/25 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
            <ArrowLeftRight aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
              Synonyms &amp; Antonyms
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs leading-relaxed sm:text-sm">
              A clearer way to study word meanings and opposites.
            </CardDescription>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-full px-2.5 py-1 text-xs tabular-nums">
          {entries.length} {entries.length === 1 ? "word" : "words"}
        </Badge>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No words have been added yet.
          </div>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry, index) => {
              const synonyms = splitWords(entry.synonyms);
              const antonyms = splitWords(entry.antonyms);

              return (
                <li
                  key={entry.id}
                  className="min-w-0 overflow-hidden rounded-xl border border-border/75 bg-background shadow-sm transition-colors hover:border-primary/25"
                >
                  <div className="grid min-w-0 gap-4 p-3.5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] sm:gap-0 sm:p-4">
                    <div className="flex min-w-0 items-start gap-3 sm:pr-4">
                      <span
                        aria-label={`Word ${index + 1}`}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold tabular-nums text-primary"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <h3 className="break-words text-base font-semibold leading-tight tracking-tight text-foreground">
                          {entry.word || "Untitled word"}
                        </h3>
                        {entry.meanings?.trim() ? (
                          <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">
                            <BookOpen aria-hidden="true" className="mr-1.5 inline size-3.5 align-[-2px] text-primary/70" />
                            <span className="font-medium text-foreground">Meaning:</span> {entry.meanings}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 gap-3 border-t border-border/60 pt-3 min-[460px]:grid-cols-2 min-[460px]:gap-4 sm:border-l sm:border-t-0 sm:py-0 sm:pl-4 sm:pt-0">
                      <section aria-label={`Synonyms of ${entry.word}`} className="min-w-0">
                        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                          <Check aria-hidden="true" className="size-3.5" /> Synonyms
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {synonyms.length > 0 ? (
                            synonyms.map((word, wordIndex) => (
                              <span
                                key={`${word}-${wordIndex}`}
                                className="max-w-full break-words rounded-md border border-emerald-200/70 bg-emerald-50/60 px-2.5 py-1 text-sm leading-5 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                              >
                                {word}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">Not provided</span>
                          )}
                        </div>
                      </section>

                      <section aria-label={`Antonyms of ${entry.word}`} className="min-w-0">
                        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                          <X aria-hidden="true" className="size-3.5" /> Antonyms
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {antonyms.length > 0 ? (
                            antonyms.map((word, wordIndex) => (
                              <span
                                key={`${word}-${wordIndex}`}
                                className="max-w-full break-words rounded-md border border-rose-200/70 bg-rose-50/60 px-2.5 py-1 text-sm leading-5 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
                              >
                                {word}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">Not provided</span>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>

                  {entry.details?.trim() ? (
                    <details className="group border-t border-border/60 bg-muted/10 px-3.5 py-2 sm:px-4">
                      <summary className="flex min-h-9 w-fit cursor-pointer list-none items-center gap-2 rounded-md px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                        <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
                        Study notes
                      </summary>
                      <div
                        className="mt-1 break-words rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(entry.details) }}
                      />
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
