"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, FileText, Printer, Timer } from "lucide-react";
import { finishModelPaper } from "@/app/user/model-questions/actions";
import { StudentModelPaperQuestion, modelSynonymsAntonymsItemLabel, modelSynonymsAntonymsPrompt } from "@/app/user/lessons/student-content";
import { ModelPaperMode } from "@/components/app/ModelPaperMode";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ModelPaper, ModelPaperEntry } from "@/lib/model-paper-types";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import styles from "./ModelPaperTest.module.css";

type PaperView = "online" | "paper";

function formatElapsed(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  return [hours || null, Math.floor(seconds / 60) % 60, seconds % 60]
    .filter((value): value is number => value !== null)
    .map(value => String(value).padStart(2, "0"))
    .join(":");
}

/** Printed numbering excludes source passages, unlike the fixed editor block slots. */
function printedNumbers(entries: ModelPaperEntry[]) {
  let value = 0;
  return entries.map(entry => entry.reference ? null : ++value);
}

/** Passage headings come from the editor's saved Title, not inferred question numbers. */
function passageInstruction(entry: ModelPaperEntry): string {
  const title = entry.title?.trim();
  if (title) return title;
  return entry.native?.kind === "paragraph" ? "Unseen Passage" : "Read the passage";
}

/** Use the original question instruction where present, without duplicating a number or marks. */
function printedHeading(entry: ModelPaperEntry) {
  const block = entry.native;
  const raw = block?.mcqSection?.title || block?.questionAnswerExercise?.title ||
    block?.trueFalseExercise?.title || entry.title;
  return (raw || entry.title)
    .replace(/^\s*\d+\s*[.)]\s*/, "")
    .replace(/\s*[—-]\s*\d+\s*marks?\s*$/i, "")
    .trim();
}

function printedMark(entry: ModelPaperEntry) {
  if (entry.marks === null) return null;
  const pattern = entry.markPattern?.match(/(\d+)\s*[×xX*]\s*(\d+)\s*=\s*(\d+)/);
  if (pattern && Number(pattern[3]) === entry.marks) {
    if (Number(pattern[1]) === 1 && Number(pattern[2]) > 1) return String(entry.marks);
    return `${pattern[2]}×${pattern[1]}=${entry.marks}`;
  }
  return String(entry.marks);
}

function examIdentity(paper: ModelPaper) {
  const original = paper.id === "cmwswbveu0001teywn4syogfn" ||
    (/annual model test\s*3/i.test(paper.name) && /exam\s*(?:no\.?\s*)?22/i.test(paper.name));
  return original ? {
    banner: "CADET ENGLISH WITH ANAMUL SIR",
    title: "Exam No. 22 - Annual Model Test 3 - 2026 (06/11/2026)",
    className: "Six (Academic & Cadet Batch)",
    time: "1 hour 30 Minutes",
  } : {
    banner: null,
    title: paper.name,
    className: paper.className,
    time: null,
  };
}

/** Convert rich text to a stable identity so the same source is printed only once. */
function passageKey(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|#160);|\u00a0/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type PassageRecord = {
  passage?: string | null;
  passageSource?: string | null;
  paragraphBlockId?: string | null;
  resolvedPassage?: string | null;
};

function blockPassageBody(block: NonNullable<ModelPaperEntry["native"]>): string {
  return block.seenPassageOne?.body || block.seenPassageTwo?.body || block.paragraph?.body || "";
}

/** Uses the actual paragraph linkage first, falling back to a stored passage. */
function passageForEntry(entry: ModelPaperEntry, blocks: NonNullable<ModelPaperEntry["native"]>[]): string {
  if (!entry.native) return entry.imported?.passage || "";
  if (entry.reference) return blockPassageBody(entry.native);
  const native = entry.native;
  const record = (native.mcqSection || native.synonymsAntonyms || native.gapFillFirstPaper ||
    native.informationTransfer || native.vocabulary || native.trueFalseExercise || native.gapFill ||
    native.questionAnswerExercise) as PassageRecord | null | undefined;
  if (!record) return "";
  if (typeof record.resolvedPassage === "string" && record.resolvedPassage.trim()) return record.resolvedPassage;
  if (record.paragraphBlockId) {
    const source = blocks.find(block => block.id === record.paragraphBlockId);
    const sourceBody = source && blockPassageBody(source);
    if (sourceBody) return sourceBody;
  }
  return record.passage || "";
}

