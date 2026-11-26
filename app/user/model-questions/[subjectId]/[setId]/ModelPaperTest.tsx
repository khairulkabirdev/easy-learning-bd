"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, FileText, Printer, Timer } from "lucide-react";
import { finishModelPaper } from "@/app/user/model-questions/actions";
import { ModelMatchingQuestionTable, hasModelMatchingQuestion, StudentModelPaperQuestion, modelSynonymsAntonymsItemLabel, modelSynonymsAntonymsPrompt, modelRearrangeQuestionText } from "@/app/user/lessons/student-content";
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
import { APP_NAME } from "@/lib/app-branding";
import type { ModelPaper, ModelPaperEntry } from "@/lib/model-paper-types";
import { modelRearrangeLetter } from "@/lib/model-rearrange-answers";
import { normalizeBlankQuestionHtml, sanitizeRichHtml } from "@/lib/sanitize-rich-html";
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

function formatExamDuration(minutes: number | null): string {
  if (minutes === null || !Number.isInteger(minutes) || minutes <= 0) return "Not set";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return [hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "",
    remaining ? `${remaining} ${remaining === 1 ? "minute" : "minutes"}` : ""].filter(Boolean).join(" ");
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

/** Render existing pipe-separated word-bank paragraphs as bordered exam tables.
 * Already structured rich-text tables are preserved by PaperHtml. */
function PrintedGrammarBlanks({ value }: { value: string }) {
  return <div className={styles.printedRichText} dangerouslySetInnerHTML={{ __html: normalizeBlankQuestionHtml(value) }} />;
}

function PrintedQuestionRows({ rows, tagBlanks = false }: { rows: { id: string; question: string }[]; tagBlanks?: boolean }) {
  return <ol className={styles.printedQuestions}>{rows.map((row, i) => {
    const label = modelRearrangeLetter(i);
    const alreadyLabelled = /^\s*(?:\([a-z]\)|[a-z][.)])(?:\s|$)/i.test(passageKey(row.question));
    const question = tagBlanks && !/_{2,}/.test(row.question)
      ? (/<\/p>\s*$/i.test(row.question) ? row.question.replace(/<\/p>\s*$/i, " __________</p>") : `${row.question} __________`)
      : row.question;
    return <li key={row.id}>
      {!alreadyLabelled && <span className={styles.itemLabel}>({label})</span>}
      <div className={styles.printedItemBody}><PaperHtml value={question} /></div>
    </li>;
  })}</ol>;
}

function PrintedMcq({ questions }: { questions: NonNullable<NonNullable<ModelPaperEntry["native"]>["mcqSection"]>["questions"] }) {
  return <ol className={styles.printedQuestions}>
    {questions.map((question, i) => <li key={question.id}>
      <span className={styles.itemLabel}>({modelRearrangeLetter(i)})</span>
      <div className={styles.printedItemBody}><PaperHtml value={question.prompt} />
        <div className={styles.printedOptions}>{question.options.map((option, k) => (
          <span key={option.id}>({["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"][k] || k + 1}) {option.text}</span>
        ))}</div>
      </div>
    </li>)}
  </ol>;
}

