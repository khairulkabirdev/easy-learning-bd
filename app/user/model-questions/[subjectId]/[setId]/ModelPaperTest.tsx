"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, Timer } from "lucide-react";
import { finishModelPaper } from "@/app/user/model-questions/actions";
import { StudentModelPaperQuestion } from "@/app/user/lessons/student-content";
import { ModelPaperMode } from "@/components/app/ModelPaperMode";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ModelPaper } from "@/lib/model-paper-types";

function formatElapsed(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  return [hours || null, Math.floor(seconds / 60) % 60, seconds % 60]
    .filter((value): value is number => value !== null).map(value => String(value).padStart(2, "0")).join(":");
}

export function ModelPaperTest({ promptPaper, entryKey }: { promptPaper: ModelPaper; entryKey: string }) {
  const [reviewPaper, setReviewPaper] = useState<ModelPaper | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reviewPaper) return;
    const startedAt = Date.now();
    const handle = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(handle);
  }, [reviewPaper]);

  useEffect(() => {
    if (reviewPaper) noticeRef.current?.focus();
  }, [reviewPaper]);

  async function submit() {
    if (busy || reviewPaper) return;
    setBusy(true);
    setError("");
    try {
      const result = await finishModelPaper(promptPaper.subjectId, promptPaper.id, entryKey);
      if (result.paper) setReviewPaper(result.paper);
      else setError(result.error || "Could not open the review. Try again.");
    } catch {
      setError("Could not open the review. Try again without leaving the page.");
    } finally {
      setBusy(false);
    }
  }

  const paper = reviewPaper ?? promptPaper;
  const questions = paper.entries.filter(entry => !entry.reference);
  const totalMarks = questions.every(entry => entry.marks !== null) ? questions.reduce((sum, entry) => sum + (entry.marks ?? 0), 0) : null;
  const blocks = paper.entries.flatMap(entry => entry.native ? [entry.native] : []);
  const sectionLabel = (entry: ModelPaper["entries"][number]) => entry.number === null ? entry.title : `${entry.number}. ${entry.title}`;

  return (
    <main className="mx-auto max-w-5xl space-y-5 pb-12">
      <Link href={`/user/model-questions/${paper.subjectId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft /> Back to papers</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 sm:px-5">
        <span className="inline-flex items-center gap-2 text-sm font-medium"><ClipboardList className="size-4 text-primary" aria-hidden /> {reviewPaper ? "Answer review" : "Practice test in progress"}</span>
        <span className="inline-flex items-center gap-2 text-sm tabular-nums text-muted-foreground"><Timer className="size-4" aria-hidden /> Elapsed {formatElapsed(elapsed)}</span>
      </div>

      {reviewPaper && <div ref={noticeRef} tabIndex={-1} className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div><h2 className="font-semibold">Practice test finished</h2><p className="text-sm text-muted-foreground">Review feedback and compare written responses with the answer key. This is practice, not a recorded grade.</p></div>
      </div>}

      <article className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <header className="border-b-4 border-double border-border px-4 pb-6 pt-8 text-center sm:px-10">
          <div className="text-xs font-semibold uppercase tracking-[.24em] text-muted-foreground">Model Question Paper</div>
          <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">{paper.name}</h1>
          <p className="mt-2 text-base font-semibold">{paper.subject} <span aria-hidden>·</span> {paper.className}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge variant="outline">{questions.length} question {questions.length === 1 ? "section" : "sections"}</Badge>
            {paper.board && <Badge variant="outline">{paper.board}</Badge>}
            {paper.year !== null && <Badge variant="outline">{paper.year}</Badge>}
            {totalMarks !== null && <Badge variant="outline">Full marks {totalMarks}</Badge>}
          </div>
        </header>
        <div className="px-3 py-5 sm:px-8">
          <p className="px-2 text-sm text-muted-foreground">Read the instructions and answer the questions in the spaces provided. Finish the test to see the published answers. Responses are kept in this tab for this attempt only.</p>
          <nav aria-label="Jump to paper section" className="mb-6 mt-4 flex flex-wrap gap-2 border-b pb-5">
            {paper.entries.map((entry, i) => (
              <a key={entry.id} href={`#paper-section-${i + 1}`} aria-label={sectionLabel(entry)} title={entry.title}
                className={buttonVariants({ variant: "outline", size: "sm" })}>{entry.number === null ? "Passage" : entry.number}</a>
            ))}
          </nav>
          <ModelPaperMode.Provider value={reviewPaper ? "review" : "attempt"}>
            <fieldset disabled={Boolean(reviewPaper) || busy} aria-label="Paper questions" className="min-w-0 space-y-7">
              {paper.entries.map((entry, i) => (
                <section key={entry.id} id={`paper-section-${i + 1}`} aria-labelledby={`paper-title-${i + 1}`} className="scroll-mt-24 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b px-1 pb-2">
                    <h2 id={`paper-title-${i + 1}`} className="font-serif text-lg font-bold sm:text-xl">{sectionLabel(entry)}</h2>
                    {entry.marks !== null && <Badge variant="secondary">{entry.marks} {entry.marks === 1 ? "mark" : "marks"}</Badge>}
                  </div>
                  <StudentModelPaperQuestion entry={entry} blocks={blocks} />
                </section>
              ))}
            </fieldset>
          </ModelPaperMode.Provider>
        </div>
      </article>

      {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
      {!reviewPaper ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">You can review your answers after finishing.</p>
        <AlertDialog>
          <AlertDialogTrigger render={<Button type="button" disabled={busy} />}>{busy ? "Opening review…" : "Finish test"}</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Finish this practice test?</AlertDialogTitle>
              <AlertDialogDescription>Finishing locks your responses and opens the answer review. Unanswered questions will stay blank.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Keep working</AlertDialogCancel>
              <AlertDialogAction onClick={() => void submit()}>Finish and review</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div> : <div className="flex justify-end">
        <Link href={`/user/model-questions/${paper.subjectId}`} className={buttonVariants()}>Choose another paper</Link>
      </div>}
    </main>
  );
}