/** Plan every source in paper order; matching paragraphs never print twice. */
function planPassages(entries: ModelPaperEntry[], blocks: NonNullable<ModelPaperEntry["native"]>[]) {
  const seen = new Set<string>();
  return entries.map(entry => {
    const body = passageForEntry(entry, blocks);
    const key = passageKey(body);
    const hasSource = Boolean(key);
    const first = hasSource && !seen.has(key);
    if (first) seen.add(key);
    return {
      body: first ? body : "",
      first,
      hasSource,
      skipReference: Boolean(entry.reference && hasSource && !first),
    };
  });
}

/** Question-paper view is read-only and does not include correct answers. */
function PaperHtml({ value }: { value: string }) {
  if (!value?.trim()) return null;
  return <div className={styles.printedRichText} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }} />;
}

function PrintedQuestion({ entry, blocks }: { entry: ModelPaperEntry; blocks: ModelPaper["entries"][number]["native"][] }) {
  const native = entry.native;
  if (!native) {
    if (entry.imported) return <PaperHtml value={entry.imported.question} />;
    return null;
  }
  if (native.kind === "seen-passage-one" || native.kind === "seen-passage-two" || native.kind === "paragraph") {
    return <PaperHtml value={native.seenPassageOne?.body || native.seenPassageTwo?.body || native.paragraph?.body || ""} />;
  }
  if (native.kind === "mcq" && native.mcqSection) {
    return <ol className={styles.printedQuestions}>
      {native.mcqSection.questions.map((question, i) => (
        <li key={question.id}>
          <span className={styles.itemLabel}>({String.fromCharCode(97 + i)})</span>
          <div><PaperHtml value={question.prompt} />
            <div className={styles.printedOptions}>{question.options.map((option, k) => (
              <span key={option.id}>({["i", "ii", "iii", "iv", "v", "vi"][k] || k + 1}) {option.text}</span>
            ))}</div>
          </div>
        </li>
      ))}
    </ol>;
  }
  if (native.kind === "synonyms-antonyms" && native.synonymsAntonyms) {
    return <div className={styles.printedInlineRows}>
      {native.synonymsAntonyms.entries.filter(row => row.word.trim()).map((row, i) => (
        <span key={row.id}>{modelSynonymsAntonymsItemLabel(i)} {modelSynonymsAntonymsPrompt(row)}</span>
      ))}
    </div>;
  }
  if (native.kind === "true-false" && native.trueFalseExercise) {
    return <ol className={styles.printedQuestions}>
      {native.trueFalseExercise.rows.map((row, i) => <li key={row.id}>
        <span className={styles.itemLabel}>({["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"][i] || i + 1})</span>
        <PaperHtml value={row.statement} />
      </li>)}
    </ol>;
  }
  if ((native.kind === "table-completion" || native.kind === "column-matching") && native.questionAnswerExercise?.table) {
    const table = native.questionAnswerExercise.table;
    const alternatives = native.questionAnswerExercise.question
      .replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "")
      .split("\n").map(value => value.trim())
      .filter(value => /^\((?:i|ii|iii|iv|v|vi)\)\s/i.test(value));
    const hasMatchingChoices = alternatives.length === table.rows.length && table.columns.length === 2;
    return <>
      <table className={styles.printedTable}>
        <thead><tr>{table.columns.map((column, col) => <th key={column.id}>
          {hasMatchingChoices ? (col === 0 ? "A" : "B") : column.label}
        </th>)}</tr></thead>
        <tbody>{table.rows.map((row, rowIndex) => <tr key={row.id}>{row.cells.map((cell, colIndex) => <td key={cell.id}>
          {cell.mode === "answer" ? (hasMatchingChoices && colIndex === 1 ? alternatives[rowIndex] : "........................................") : cell.text}
        </td>)}</tr>)}</tbody>
      </table>
      {!hasMatchingChoices && native.questionAnswerExercise.question ? <PaperHtml value={native.questionAnswerExercise.question} /> : null}
    </>;
  }
  if (native.kind === "rearrange-sentence" && native.questionAnswerExercise?.rows.length) {
    return <ol className={styles.printedQuestions}>
      {native.questionAnswerExercise.rows.map((row, i) => <li key={row.id}>
        <span className={styles.itemLabel}>({String.fromCharCode(97 + i)})</span>
        <PaperHtml value={row.question} />
      </li>)}
    </ol>;
  }
  const writing = native.questionAnswerExercise;
  if (writing?.rows.length && ["question-answer", "question-from-poems", "question-from-story", "writing-summary"].includes(native.kind)) {
    return <ol className={styles.printedQuestions}>
      {writing.rows.map((row, i) => <li key={row.id}>
        <span className={styles.itemLabel}>({String.fromCharCode(97 + i)})</span>
        <PaperHtml value={row.question} />
      </li>)}
    </ol>;
  }
  if (native.kind === "gap-fill-first-paper" && native.gapFillFirstPaper) return <PaperHtml value={native.gapFillFirstPaper.question} />;
  if (native.kind === "information-transfer" && native.informationTransfer) return <PaperHtml value={native.informationTransfer.question} />;
  // Unknown or newly introduced kinds retain the real existing component.
  return <StudentModelPaperQuestion entry={entry} blocks={blocks.filter((block): block is NonNullable<typeof block> => Boolean(block))} />;
}