function PrintedQuestion({ entry }: { entry: ModelPaperEntry }) {
  const native = entry.native;
  if (!native) {
    if (entry.imported?.mcq) return <PrintedMcq questions={[entry.imported.mcq]} />;
    if (entry.imported) return <PaperHtml value={entry.imported.question} />;
    return null;
  }
  if (native.kind === "seen-passage-one" || native.kind === "seen-passage-two" || native.kind === "paragraph") {
    return <PaperHtml value={native.seenPassageOne?.body || native.seenPassageTwo?.body || native.paragraph?.body || ""} />;
  }
  if (native.kind === "mcq" && native.mcqSection) {
    return <PrintedMcq questions={native.mcqSection.questions} />;
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
  if ((native.kind === "table-completion" || native.kind === "column-matching") && native.questionAnswerExercise?.table?.rows.length && native.questionAnswerExercise.table.columns.length) {
    const table = native.questionAnswerExercise.table;
    if (hasModelMatchingQuestion(table, native.questionAnswerExercise.question)) {
      return <ModelMatchingQuestionTable table={table} question={native.questionAnswerExercise.question} />;
    }
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
        <tbody>{table.rows.map((row, rowIndex) => <tr key={row.id}>{table.columns.map((column, colIndex) => {
          const cell = row.cells.find(item => item.columnId === column.id);
          return <td key={column.id}>{cell?.mode === "answer" ? (hasMatchingChoices && colIndex === 1 ? alternatives[rowIndex] : "__________") : <PaperHtml value={cell?.text ?? ""} />}</td>;
        })}</tr>)}</tbody>
      </table>
      {!hasMatchingChoices && native.questionAnswerExercise.question ? <PaperHtml value={native.questionAnswerExercise.question} /> : null}
    </>;
  }
  if (native.kind === "rearrange-sentence" && native.questionAnswerExercise?.rows.length) {
    return <ol className={styles.printedQuestions}>
      {native.questionAnswerExercise.rows.map((row, i) => <li key={row.id}>
        <span className={styles.itemLabel}>{modelRearrangeLetter(i)})</span>
        <PaperHtml value={modelRearrangeQuestionText(row.question, i)} />
      </li>)}
    </ol>;
  }
  // All native question/answer records, including legacy single prompts.
  const writing = native.questionAnswerExercise;
  if (writing) {
    if (native.kind === "writing-summary") {
      const prompts = writing.rows.filter(row => row.question.trim());
      return prompts.length === 1 ? <PaperHtml value={prompts[0].question} /> :
        prompts.length ? <PrintedQuestionRows rows={prompts} /> : <PaperHtml value={writing.question} />;
    }
    if (writing.rows.length) return <>
      {writing.question.trim() && ["question-from-poems", "question-from-story"].includes(native.kind) && <PaperHtml value={writing.question} />}
      <PrintedQuestionRows rows={writing.rows} />
    </>;
    return <PaperHtml value={writing.question} />;
  }
  // Same prompt-only treatment for every grade and subject, never the interactive renderer.
  const blankRecord = native.kind === "gap-fill-first-paper" ? native.gapFillFirstPaper :
    native.kind === "gap-fill-second-paper" ? native.gapFillSecondPaper :
    native.kind === "gap-fill" ? native.gapFill :
    native.kind === "information-transfer" ? native.informationTransfer :
    native.kind === "right-form-of-verb" ? native.rightFormOfVerb :
    native.kind === "preposition" ? native.preposition :
    native.kind === "connector" ? native.connector : null;
  if (blankRecord) return <PrintedGrammarBlanks value={blankRecord.question} />;
  if (native.kind === "tag-question" && native.tagQuestion) {
    return native.tagQuestion.mode === "paragraph" ? <PrintedGrammarBlanks value={native.tagQuestion.question} /> :
      <PrintedQuestionRows rows={native.tagQuestion.rows} tagBlanks />;
  }
  if (native.kind === "parts-of-speech" && native.partsOfSpeech) return <PaperHtml value={native.partsOfSpeech.question} />;
  if (native.kind === "suffix-and-prefix" && native.suffixAndPrefix) return <PaperHtml value={native.suffixAndPrefix.question} />;
  if (native.kind === "narration" && native.narration) return <PaperHtml value={native.narration.question} />;
  if (native.kind === "punctuation-and-capitalization" && native.punctuationAndCapitalization) return <PaperHtml value={native.punctuationAndCapitalization.question} />;
  if (native.kind === "changing-sentence" && native.changingSentence) return native.changingSentence.rows.length ?
    <PrintedQuestionRows rows={native.changingSentence.rows} /> : <PaperHtml value={native.changingSentence.question} />;
  if (native.kind === "substitution-table" && native.substitutionTable) {
    const { table, question } = native.substitutionTable;
    if (!table.columns.length || !table.rows.length) return <PaperHtml value={question} />;
    return <>
      {question.trim() && <PaperHtml value={question} />}
      <table className={`${styles.printedTable} ${styles.grammarSubstitution}`} aria-label="Substitution table">
        <tbody>{table.rows.map(row => <tr key={row.id}>{table.columns.map(column => <td key={column.id}>
          <PaperHtml value={row.cells.find(cell => cell.columnId === column.id)?.text ?? ""} />
        </td>)}</tr>)}</tbody>
      </table>
    </>;
  }
  if (native.kind === "vocabulary" && native.vocabulary) return <ol className={styles.printedQuestions}>
    {native.vocabulary.entries.map((row, i) => <li key={row.id}>
      <span className={styles.itemLabel}>({modelRearrangeLetter(i)})</span><PaperHtml value={row.word} />
    </li>)}
  </ol>;
  // Fail closed for new or incomplete kinds: never print an answer widget or answer key.
  return <p>Question content is unavailable in paper format.</p>;
}

