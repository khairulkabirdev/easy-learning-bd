"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Eye, RotateCcw, BookOpen, CircleX, AlertCircle } from "lucide-react";
import {
  htmlToPlainText,
  parseEnglishSecondPaperDocument,
  type EnglishSecondPaperKind,
  type BlankExerciseDocument,
  type SimpleQuestionAnswerDocument,
  type QuestionAnswerItemsDocument,
  type SuffixPrefixDocument,
  type SubstitutionTableDocument,
  type TagQuestionDocument,
} from "@/app/admin/content/english-second-paper-blocks/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import { UserSubstitutionTableGame } from "@/components/app/UserSubstitutionTableGame";

export type SecondPaperStudentRecord = {
  id: string;
  title: string;
  instruction: string;
  details: string;
  documentJson: string;
};

function Rich({ html }: { html?: string }) {
  if (!html?.trim()) return null;
  return <div className="prose prose-sm max-w-none break-words leading-7 dark:prose-invert [&_table]:w-full [&_table]:overflow-x-auto" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }} />;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ").replace(/[.!?。]+$/g, "");
}

// Use the same (a), (b), (c) labels for the marked roots and answer inputs.
function suffixPrefixLabel(index: number) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(97 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function SuffixPrefixPassage({ question, count }: { question: string; count: number }) {
  let index = 0;
  // Sanitize the saved rich text before inserting controlled letter markers.
  const safeHtml = sanitizeRichHtml(question).replace(/<u\b[^>]*>[\s\S]*?<\/u>/gi, (underlinedWord) => {
    if (index >= count) return underlinedWord;
    const label = suffixPrefixLabel(index++);
    return `<span class="mr-1 font-semibold text-primary">(${label})</span>${underlinedWord}`;
  });

  return (
    <div
      className="prose prose-sm max-w-none break-words leading-8 dark:prose-invert [&_u]:decoration-primary/60 [&_u]:decoration-2 [&_u]:underline-offset-4"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

// Written grammar exercises can have more than one valid phrasing. The model-
// answer check is helpful feedback, not a substitute for teacher assessment.
type AnswerComparison = "blank" | "written" | "punctuation";

function normalizeWrittenAnswer(value: string, strictCapitalization: boolean) {
  const text = htmlToPlainText(value)
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '\"')
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();

  // Punctuation practice must check capitals, commas, quotes and sentence marks.
  // Narration/transformation tolerate capitalization and a final full stop.
  return strictCapitalization
    ? text
    : text.toLocaleLowerCase().replace(/[.!?]+$/g, "");
}

function matchesAnswer(value: string, answer: string, comparison: AnswerComparison) {
  if (!value.trim() || !htmlToPlainText(answer).trim()) return false;
  if (comparison === "blank") return normalize(value) === normalize(answer);
  return normalizeWrittenAnswer(value, comparison === "punctuation") ===
    normalizeWrittenAnswer(answer, comparison === "punctuation");
}

function WrittenAnswerFeedback({ value, matched }: { value: string; matched: boolean }) {
  if (matched) {
    return <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4 shrink-0" /> Matches the model answer</p>;
  }
  return (
    <p role="status" className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-400">
      {value.trim() ? <CircleX className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {value.trim() ? "Different from the model answer — review your response" : "Write an answer before checking"}
    </p>
  );
}

function InlineBlanks({
  question,
  answers,
  values,
  onChange,
  checked,
  preview,
}: {
  question: string;
  answers: string[];
  values: string[];
  onChange: (index: number, value: string) => void;
  checked: boolean;
  preview: boolean;
}) {
  const parts = htmlToPlainText(question).split(/_{2,}/g);
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-[2.9] sm:text-[15px]">
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 ? (
            <span className="mx-1.5 inline-flex max-w-full align-middle">
              <Input
                aria-label={`Blank ${index + 1}`}
                value={values[index] || ""}
                onChange={(event) => onChange(index, event.target.value)}
                className={`inline-block h-10 w-32 min-w-0 rounded-lg text-center text-sm sm:w-40 ${checked ? normalize(values[index] || "") === normalize(answers[index] || "") ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20" : "border-rose-500 bg-rose-50/30 dark:bg-rose-950/20" : ""}`}
                placeholder={`${index + 1}`}
              />
              {preview ? <span className="ml-1.5 self-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium leading-normal text-primary">{answers[index] || "—"}</span> : null}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function ActionRow({
  onCheck,
  onPreview,
  onReset,
  preview,
  canCheck = true,
}: {
  onCheck: () => void;
  onPreview: () => void;
  onReset: () => void;
  preview: boolean;
  canCheck?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      {canCheck ? <Button type="button" onClick={onCheck} className="min-h-10"><CheckCircle2 className="h-4 w-4" /> Check Answer</Button> : null}
      <Button type="button" variant="outline" onClick={onPreview} className="min-h-10"><Eye className="h-4 w-4" /> {preview ? "Hide Answers" : "Preview Answers"}</Button>
      <Button type="button" variant="ghost" onClick={onReset} className="min-h-10"><RotateCcw className="h-4 w-4" /> Reset</Button>
    </div>
  );
}

function QuestionRow({
  number,
  question,
  answer,
  value,
  onChange,
  preview,
  checked,
  matched,
}: {
  number: number;
  question: string;
  answer: string;
  value: string;
  onChange: (value: string) => void;
  preview: boolean;
  checked: boolean;
  matched: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/15 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{String(number).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1"><Rich html={question} /></div>
      </div>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="Write your answer..." className={`min-h-20 resize-y bg-background ${checked ? matched ? "border-emerald-500 focus-visible:ring-emerald-500" : "border-rose-500 focus-visible:ring-rose-500" : ""}`} aria-label={`Answer ${number}`} />
      {checked ? <WrittenAnswerFeedback value={value} matched={matched} /> : null}
      {preview ? <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/20"><div className="mb-1 font-semibold text-emerald-700 dark:text-emerald-300">Model answer</div><Rich html={answer} /></div> : null}
    </div>
  );
}

export function UserEnglishSecondPaperViewer({ kind, record }: { kind: EnglishSecondPaperKind; record: SecondPaperStudentRecord }) {
  const document = useMemo(() => parseEnglishSecondPaperDocument(kind, record.documentJson, record.id), [kind, record.documentJson, record.id]);
  const [values, setValues] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [preview, setPreview] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);

  const setAt = (index: number, value: string) => {
    setValues((prev) => { const copy = [...prev]; copy[index] = value; return copy; });
    setChecked(false);
    setScore(null);
  };
  const check = (answers: string[], comparison: AnswerComparison = "blank") => {
    setScore({
      correct: answers.filter((answer, index) => matchesAnswer(values[index] || "", answer, comparison)).length,
      total: answers.length,
    });
    setChecked(true);
  };
  const reset = () => { setValues([]); setPreview(false); setChecked(false); setScore(null); };
  const actions = (answers?: string[], comparison: AnswerComparison = "blank") => (
    <ActionRow onCheck={() => answers && check(answers, comparison)} onPreview={() => setPreview((value) => !value)} onReset={reset} preview={preview} canCheck={Boolean(answers && answers.length)} />
  );
  const writtenSummary = (total: number) => checked && score ? (
    <div role="status" className={`rounded-lg border px-3 py-2 text-sm ${score.correct === total ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300" : "border-amber-200 bg-amber-50/50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"}`}>
      <span className="font-semibold">Matches model: {score.correct} / {total}</span>
      {" · "}Other grammatically correct wordings may also be valid.
    </div>
  ) : null;

  const isBlank = kind === "gap-filling" || kind === "right-form-of-verb" || kind === "preposition" || kind === "connector";
  const blankDocument = isBlank ? document as BlankExerciseDocument : null;
  const qaDocument = kind === "narration" || kind === "punctuation-and-capitalization" ? document as SimpleQuestionAnswerDocument : null;
  const itemsDocument = kind === "changing-sentence" ? document as QuestionAnswerItemsDocument : null;
  const suffixDocument = kind === "suffix-and-prefix" ? document as SuffixPrefixDocument : null;
  const tagDocument = kind === "tag-question" ? document as TagQuestionDocument : null;
  const substitutionDocument = kind === "substitution-table" ? document as SubstitutionTableDocument : null;

  return (
    <section className="space-y-5 rounded-2xl border bg-background p-4 shadow-sm sm:p-5">
      {record.instruction && !substitutionDocument ? <div className="rounded-xl border bg-muted/20 p-3 text-sm"><Rich html={record.instruction} /></div> : null}
      {record.details ? <div className="text-sm text-muted-foreground"><Rich html={record.details} /></div> : null}

      {blankDocument ? (
        <div className="space-y-4">
          <InlineBlanks question={blankDocument.question} answers={blankDocument.blanks.map((b) => b.answer)} values={values} onChange={setAt} checked={checked} preview={preview} />
          {checked && score ? <p role="status" className="text-sm font-medium">Correct: {score.correct} / {score.total}</p> : null}
          {actions(blankDocument.blanks.map((b) => b.answer))}
        </div>
      ) : null}

      {qaDocument ? (
        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/20 p-4"><Rich html={qaDocument.question} /></div>
          <Textarea
            value={values[0] || ""}
            onChange={(event) => setAt(0, event.target.value)}
            placeholder="Write your answer..."
            className={`min-h-28 bg-background ${checked ? matchesAnswer(values[0] || "", qaDocument.answer, kind === "punctuation-and-capitalization" ? "punctuation" : "written") ? "border-emerald-500" : "border-rose-500" : ""}`}
            aria-label="Your answer"
          />
          {checked ? <WrittenAnswerFeedback value={values[0] || ""} matched={matchesAnswer(values[0] || "", qaDocument.answer, kind === "punctuation-and-capitalization" ? "punctuation" : "written")} /> : null}
          {preview ? <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><strong className="text-primary">Model answer</strong><Rich html={qaDocument.answer} /></div> : null}
          {writtenSummary(1)}
          {actions([qaDocument.answer], kind === "punctuation-and-capitalization" ? "punctuation" : "written")}
        </div>
      ) : null}

      {itemsDocument ? (
        <div className="space-y-4">
          <div className="space-y-3">{itemsDocument.rows.map((row, index) => (
            <QuestionRow
              key={row.id}
              number={index + 1}
              question={row.question}
              answer={row.answer}
              value={values[index] || ""}
              onChange={(value) => setAt(index, value)}
              preview={preview}
              checked={checked}
              matched={matchesAnswer(values[index] || "", row.answer, "written")}
            />
          ))}</div>
          {writtenSummary(itemsDocument.rows.length)}
          {actions(itemsDocument.rows.map((row) => row.answer), "written")}
        </div>
      ) : null}

      {suffixDocument ? (
        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/20 p-4">
            <SuffixPrefixPassage question={suffixDocument.question} count={suffixDocument.items.length} />
          </div>
          <div className="space-y-3">{suffixDocument.items.map((item, index) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/10 p-3 sm:p-3.5">
              <label htmlFor={`suffix-answer-${item.id}`} className="w-7 shrink-0 text-sm font-semibold text-primary">
                {suffixPrefixLabel(index)})
              </label>
              <Input
                id={`suffix-answer-${item.id}`}
                value={values[index] || ""}
                onChange={(event) => setAt(index, event.target.value)}
                className={`h-10 min-w-0 flex-1 bg-background ${checked ? normalize(values[index] || "") === normalize(item.answer) ? "border-emerald-500" : "border-rose-500" : ""}`}
                aria-label={`Answer ${suffixPrefixLabel(index)} for ${item.word}`}
                autoComplete="off"
              />
              {checked ? <span className={`text-xs font-medium ${normalize(values[index] || "") === normalize(item.answer) ? "text-emerald-600" : "text-rose-600"}`}>{normalize(values[index] || "") === normalize(item.answer) ? "Correct" : "Try again"}</span> : null}
              {preview ? <span className="basis-full pl-10 text-xs text-primary sm:basis-auto sm:pl-0">Answer: {item.answer}</span> : null}
            </div>
          ))}</div>
          {checked && score ? <p role="status" className="text-sm font-medium">Correct: {score.correct} / {score.total}</p> : null}
          {actions(suffixDocument.items.map((item) => item.answer))}
        </div>
      ) : null}

      {tagDocument ? (
        <div className="space-y-4">
          {tagDocument.mode === "paragraph" ? (
            <InlineBlanks question={tagDocument.question} answers={tagDocument.blanks.map((b) => b.answer)} values={values} onChange={setAt} checked={checked} preview={preview} />
          ) : (
            <div className="space-y-3">{tagDocument.rows.map((row, index) => (
              <div key={row.id} className="rounded-xl border bg-muted/10 p-3">
                <span className="mb-2 block text-xs text-muted-foreground">Question {index + 1}</span>
                <InlineBlanks question={row.question} answers={[row.answer]} values={[values[index] || ""]} onChange={(_, value) => setAt(index, value)} checked={checked} preview={preview} />
              </div>
            ))}</div>
          )}
          {checked && score ? <p role="status" className="text-sm font-medium">Correct: {score.correct} / {score.total}</p> : null}
          {actions(tagDocument.mode === "paragraph" ? tagDocument.blanks.map((b) => b.answer) : tagDocument.rows.map((r) => r.answer))}
        </div>
      ) : null}

      {substitutionDocument ? <UserSubstitutionTableGame key={record.id} document={substitutionDocument} /> : null}
      {!substitutionDocument ? <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><BookOpen className="h-3.5 w-3.5" /> Practice answers are checked on this page; no changes are made to your content.</p> : null}
    </section>
  );
}