/** Hide only the duplicated fixed sample instruction, not a teacher's custom text. */
function modelPaperShortAnswerInstruction(entry: ModelPaperEntry) {
  const text = entry.shortDescription?.trim() || "";
  if (entry.native?.kind !== "question-answer") return text;
  return text.replace(/Answer\s+all\s+five\s+questions\.\s*2\s*[×xX*]\s*5\s*=\s*10\.?/gi, "").trim();
}

export function ModelPaperTest({ promptPaper, entryKey }: { promptPaper: ModelPaper; entryKey: string }) {
  const [reviewPaper, setReviewPaper] = useState<ModelPaper | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<PaperView>("online");
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
    if (busy || reviewPaper || view === "paper") return;
    setBusy(true);
    setError("");
    try {
      const result = await finishModelPaper(promptPaper.subjectId, promptPaper.id, entryKey);
      if (result.paper) {
        setReviewPaper(result.paper);
        setView("online");
      } else setError(result.error || "Could not open the review. Try again.");
    } catch {
      setError("Could not open the review. Try again without leaving the page.");
    } finally {
      setBusy(false);
    }
  }

  const paper = reviewPaper ?? promptPaper;
  const questions = paper.entries.filter(entry => !entry.reference);
  const allMarksKnown = questions.every(entry => entry.marks !== null);
  const markedSections = questions.filter(entry => entry.marks !== null);
  const totalMarks = markedSections.length
    ? markedSections.reduce((sum, entry) => sum + (entry.marks ?? 0), 0)
    : null;
  const blocks = paper.entries.flatMap(entry => entry.native ? [entry.native] : []);
  const numbers = printedNumbers(paper.entries);
  const passagePlan = planPassages(paper.entries, blocks);
  const identity = examIdentity(paper);
  const paperView = view === "paper";

  return (
    <main className={styles.workspace}>
      <div className={styles.toolbar} data-print-hide="true">
        <Link href={`/user/model-questions/${paper.subjectId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" aria-hidden /> Back to papers
        </Link>
        <div className={styles.toolbarControls}>
          <div className={styles.modeSwitch} role="group" aria-label="Paper display mode">
            <button type="button" onClick={() => setView("online")} aria-pressed={!paperView}
              className={!paperView ? styles.modeActive : styles.modeButton}>
              <ClipboardList className="size-4" aria-hidden /> Online Test
            </button>
            <button type="button" onClick={() => setView("paper")} disabled={Boolean(reviewPaper)}
              aria-pressed={paperView} className={paperView ? styles.modeActive : styles.modeButton}>
              <FileText className="size-4" aria-hidden /> Question Paper
            </button>
          </div>
          {paperView && !reviewPaper ? (
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden /> Print / Save PDF
            </Button>
          ) : (
            <span className={styles.timer}><Timer className="size-4" aria-hidden /> {formatElapsed(elapsed)}</span>
          )}
        </div>
      </div>

      {reviewPaper && (
        <div ref={noticeRef} tabIndex={-1} className={styles.reviewNotice} data-print-hide="true">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <h2 className="font-semibold">Practice test finished — answer review</h2>
            <p className="text-sm">Compare your responses with the answer key. This is practice, not a recorded grade.</p>
          </div>
        </div>
      )}

      <article className={styles.paperSheet} aria-label="Model question paper" data-exam-sheet="true" data-paper-mode={view}>
        <header className={styles.examHeader}>
          {identity.banner && <h1 className={styles.institutionName}>{identity.banner}</h1>}
          <h2 className={styles.examTitle}>{identity.title}</h2>
          <h3 className={styles.examClass}>Class: {identity.className}</h3>
          <div className={styles.examMeta}>
            <span>Full Marks : {totalMarks !== null ? totalMarks : "—"}{!allMarksKnown && totalMarks !== null ? " (partial)" : ""}</span>
            <span>Subject: {paper.subject}</span>
            {identity.time && <span>Time: {identity.time}</span>}
          </div>
        </header>

        <ModelPaperMode.Provider value={reviewPaper ? "review" : "attempt"}>
          <fieldset disabled={Boolean(reviewPaper) || busy || paperView} aria-label="Paper questions"
            className={styles.paperQuestions}>
            {paper.entries.map((entry, i) => {
              const isPassage = Boolean(entry.reference);
              const number = numbers[i];
              const source = passagePlan[i];
              if (source.skipReference) return null;
              return (
                <section key={entry.id} id={`paper-section-${i + 1}`}
                  aria-label={isPassage ? entry.title : `Question ${number}`}
                  className={isPassage ? styles.passageSection : styles.questionSection}
                  data-paper-kind={entry.native?.kind || "legacy"}
                  data-linked-passage={!isPassage && paper.entries.slice(0, i).some(previous => previous.reference) ? "true" : "false"}>
                  {isPassage ? (
                    <p className={styles.passagePrompt}>{passageInstruction(entry)}</p>
                  ) : (
                    <>
                      {source.first && source.body ? (
                        <div className={styles.inlinePassage} aria-label="Reading passage">
                          <PaperHtml value={source.body} />
                        </div>
                      ) : null}
                      <div className={styles.questionHeading}>
                        <h3 className={styles.questionLabel}><span className={styles.questionNumber}>{number}.</span>
                          <span>{printedHeading(entry)}</span>
                        </h3>
                        {printedMark(entry) && <strong className={styles.questionMarks}>{printedMark(entry)}</strong>}
                      </div>
                    </>
                  )}
                  {!isPassage && modelPaperShortAnswerInstruction(entry) ? (
                    <p className={styles.shortInstruction}>{modelPaperShortAnswerInstruction(entry)}</p>
                  ) : null}
                  <div className={styles.questionBody}>
                    {isPassage ? (
                      <PaperHtml value={source.body} />
                    ) : paperView ? (
                      <PrintedQuestion entry={entry} blocks={blocks} />
                    ) : (
                      <StudentModelPaperQuestion entry={entry} blocks={blocks} hidePassage={source.hasSource} />
                    )}
                  </div>
                </section>
              );
            })}
          </fieldset>
        </ModelPaperMode.Provider>
      </article>

      {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive" data-print-hide="true">{error}</p>}
      {!reviewPaper && !paperView ? (
        <div className={styles.finishBar} data-print-hide="true">
          <div>
            <p className="font-semibold">Ready to finish your test?</p>
            <p className="text-sm text-muted-foreground">Review your answers before finishing. You cannot edit them afterward.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger render={<Button type="button" disabled={busy} />}>{busy ? "Opening review…" : "Finish Test"}</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finish this practice test?</AlertDialogTitle>
                <AlertDialogDescription>Finishing locks your responses and opens answer review. Unanswered questions stay blank.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep working</AlertDialogCancel>
                <AlertDialogAction onClick={() => void submit()}>Finish and review</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : reviewPaper ? (
        <div className="flex justify-end" data-print-hide="true">
          <Link href={`/user/model-questions/${paper.subjectId}`} className={buttonVariants()}>Choose another paper</Link>
        </div>
      ) : (
        <div className={styles.finishBar} data-print-hide="true">
          <p className="text-sm text-muted-foreground">This mode is for reading or printing the question paper.</p>
          <Button type="button" onClick={() => setView("online")}>Continue Online Test</Button>
        </div>
      )}
    </main>
  );
}