/** Summary Writing has one saved question prompt, not an additional paper description. */
function modelPaperShortAnswerInstruction(entry: ModelPaperEntry) {
  if (entry.native?.kind === "writing-summary") return "";
  const text = entry.shortDescription?.trim() || "";
  if (entry.native?.kind !== "question-answer") return text;
  return text.replace(/Answer\s+all\s+five\s+questions\.\s*2\s*[×xX*]\s*5\s*=\s*10\.?/gi, "").trim();
}

export function ModelPaperTest({ promptPaper, entryKey }: { promptPaper: ModelPaper; entryKey: string }) {
  const [reviewPaper, setReviewPaper] = useState<ModelPaper | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<PaperView>("paper");
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reviewPaper || view !== "online") return;
    let previous = Date.now();
    const handle = window.setInterval(() => {
      const now = Date.now();
      const delta = now - previous;
      previous = now;
      setElapsed(value => value + delta);
    }, 1000);
    return () => window.clearInterval(handle);
  }, [reviewPaper, view]);

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
  const paperView = view === "paper";
  function startOnline() { setHasStarted(true); setView("online"); }

  function renderSheet(sourcePaper: ModelPaper, mode: PaperView) {
    const questions = sourcePaper.entries.filter(entry => !entry.reference);
    const allMarksKnown = questions.every(entry => entry.marks !== null);
    const markedSections = questions.filter(entry => entry.marks !== null);
    const totalMarks = markedSections.length
      ? markedSections.reduce((sum, entry) => sum + (entry.marks ?? 0), 0)
      : null;
    const blocks = sourcePaper.entries.flatMap(entry => entry.native ? [entry.native] : []);
    const numbers = printedNumbers(sourcePaper.entries);
    const passagePlan = planPassages(sourcePaper.entries, blocks);
    const isQuestionPaper = mode === "paper";
    const renderSection = (entry: ModelPaperEntry, i: number) => {
      const isPassage = Boolean(entry.reference);
      const number = numbers[i];
      const source = passagePlan[i];
      if (source.skipReference) return null;
      return (
        <section key={entry.id} id={mode === "online" ? `paper-section-${i + 1}` : `question-paper-section-${i + 1}`}
          aria-label={isPassage ? entry.title : `Question ${number}`}
          className={isPassage ? styles.passageSection : styles.questionSection}
          data-paper-kind={entry.native?.kind || "legacy"}
          data-linked-passage={!isPassage && sourcePaper.entries.slice(0, i).some(previous => previous.reference) ? "true" : "false"}>
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
          {isQuestionPaper && !isPassage && entry.native?.kind !== "writing-summary" && (() => {
            const instruction = entry.imported?.instructions || entry.native?.questionAnswerExercise?.instruction || entry.native?.trueFalseExercise?.instruction || entry.native?.mcqSection?.description || "";
            const key = passageKey(instruction);
            return key && key !== passageKey(printedHeading(entry)) && key !== passageKey(modelPaperShortAnswerInstruction(entry)) ?
              <div className={styles.shortInstruction}><PaperHtml value={instruction} /></div> : null;
          })()}
          <div className={styles.questionBody}>
            {isPassage ? (
              <PaperHtml value={source.body} />
            ) : isQuestionPaper ? (
              <PrintedQuestion entry={entry} />
            ) : (
              <StudentModelPaperQuestion entry={entry} blocks={blocks} />
            )}
          </div>
        </section>
      );
    };

    return (
        <article key={mode} className={`${styles.paperSheet} ${isQuestionPaper ? (!paperView ? styles.printOnlySheet : "") : styles.onlineSheet}`} aria-label={isQuestionPaper ? "Model question paper" : "Online test"} data-exam-sheet="true" data-paper-mode={mode} data-paper-layout={isQuestionPaper ? "exam-paper" : undefined} hidden={!isQuestionPaper && paperView}>
          <header className={styles.examHeader}>
            <h1 className={styles.institutionName}>{APP_NAME}</h1>
            <h2 className={styles.examTitle}>{sourcePaper.name}</h2>
            <h3 className={styles.examClass}>Class: {sourcePaper.className.replace(/^Class\s*[:–-]?\s+/i, "")}</h3>
            <div className={styles.examMeta}>
              <span>Full Marks: {totalMarks !== null ? totalMarks : "—"}{!allMarksKnown && totalMarks !== null ? " (partial)" : ""}</span>
              <span>Subject: {sourcePaper.subject}</span>
              <span>Time: {formatExamDuration(sourcePaper.durationMinutes)}</span>
            </div>
          </header>

          {isQuestionPaper ? <div className={styles.paperQuestions}>{sourcePaper.entries.map(renderSection)}</div> : <ModelPaperMode.Provider value={reviewPaper ? "review" : "attempt"}>
            <fieldset disabled={Boolean(reviewPaper) || busy} aria-label="Paper questions"
              className={styles.paperQuestions}>
              {sourcePaper.entries.map(renderSection)}

            </fieldset>
          </ModelPaperMode.Provider>}
        </article>
    );
  }

  return (
    <main className={styles.workspace}>
      <div className={styles.toolbar} data-print-hide="true">
        <Link href={`/user/model-questions/${paper.subjectId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" aria-hidden /> Back to papers
        </Link>
        <div className={styles.toolbarControls}>
          <div className={styles.modeSwitch} role="group" aria-label="Paper display mode">
            <button type="button" onClick={startOnline} aria-pressed={!paperView}
              className={!paperView ? styles.modeActive : styles.modeButton}>
              <ClipboardList className="size-4" aria-hidden /> {reviewPaper ? "Answer Review" : "Online Test"}
            </button>
            <button type="button" onClick={() => setView("paper")}
              aria-pressed={paperView} className={paperView ? styles.modeActive : styles.modeButton}>
              <FileText className="size-4" aria-hidden /> Question Paper
            </button>
          </div>
          {paperView ? (
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden /> Print / Save PDF
            </Button>
          ) : (
            <span className={styles.timer}><Timer className="size-4" aria-hidden /> {formatElapsed(elapsed)}</span>
          )}
        </div>
      </div>

      {reviewPaper && !paperView && (
        <div ref={noticeRef} tabIndex={-1} className={styles.reviewNotice} data-print-hide="true">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <h2 className="font-semibold">Practice test finished — answer review</h2>
            <p className="text-sm">Compare your responses with the answer key. This is practice, not a recorded grade.</p>
          </div>
        </div>
      )}

      {renderSheet(promptPaper, "paper")}
      {hasStarted && renderSheet(paper, "online")}

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
      ) : reviewPaper && !paperView ? (
        <div className="flex justify-end" data-print-hide="true">
          <Link href={`/user/model-questions/${paper.subjectId}`} className={buttonVariants()}>Choose another paper</Link>
        </div>
      ) : (
        <div className={styles.finishBar} data-print-hide="true">
          <p className="text-sm text-muted-foreground">This mode is for reading or printing the question paper.</p>
          <Button type="button" onClick={startOnline}>{reviewPaper ? "Return to Answer Review" : hasStarted ? "Continue Online Test" : "Start Online Test"}</Button>
        </div>
      )}
    </main>
  );
}
