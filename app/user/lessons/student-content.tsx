"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, CircleHelp, Eye, Flag, Heart, XCircle } from "lucide-react";

import type {
  ContentBlockKind,
  ContentRecordWithBlocks,
  McqQuestionRecord,
  TableCompletionDocumentRecord,
  SynonymsAntonymsEntryRecord,
  TrueFalseRowRecord,
  VocabularyEntryRecord,
} from "@/app/admin/content/content-types";
import { TableCompletionChoiceCombobox } from "@/components/app/TableCompletionChoiceCombobox";
import { SubstitutionTableExercise } from "@/components/app/SubstitutionTableExercise";
import { VocabularyImageGallery, type VocabularyGalleryImage } from "@/components/app/VocabularyImageGallery";
import { PracticeAnswerActions } from "@/components/app/PracticeAnswerActions";
import { SynonymsAntonymsStudyCards } from "@/components/app/SynonymsAntonymsStudyCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";

export type StudentContentRecord = Omit<ContentRecordWithBlocks, "createdAt"> & {
  createdAt: string;
};

type CheckStatus = "idle" | "correct" | "incorrect";

const threeFieldBlockLabels: Partial<Record<ContentBlockKind, string>> = {
  "gap-fill": "Gap Fill",
  "gap-fill-first-paper": "Gap Fill First Paper",
  "gap-fill-second-paper": "Gap Fill Second Paper",
  "question-answer": "Question Answer",
  "table-completion": "Table Completion",
  "column-matching": "Matching Sentences",
  "rearrange-sentence": "Rearrange Sentence",
  "question-from-poems": "Question from Poems",
  "question-from-story": "Question from Story",
  "information-transfer": "Information Transfer",
  "substitution-table": "Substitution Table",
  "right-form-of-verb": "Right Form of Verb",
  narration: "Narration",
  "changing-sentence": "Changing Sentence",
  "punctuation-and-capitalization": "Punctuation and Capitalization",
  preposition: "Preposition",
  "suffix-and-prefix": "Suffix and Prefix",
  "tag-question": "Tag Question",
  connector: "Connector",
};

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

function normalizeAnswer(value: string) {
  return stripHtml(value).toLowerCase();
}

function RichContent({ value, className }: { value: string; className?: string }) {
  if (!stripHtml(value)) return null;

  return (
    <div
      className={cn(
        "overflow-x-auto text-sm leading-7 text-foreground",
        "[&_a]:text-primary [&_a]:underline",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic",
        "[&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-3 [&_p:last-child]:mb-0",
        "[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted/60 [&_th]:p-2 [&_ul]:list-disc [&_ul]:space-y-1",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }}
    />
  );
}

function ResultBadge({ status }: { status: CheckStatus }) {
  if (status === "idle") return null;

  return status === "correct" ? (
    <Badge className="gap-1">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Correct
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3.5 w-3.5" />
      Wrong
    </Badge>
  );
}

function ActionButtons({ onCheck, onReveal }: { onCheck: () => void; onReveal: () => void }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
      <Button type="button" size="sm" className="min-h-10 cursor-pointer sm:min-h-9" onClick={onCheck}>
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Check Answer
      </Button>
      <Button type="button" variant="outline" size="sm" className="min-h-10 cursor-pointer sm:min-h-9" onClick={onReveal}>
        <Eye className="mr-2 h-4 w-4" />
        Preview Answer
      </Button>
    </div>
  );
}

function ThreeFieldExerciseBlock({
  title,
  question,
  answer,
  details,
  passage = "",
}: {
  title: string;
  question: string;
  answer: string;
  details: string;
  passage?: string;
}) {
  const [studentAnswer, setStudentAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [status, setStatus] = useState<CheckStatus>("idle");

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <ResultBadge status={status} />
        </div>
        {stripHtml(details) ? <CardDescription>{stripHtml(details)}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {stripHtml(passage) ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Passage</div>
            <div className="rounded-xl border bg-muted/10 p-4">
              <RichContent value={passage} />
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <div className="text-sm font-medium">Question</div>
          <div className="rounded-xl border p-4">
            <RichContent value={question} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Your answer</div>
          <Textarea
            value={studentAnswer}
            onChange={(event) => {
              setStudentAnswer(event.target.value);
              setStatus("idle");
              setShowAnswer(false);
            }}
            className="min-h-24"
            placeholder="Write your answer here..."
          />
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <PracticeAnswerActions
            ariaLabel="Short-answer actions"
            onCheck={() => setStatus(normalizeAnswer(studentAnswer) === normalizeAnswer(answer) ? "correct" : "incorrect")}
            checkDisabled={!studentAnswer.trim()}
            onPreview={() => setShowAnswer(true)}
            onReset={() => {
              setStudentAnswer("");
              setStatus("idle");
              setShowAnswer(false);
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground">Short answers can be worded differently. Use Preview Answer to compare with the model response.</p>
        </div>
        {showAnswer ? (
          <div className="space-y-2 rounded-xl border border-dashed p-4">
            <div className="text-sm font-medium">Model answer</div>
            <RichContent value={answer} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function fillBlankQuestionToText(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function FillInTheBlanksBlock({
  question,
  blanks,
  details,
  passage: sourcePassage = "",
  title = "Fill in the Blanks",
}: {
  question: string;
  blanks: Array<{ id: string; sortOrder: number; answer: string }>;
  details: string;
  passage?: string;
  title?: string;
}) {
  const passage = fillBlankQuestionToText(question);
  const segments = passage.split(/_{2,}/g);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [statusByBlank, setStatusByBlank] = useState<Record<string, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  function checkAnswers() {
    const nextStatus: Record<string, CheckStatus> = {};
    blanks.forEach((blank) => {
      const expectedAnswer = normalizeAnswer(blank.answer);
      nextStatus[blank.id] =
        expectedAnswer && normalizeAnswer(studentAnswers[blank.id] || "") === expectedAnswer
          ? "correct"
          : "incorrect";
    });
    setStatusByBlank(nextStatus);
  }

  const allAnsweredCorrectly =
    blanks.length > 0 && blanks.every((blank) => statusByBlank[blank.id] === "correct");
  const hasChecked = Object.keys(statusByBlank).length > 0;

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          {hasChecked ? <ResultBadge status={allAnsweredCorrectly ? "correct" : "incorrect"} /> : null}
        </div>
        {stripHtml(details) ? <CardDescription>{stripHtml(details)}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {stripHtml(sourcePassage) ? (
          <div className="rounded-xl border bg-muted/10 p-4">
            <RichContent value={sourcePassage} />
          </div>
        ) : null}
        <div className="rounded-xl border border-border/60 bg-muted/15 px-3 py-4 text-[15px] leading-[2.9rem] whitespace-pre-wrap sm:px-4 sm:text-base sm:leading-[3rem]">
          {segments.map((segment, index) => {
            const blank = blanks[index];
            const letter = String.fromCharCode(97 + index);
            // The source may already contain (a), (b), etc. before each blank.
            // Show the label once, inside the inline input, rather than twice.
            const visibleText = blank
              ? segment.replace(new RegExp(`\\s*\\(${letter}\\)\\s*$`, "i"), " ")
              : segment;
            return (
              <span key={`${index}-${blank?.id || "tail"}`}>
                {visibleText}
                {blank ? (
                  <span
                    className={cn(
                      "mx-1 my-1 inline-flex max-w-full items-center gap-1 rounded-lg border border-border/80 bg-background px-1.5 py-1 align-middle shadow-xs transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15",
                      statusByBlank[blank.id] === "correct" && "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20",
                      statusByBlank[blank.id] === "incorrect" && "border-red-500 bg-red-50/60 dark:bg-red-950/20",
                    )}
                  >
                    <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">{letter}</span>
                    <Input
                      value={studentAnswers[blank.id] || ""}
                      onChange={(event) => {
                        setStudentAnswers((current) => ({ ...current, [blank.id]: event.target.value }));
                        setStatusByBlank((current) => ({ ...current, [blank.id]: "idle" }));
                      }}
                      aria-label={`Answer for blank ${letter}`}
                      placeholder="Answer"
                      autoComplete="off"
                      className="h-8 w-24 min-w-0 border-0 bg-transparent px-1 text-center text-sm shadow-none outline-none focus-visible:border-0 focus-visible:ring-0 sm:w-28"
                    />
                  </span>
                ) : null}
              </span>
            );
          })}
        </div>

        <ActionButtons onCheck={checkAnswers} onReveal={() => setShowAnswers(true)} />

        {showAnswers ? (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <div className="text-sm font-medium">Correct answers</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {blanks.map((blank, index) => (
                <div key={blank.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  <Badge variant="outline">Blank {index + 1}</Badge>
                  <span className="font-medium">{blank.answer || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


function SuffixPrefixExerciseBlock({
  question,
  items,
  details,
}: {
  question: string;
  items: Array<{ id: string; sortOrder: number; word: string; answer: string }>;
  details: string;
}) {
  let targetIndex = 0;
  const tokenized = question.replace(/<u(?:\s[^>]*)?>[\s\S]*?<\/u>/gi, () => {
    const token = `[[SUFFIX_PREFIX_${targetIndex}]]`;
    targetIndex += 1;
    return token;
  });
  const passage = fillBlankQuestionToText(tokenized);
  const parts = passage.split(/(\[\[SUFFIX_PREFIX_\d+\]\])/g);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [statusByItem, setStatusByItem] = useState<Record<string, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  function checkAnswers() {
    const nextStatus: Record<string, CheckStatus> = {};
    items.forEach((item) => {
      const expected = normalizeAnswer(item.answer);
      nextStatus[item.id] =
        expected && normalizeAnswer(studentAnswers[item.id] || "") === expected
          ? "correct"
          : "incorrect";
    });
    setStatusByItem(nextStatus);
  }

  const allCorrect = items.length > 0 && items.every((item) => statusByItem[item.id] === "correct");
  const hasChecked = Object.keys(statusByItem).length > 0;

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Suffix and Prefix</CardTitle>
          {hasChecked ? <ResultBadge status={allCorrect ? "correct" : "incorrect"} /> : null}
        </div>
        {stripHtml(details) ? <CardDescription>{stripHtml(details)}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border bg-muted/10 p-4 text-base leading-10 whitespace-pre-wrap">
          {parts.map((part, index) => {
            const match = part.match(/^\[\[SUFFIX_PREFIX_(\d+)\]\]$/);
            if (!match) return <span key={`text-${index}`}>{part}</span>;
            const item = items[Number(match[1])];
            if (!item) return null;

            return (
              <span key={item.id} className="mx-1 inline-flex flex-wrap items-center gap-2 align-middle">
                <span className="font-medium underline decoration-2 underline-offset-4">{item.word}</span>
                <Input
                  value={studentAnswers[item.id] || ""}
                  onChange={(event) => {
                    setStudentAnswers((current) => ({ ...current, [item.id]: event.target.value }));
                    setStatusByItem((current) => ({ ...current, [item.id]: "idle" }));
                  }}
                  aria-label={`Completed word for ${item.word}`}
                  placeholder="answer"
                  className={cn(
                    "h-9 min-w-28 w-36 bg-background px-2 text-center sm:w-44",
                    statusByItem[item.id] === "correct" && "border-emerald-500 bg-emerald-50",
                    statusByItem[item.id] === "incorrect" && "border-red-500 bg-red-50",
                  )}
                />
              </span>
            );
          })}
        </div>

        <ActionButtons onCheck={checkAnswers} onReveal={() => setShowAnswers(true)} />

        {showAnswers ? (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <div className="text-sm font-medium">Correct answers</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <span className="underline underline-offset-4">{item.word}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{item.answer || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ParagraphBlock({ body, title = "Reading passage" }: { body: string; title?: string }) {
  if (!stripHtml(body)) return null;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="border-b bg-muted/20 px-5 py-4 sm:px-6">
        <CardTitle className="text-base font-semibold sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="[&_p]:text-[15px] [&_p]:leading-7 sm:[&_p]:text-base sm:[&_p]:leading-8">
          <RichContent value={body} />
        </div>
      </CardContent>
    </Card>
  );
}

function VocabularyBlock({ entries, passage = "", galleryImages = [] }: { entries: VocabularyEntryRecord[]; passage?: string; galleryImages?: VocabularyGalleryImage[] }) {
  const splitList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="border-b bg-muted/15 px-5 py-4 sm:px-6">
        <CardTitle className="text-lg">Vocabulary</CardTitle>
        <CardDescription>Study meaning, pronunciation, part of speech, synonyms, and antonyms.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 py-5 sm:px-6">
        {stripHtml(passage) ? (
          <div className="mb-4 rounded-xl border bg-muted/20 p-4">
            <RichContent value={passage} />
          </div>
        ) : null}
        <div className="space-y-3">
          {entries.map((entry, index) => {
            const synonyms = splitList(entry.synonyms);
            const antonyms = splitList(entry.antonyms);
            return (
              <div key={entry.id} className="rounded-xl border bg-background p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="shrink-0">{String(index + 1).padStart(2, "0")}</Badge>
                  <span className="text-base font-semibold">{entry.word || "Untitled word"}</span>
                  {entry.partOfSpeech ? <Badge variant="secondary">{entry.partOfSpeech}</Badge> : null}
                  {entry.pronunciation ? <span className="text-sm text-muted-foreground">({entry.pronunciation})</span> : null}
                </div>

                <div className="mt-2 text-sm sm:text-[15px]">
                  <span className="font-medium">Meaning:</span> {entry.meaning || "No meaning added."}
                </div>

                {synonyms.length > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Synonyms</span>
                    {synonyms.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
                  </div>
                ) : null}

                {antonyms.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Antonyms</span>
                    {antonyms.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                  </div>
                ) : null}
                {entry.imageUrl ? (
                  <div className="mt-4 overflow-hidden rounded-xl border bg-muted/20 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.imageUrl} alt={`Illustration for ${entry.word}`} loading="lazy" className="max-h-64 w-full rounded-lg object-contain" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {galleryImages.length > 0 ? (
          <section className="mt-6 space-y-3 border-t pt-5" aria-label="Vocabulary image gallery">
            <h3 className="text-base font-semibold">Vocabulary image gallery</h3>
            <p className="text-sm text-muted-foreground">Browse the images for this vocabulary lesson.</p>
            <VocabularyImageGallery title="Vocabulary gallery" images={galleryImages} />
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SynonymsAntonymsBlock({
  entries,
  passage = "",
}: {
  entries: SynonymsAntonymsEntryRecord[];
  passage?: string;
}) {
  return (
    <div className="space-y-4">
      {stripHtml(passage) ? (
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reading passage</CardTitle>
            <CardDescription>Read the passage before studying the words below.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-muted/20 p-4">
              <RichContent value={passage} />
            </div>
          </CardContent>
        </Card>
      ) : null}
      <SynonymsAntonymsStudyCards entries={entries} />
    </div>
  );
}

function McqBlock({
  title,
  description,
  passage = "",
  questions,
}: {
  title: string;
  description: string;
  passage?: string;
  questions: McqQuestionRecord[];
}) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [statusByQuestion, setStatusByQuestion] = useState<Record<string, CheckStatus>>({});
  const [previewedQuestions, setPreviewedQuestions] = useState<Record<string, boolean>>({});
  const [liveCheckEnabled, setLiveCheckEnabled] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [favoriteQuestions, setFavoriteQuestions] = useState<Record<string, boolean>>({});

  function answerStatus(question: McqQuestionRecord, selected: string[]): CheckStatus {
    if (selected.length === 0) return "idle";
    const correct = question.options.filter((option) => option.isCorrect).map((option) => option.id).sort();
    return JSON.stringify([...selected].sort()) === JSON.stringify(correct) ? "correct" : "incorrect";
  }

  function toggleOption(question: McqQuestionRecord, optionId: string, checked: boolean) {
    const previous = selectedAnswers[question.id] || [];
    const next = question.answerMode === "single"
      ? (checked ? [optionId] : [])
      : Array.from(new Set(checked ? [...previous, optionId] : previous.filter((value) => value !== optionId)));

    setSelectedAnswers((current) => ({ ...current, [question.id]: next }));
    setStatusByQuestion((current) => ({
      ...current,
      [question.id]: liveCheckEnabled ? answerStatus(question, next) : "idle",
    }));
    // Editing an answer hides its previous preview, without affecting other questions.
    setPreviewedQuestions((current) => ({ ...current, [question.id]: false }));
  }

  function checkAnswers() {
    const next: Record<string, CheckStatus> = {};
    for (const question of questions) next[question.id] = answerStatus(question, selectedAnswers[question.id] || []);
    setStatusByQuestion(next);
  }

  function previewAnswers() {
    setPreviewedQuestions(Object.fromEntries(questions.map((question) => [question.id, true])));
  }

  function resetAnswers() {
    setSelectedAnswers({});
    setStatusByQuestion({});
    setPreviewedQuestions({});
    // Flags/favourites are study bookmarks; resetting answers should not erase them.
  }

  function handleLiveCheckToggle() {
    if (liveCheckEnabled) {
      setLiveCheckEnabled(false);
      setStatusByQuestion({});
      return;
    }
    setLiveCheckEnabled(true);
    const next: Record<string, CheckStatus> = {};
    for (const question of questions) {
      next[question.id] = answerStatus(question, selectedAnswers[question.id] || []);
    }
    setStatusByQuestion(next);
  }

  const answeredCount = questions.filter((question) => (selectedAnswers[question.id] || []).length > 0).length;
  const checkedCount = Object.values(statusByQuestion).filter((status) => status !== "idle").length;
  const correctCount = Object.values(statusByQuestion).filter((status) => status === "correct").length;

  const actionControls = (label: string) => (
    <PracticeAnswerActions
      ariaLabel={label}
      onCheck={checkAnswers}
      checkDisabled={answeredCount === 0}
      onPreview={previewAnswers}
      onReset={resetAnswers}
      checkLabel="Check Answers"
      previewLabel="Preview Answers"
      resetLabel="Reset Answers"
    />
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title || "Multiple choice questions"}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 text-xs text-muted-foreground sm:text-sm">
            <span>Instant feedback</span>
            <button
              type="button"
              role="switch"
              aria-label="Instant feedback"
              aria-checked={liveCheckEnabled}
              onClick={handleLiveCheckToggle}
              className={cn("relative inline-flex h-5 w-10 items-center rounded-full transition-colors", liveCheckEnabled ? "bg-primary" : "bg-muted-foreground/40")}
            >
              <span className={cn("h-4 w-4 rounded-full bg-white shadow transition-transform", liveCheckEnabled ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </label>
        </div>
        {actionControls("MCQ set actions")}
      </div>

      {stripHtml(passage) ? (
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <RichContent value={passage} />
        </div>
      ) : null}

      <div className="space-y-3">
        {questions.map((question, index) => {
          const isFlagged = Boolean(flaggedQuestions[question.id]);
          const isFavorite = Boolean(favoriteQuestions[question.id]);
          const selectedOptions = selectedAnswers[question.id] || [];
          const status = statusByQuestion[question.id] || "idle";
          const isPreviewed = Boolean(previewedQuestions[question.id]);

          return (
            <Card key={question.id} className="overflow-hidden rounded-2xl border border-border/80 bg-muted/20 shadow-sm">
              <CardHeader className="space-y-3 p-4 pb-3 sm:p-5 sm:pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="relative mt-0.5 flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 px-2 text-sm font-semibold text-sky-700">
                      {index + 1}
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5 text-[15px] font-medium leading-7 sm:text-base">
                      <RichContent value={question.prompt} />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-border/70 bg-background">
                    <button
                      type="button"
                      aria-label={isFlagged ? "Unflag question" : "Flag question"}
                      aria-pressed={isFlagged}
                      onClick={() => setFlaggedQuestions((current) => ({ ...current, [question.id]: !current[question.id] }))}
                      className={cn("flex min-h-10 items-center gap-1.5 border-r border-border/70 px-2.5 text-xs transition-colors sm:px-3 sm:text-sm", isFlagged ? "bg-amber-50 text-amber-700" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
                    >
                      <Flag className={cn("h-4 w-4", isFlagged && "fill-current")} />
                      <span className="hidden sm:inline">Flag</span>
                    </button>
                    <button
                      type="button"
                      aria-label={isFavorite ? "Remove favourite" : "Add favourite"}
                      aria-pressed={isFavorite}
                      onClick={() => setFavoriteQuestions((current) => ({ ...current, [question.id]: !current[question.id] }))}
                      className={cn("flex min-h-10 items-center gap-1.5 px-2.5 text-xs transition-colors sm:px-3 sm:text-sm", isFavorite ? "bg-rose-50 text-rose-600" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
                    >
                      <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                      <span className="hidden sm:inline">Fav</span>
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                {question.options.map((option) => {
                  const checked = selectedOptions.includes(option.id);
                  // Checking grades the selection; Preview is the only action that reveals all correct options.
                  const isCorrectOption = (isPreviewed && option.isCorrect) || (status === "correct" && checked && option.isCorrect);
                  const isWrongSelection = status === "incorrect" && checked && !option.isCorrect;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "group flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all",
                        !isCorrectOption && !isWrongSelection && !checked && "border-border/70 bg-muted/25 hover:border-primary/35 hover:bg-primary/[0.03]",
                        checked && !isCorrectOption && !isWrongSelection && "border-primary/50 bg-primary/[0.05]",
                        isCorrectOption && "border-emerald-300 bg-emerald-50 text-emerald-900",
                        isWrongSelection && "border-red-300 bg-red-50 text-red-900",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        className="sr-only"
                        onCheckedChange={(next) => toggleOption(question, option.id, Boolean(next))}
                      />
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-background text-[11px] font-semibold lowercase text-muted-foreground transition-colors",
                          checked && !isCorrectOption && !isWrongSelection && "border-primary bg-primary text-primary-foreground",
                          isCorrectOption && "border-emerald-500 bg-emerald-500 text-white",
                          isWrongSelection && "border-red-500 bg-red-500 text-white",
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="min-w-0 flex-1 text-sm leading-6">{option.text || "Empty option"}</span>
                      {isCorrectOption ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
                      {isWrongSelection ? <XCircle className="h-4 w-4 shrink-0 text-red-500" /> : null}
                    </label>
                  );
                })}
                {status !== "idle" ? (
                  <div className="border-t border-border/70 pt-3" role="status" aria-live="polite">
                    <ResultBadge status={status} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5">
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          Answered {answeredCount} of {questions.length} · Checked {checkedCount} · Correct {correctCount}
        </p>
        {actionControls("MCQ actions after the last question")}
      </div>
    </section>
  );
}

function sentenceShuffleScore(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createInitialSentenceOrder(rows: Array<{ id: string }>) {
  const correctOrder = rows.map((row) => row.id);
  const shuffled = [...correctOrder].sort(
    (left, right) => sentenceShuffleScore(`${left}:student-shuffle`) - sentenceShuffleScore(`${right}:student-shuffle`),
  );

  if (shuffled.length > 1 && shuffled.every((id, index) => id === correctOrder[index])) {
    return [...shuffled.slice(1), shuffled[0]];
  }

  return shuffled;
}

function SentenceOrderingBlock({
  title,
  instruction,
  details,
  rows,
}: {
  title: string;
  instruction: string;
  details: string;
  rows: Array<{ id: string; question: string; answer: string }>;
}) {
  const [orderedIds, setOrderedIds] = useState<string[]>(() => createInitialSentenceOrder(rows));
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [showCorrectOrder, setShowCorrectOrder] = useState(false);
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const orderedRows = orderedIds.map((id) => rowById.get(id)).filter(Boolean) as typeof rows;

  function moveSentence(rowId: string, direction: "up" | "down") {
    setOrderedIds((current) => {
      const currentIndex = current.indexOf(rowId);
      if (currentIndex === -1) return current;

      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
    setStatus("idle");
    setShowCorrectOrder(false);
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg">{title || "Rearrange Sentence"}</CardTitle>
            {instruction ? <CardDescription>{instruction}</CardDescription> : null}
          </div>
          <ResultBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stripHtml(details) ? (
          <div className="rounded-xl border border-dashed p-4">
            <RichContent value={details} />
          </div>
        ) : null}

        <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
          Move the sentences up or down until they are in the correct order.
        </div>

        <div className="space-y-3">
          {orderedRows.map((row, index) => (
            <div key={row.id} className="flex items-start gap-3 rounded-xl border bg-background p-3">
              <Badge variant="outline" className="mt-1 shrink-0">
                {index + 1}
              </Badge>
              <div className="min-w-0 flex-1">
                <RichContent value={row.question} />
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Move item ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => moveSentence(row.id, "up")}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Move item ${index + 1} down`}
                  disabled={index === orderedRows.length - 1}
                  onClick={() => moveSentence(row.id, "down")}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {showCorrectOrder ? (
          <div className="rounded-xl border border-dashed p-4">
            <div className="mb-3 text-sm font-medium">Correct order</div>
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={row.id} className="flex items-start gap-3 rounded-lg bg-muted/30 p-3">
                  <Badge variant="secondary" className="mt-1 shrink-0">
                    {index + 1}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <RichContent value={row.question} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <ActionButtons
          onCheck={() => {
            const isCorrect =
              orderedIds.length === rows.length && orderedIds.every((rowId, index) => rowId === rows[index]?.id);
            setStatus(isCorrect ? "correct" : "incorrect");
          }}
          onReveal={() => setShowCorrectOrder(true)}
        />
      </CardContent>
    </Card>
  );
}

function TableCompletionBlock({
  title,
  instruction,
  details,
  table,
}: {
  title: string;
  instruction: string;
  details: string;
  table: TableCompletionDocumentRecord;
}) {
  const [selections, setSelections] = useState<Record<string, Record<string, string>>>({});
  const [statusByAnswer, setStatusByAnswer] = useState<Record<string, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  // Keep old per-cell Table Completion records working until they are edited
  // in the new Admin connection builder.
  if (table.answers.length === 0) {
    return <LegacyTableCompletionBlock title={title} instruction={instruction} details={details} table={table} />;
  }

  function getCell(columnId: string, cellId: string) {
    return table.rows
      .flatMap((row) => row.cells)
      .find((cell) => cell.columnId === columnId && cell.id === cellId);
  }

  function getCellText(columnId: string, cellId: string) {
    const cell = getCell(columnId, cellId);
    return cell ? (cell.mode === "answer" ? cell.answer || cell.text : cell.text) : "";
  }

  function buildPreview(answerId: string, useCorrectAnswer = false) {
    const answer = table.answers.find((item) => item.id === answerId);
    if (!answer) return "";
    return table.columns
      .map((column) => {
        const cellId = useCorrectAnswer
          ? answer.selections.find((selection) => selection.columnId === column.id)?.cellId || ""
          : selections[answerId]?.[column.id] || "";
        return getCellText(column.id, cellId).trim();
      })
      .filter(Boolean)
      .join(" ");
  }

  const statuses = table.answers.map((answer) => statusByAnswer[answer.id] || "idle");
  const overallStatus: CheckStatus =
    statuses.every((status) => status === "idle")
      ? "idle"
      : statuses.every((status) => status === "correct")
        ? "correct"
        : "incorrect";

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{title || "Table Completion"}</CardTitle>
          <ResultBadge status={overallStatus} />
        </div>
        {stripHtml(instruction) ? <CardDescription>{stripHtml(instruction)}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {stripHtml(details) ? (
          <div className="rounded-xl border border-dashed p-4">
            <RichContent value={details} />
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="w-14 border-b border-r px-3 py-3 text-center text-xs font-medium text-muted-foreground">#</th>
                {table.columns.map((column) => (
                  <th key={column.id} className="border-b border-r px-4 py-3 text-left text-sm font-semibold last:border-r-0">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={row.id}>
                  <td className="border-b border-r bg-muted/20 px-3 py-3 text-center text-sm font-medium">{rowIndex + 1}</td>
                  {table.columns.map((column, columnIndex) => {
                    const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                    return (
                      <td key={cell?.id || `${row.id}-${column.id}`} className="border-b border-r px-4 py-3 text-sm last:border-r-0">
                        {cell ? (cell.mode === "answer" ? cell.answer || cell.text : cell.text) : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Make the correct sentences</h3>
            <p className="text-sm text-muted-foreground">
              For each sentence, select one item from every column. The selected parts are joined from left to right.
            </p>
          </div>

          {table.answers.map((answer, answerIndex) => {
            const status = statusByAnswer[answer.id] || "idle";
            const preview = buildPreview(answer.id);
            return (
              <div key={answer.id} className="rounded-xl border p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="outline">Sentence #{answerIndex + 1}</Badge>
                  <ResultBadge status={status} />
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {table.columns.map((column, columnIndex) => {
                    const selected = selections[answer.id]?.[column.id] || "";
                    const usedByOtherSentences = new Set(
                      Object.entries(selections)
                        .filter(([answerId]) => answerId !== answer.id)
                        .map(([, byColumn]) => byColumn[column.id] || "")
                        .filter(Boolean),
                    );
                    const options = table.rows.flatMap((row, rowIndex) => {
                      const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                      if (!cell) return [];
                      const text = cell.mode === "answer" ? cell.answer || cell.text : cell.text;
                      return [
                        {
                          id: cell.id,
                          label: `Row ${rowIndex + 1}${text ? ` — ${text}` : ""}`,
                          disabled: usedByOtherSentences.has(cell.id),
                        },
                      ];
                    });

                    return (
                      <div key={column.id} className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">{column.label}</div>
                        <TableCompletionChoiceCombobox
                          value={selected}
                          options={options}
                          placeholder={`Choose from ${column.label || `Column ${columnIndex + 1}`}`}
                          onChange={(cellId) => {
                            setSelections((current) => {
                              if (
                                cellId &&
                                Object.entries(current).some(
                                  ([otherAnswerId, byColumn]) =>
                                    otherAnswerId !== answer.id && byColumn[column.id] === cellId,
                                )
                              ) {
                                return current;
                              }

                              return {
                                ...current,
                                [answer.id]: {
                                  ...(current[answer.id] || {}),
                                  [column.id]: cellId,
                                },
                              };
                            });
                            setStatusByAnswer((current) => ({ ...current, [answer.id]: "idle" }));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-xl bg-muted/30 p-3">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your sentence</div>
                  <div className="text-sm font-medium">{preview || "Choose one part from each column."}</div>
                </div>

                {showAnswers ? (
                  <div className="mt-3 rounded-xl border border-dashed p-3">
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Correct sentence</div>
                    <div className="text-sm font-medium">{buildPreview(answer.id, true) || "Answer not configured yet."}</div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <ActionButtons
          onCheck={() => {
            const next: Record<string, CheckStatus> = {};
            for (const answer of table.answers) {
              const isCorrect = table.columns.every((column) => {
                const expected = answer.selections.find((selection) => selection.columnId === column.id)?.cellId || "";
                const actual = selections[answer.id]?.[column.id] || "";
                return Boolean(expected) && actual === expected;
              });
              next[answer.id] = isCorrect ? "correct" : "incorrect";
            }
            setStatusByAnswer(next);
          }}
          onReveal={() => setShowAnswers(true)}
        />
      </CardContent>
    </Card>
  );
}

function LegacyTableCompletionBlock({
  title,
  instruction,
  details,
  table,
}: {
  title: string;
  instruction: string;
  details: string;
  table: TableCompletionDocumentRecord;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [statusByCell, setStatusByCell] = useState<Record<string, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  const answerCells = table.rows.flatMap((row) => row.cells.filter((cell) => cell.mode === "answer"));
  const checkedStatuses = answerCells.map((cell) => statusByCell[cell.id] || "idle");
  const overallStatus: CheckStatus =
    checkedStatuses.length === 0 || checkedStatuses.every((status) => status === "idle")
      ? "idle"
      : checkedStatuses.every((status) => status === "correct")
        ? "correct"
        : "incorrect";

  function isCorrectAnswer(value: string, expected: string) {
    const normalizedValue = normalizeAnswer(value);
    const accepted = expected
      .split("|")
      .map((item) => normalizeAnswer(item))
      .filter(Boolean);
    return accepted.length > 0 && accepted.includes(normalizedValue);
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{title || "Table Completion"}</CardTitle>
          <ResultBadge status={overallStatus} />
        </div>
        {stripHtml(instruction) ? <CardDescription>{stripHtml(instruction)}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {stripHtml(details) ? (
          <div className="rounded-xl border border-dashed p-4">
            <RichContent value={details} />
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="bg-muted/50">
                {table.columns.map((column) => (
                  <th key={column.id} className="border-b border-r px-4 py-3 text-left text-sm font-semibold last:border-r-0">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.id}>
                  {table.columns.map((column, columnIndex) => {
                    const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                    if (!cell) return <td key={`${row.id}-${column.id}`} className="border-b border-r p-3 last:border-r-0" />;

                    if (cell.mode === "text") {
                      return (
                        <td key={cell.id} className="border-b border-r px-4 py-3 text-sm last:border-r-0">
                          {cell.text}
                        </td>
                      );
                    }

                    const status = statusByCell[cell.id] || "idle";
                    return (
                      <td key={cell.id} className="border-b border-r p-3 last:border-r-0">
                        <div className="space-y-2">
                          <Input
                            value={answers[cell.id] || ""}
                            onChange={(event) => {
                              setAnswers((current) => ({ ...current, [cell.id]: event.target.value }));
                              setStatusByCell((current) => ({ ...current, [cell.id]: "idle" }));
                            }}
                            placeholder="Write the missing part..."
                            className={cn(
                              status === "correct" && "border-primary",
                              status === "incorrect" && "border-destructive",
                            )}
                          />
                          {status !== "idle" ? <ResultBadge status={status} /> : null}
                          {showAnswers ? (
                            <div className="text-xs text-muted-foreground">
                              Correct answer: <span className="font-medium text-foreground">{cell.answer}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl bg-muted/30 p-3 text-sm text-muted-foreground">
          Read each row from left to right and complete the blank cells to make the correct sentence.
        </div>

        <ActionButtons
          onCheck={() => {
            const next: Record<string, CheckStatus> = {};
            for (const cell of answerCells) {
              next[cell.id] = isCorrectAnswer(answers[cell.id] || "", cell.answer) ? "correct" : "incorrect";
            }
            setStatusByCell(next);
          }}
          onReveal={() => setShowAnswers(true)}
        />
      </CardContent>
    </Card>
  );
}

function QuestionAnswerRowsBlock({
  title,
  rows,
  details,
  contextParagraph = "",
}: {
  title: string;
  rows: Array<{ id: string; question: string; answer: string }>;
  details: string;
  contextParagraph?: string;
}) {
  const [openRowIds, setOpenRowIds] = useState<Record<string, boolean>>({});
  const [flaggedRows, setFlaggedRows] = useState<Record<string, boolean>>({});
  const [favoriteRows, setFavoriteRows] = useState<Record<string, boolean>>({});
  const cleanDetails = stripHtml(details);
  const hasContextParagraph = Boolean(stripHtml(contextParagraph));
  const sectionActions = (
    <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 p-3" >
      <PracticeAnswerActions
        ariaLabel="Short-answer section actions"
        onPreview={() => setOpenRowIds(Object.fromEntries(rows.map((row) => [row.id, true])))}
        onReset={() => setOpenRowIds({})}
        previewLabel="Preview All Answers"
        resetLabel="Reset Answers"
      />
    </div>
  );

  function answerRow(row: { id: string; question: string; answer: string }, index: number, compact = false) {
    const isOpen = Boolean(openRowIds[row.id]);
    const number = String(index + 1).padStart(2, "0");

    return (
      <div
        key={row.id}
        className={cn(
          "overflow-hidden rounded-xl border transition-colors",
          isOpen ? "border-emerald-300 bg-emerald-50/55" : "border-border/80 bg-muted/20 hover:border-emerald-200",
        )}
      >
        <div className="flex min-w-0 items-stretch">
          <button
            type="button"
            onClick={() => setOpenRowIds((current) => ({ ...current, [row.id]: !isOpen }))}
            aria-expanded={isOpen}
            className={cn(
              "group flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4",
              compact ? "sm:py-2.5" : "sm:py-3.5",
            )}
          >
            <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-[11px] font-bold text-muted-foreground group-hover:border-emerald-300 group-hover:text-emerald-700">
              {compact ? String.fromCharCode(97 + index) : number}
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              <RichContent
                value={row.question}
                className="text-[15px] leading-6 sm:text-base sm:leading-7 [&_p]:mb-0"
              />
              {!hasContextParagraph && cleanDetails ? (
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{cleanDetails}</span>
              ) : null}
            </span>
          </button>

          <div className="flex shrink-0 items-start gap-0.5 pr-2 pt-2.5 sm:pr-3 sm:pt-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={flaggedRows[row.id] ? "Unmark question" : "Mark question for review"}
              aria-pressed={Boolean(flaggedRows[row.id])}
              onClick={() => setFlaggedRows((current) => ({ ...current, [row.id]: !current[row.id] }))}
              className={cn("h-9 w-9 rounded-full text-muted-foreground", flaggedRows[row.id] && "text-amber-600")}
            >
              <Flag className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={favoriteRows[row.id] ? "Remove from favourites" : "Add to favourites"}
              aria-pressed={Boolean(favoriteRows[row.id])}
              onClick={() => setFavoriteRows((current) => ({ ...current, [row.id]: !current[row.id] }))}
              className={cn("h-9 w-9 rounded-full text-muted-foreground", favoriteRows[row.id] && "text-rose-500")}
            >
              <Heart className={cn("h-4 w-4", favoriteRows[row.id] && "fill-current")} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={isOpen ? "Hide answer" : "Show answer"}
              onClick={() => setOpenRowIds((current) => ({ ...current, [row.id]: !isOpen }))}
              className="h-9 w-9 rounded-full text-muted-foreground"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
            </Button>
          </div>
        </div>

        {isOpen ? (
          <div className={cn("px-3 pb-3 sm:px-4 sm:pb-4", compact && "pl-12 sm:pl-14")}>
            <div className="rounded-xl border border-emerald-200 bg-background/90 px-4 py-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                Model answer
              </div>
              <RichContent value={row.answer} className="text-[15px] leading-7 sm:text-base" />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (hasContextParagraph) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-sky-100 text-xs font-bold text-sky-700">
              01
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
            </span>
            <div>
              <h2 className="font-semibold text-sky-700">Question 01</h2>
              {title ? <p className="text-xs text-muted-foreground">{title}</p> : null}
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-muted/15 px-1 py-1 sm:px-2">
          <RichContent
            value={contextParagraph}
            className="text-[15px] leading-7 sm:text-base sm:leading-8 [&_p]:mb-3"
          />
        </div>

        {cleanDetails && normalizeAnswer(cleanDetails) !== normalizeAnswer(contextParagraph) ? (
          <p className="mb-4 text-xs text-muted-foreground">{cleanDetails}</p>
        ) : null}

        <div className="space-y-3">{rows.map((row, index) => answerRow(row, index, true))}</div>
        {sectionActions}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {(title || cleanDetails) ? (
        <div className="space-y-1 px-1">
          {title ? <h2 className="text-base font-semibold sm:text-lg">{title}</h2> : null}
          {cleanDetails ? <p className="text-sm text-muted-foreground">{cleanDetails}</p> : null}
        </div>
      ) : null}
      <div className="space-y-3">{rows.map((row, index) => answerRow(row, index))}</div>
      {sectionActions}
    </section>
  );
}


function TagQuestionItemsBlock({
  rows,
  details,
}: {
  rows: Array<{ id: string; question: string; answer: string }>;
  details: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [statusByRow, setStatusByRow] = useState<Record<string, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  function questionParts(value: string) {
    const text = fillBlankQuestionToText(value);
    const match = /_{2,}/.exec(text);
    if (!match || match.index == null) {
      return { before: text, after: "" };
    }
    return {
      before: text.slice(0, match.index),
      after: text.slice(match.index + match[0].length),
    };
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">Tag Question</CardTitle>
        {stripHtml(details) ? <CardDescription>{stripHtml(details)}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row, index) => {
          const parts = questionParts(row.question);
          return (
            <div key={row.id} className="rounded-xl border p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline">Item {index + 1}</Badge>
                <ResultBadge status={statusByRow[row.id] || "idle"} />
              </div>

              <div className="rounded-xl border bg-muted/10 p-4 text-base leading-9 whitespace-pre-wrap">
                <span>{parts.before}</span>
                <span className="mx-1 inline-flex align-middle">
                  <Input
                    value={answers[row.id] || ""}
                    onChange={(event) => {
                      setAnswers((current) => ({ ...current, [row.id]: event.target.value }));
                      setStatusByRow((current) => ({ ...current, [row.id]: "idle" }));
                    }}
                    placeholder={`${index + 1}`}
                    aria-label={`Tag Question answer ${index + 1}`}
                    className={cn(
                      "h-9 min-w-32 w-40 bg-background px-2 text-center sm:w-52",
                      statusByRow[row.id] === "correct" && "border-emerald-500 bg-emerald-50",
                      statusByRow[row.id] === "incorrect" && "border-red-500 bg-red-50",
                    )}
                  />
                </span>
                <span>{parts.after}</span>
              </div>

              {showAnswers ? (
                <div className="mt-3 rounded-xl border border-dashed p-3">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Correct answer</div>
                  <div className="font-medium">{stripHtml(row.answer) || "—"}</div>
                </div>
              ) : null}
            </div>
          );
        })}

        <ActionButtons
          onCheck={() => {
            const next: Record<string, CheckStatus> = {};
            for (const row of rows) {
              const expected = normalizeAnswer(row.answer);
              next[row.id] = expected && normalizeAnswer(answers[row.id] || "") === expected ? "correct" : "incorrect";
            }
            setStatusByRow(next);
          }}
          onReveal={() => setShowAnswers(true)}
        />
      </CardContent>
    </Card>
  );
}

function InformationTransferRowsBlock({
  rows,
  details,
}: {
  rows: Array<{ id: string; term: string; answer: string }>;
  details: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [statusByRow, setStatusByRow] = useState<Record<string, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">Information Transfer</CardTitle>
        {stripHtml(details) ? <CardDescription>{stripHtml(details)}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-xl border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline">Item {index + 1}</Badge>
              <ResultBadge status={statusByRow[row.id] || "idle"} />
            </div>

            <div className="mb-3 space-y-1">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Term / Item</div>
              <div className="rounded-xl border p-4">
                <RichContent value={row.term} />
              </div>
            </div>

            <Input
              value={answers[row.id] || ""}
              onChange={(event) => {
                setAnswers((current) => ({ ...current, [row.id]: event.target.value }));
                setStatusByRow((current) => ({ ...current, [row.id]: "idle" }));
              }}
              placeholder="Write the answer for this item..."
            />

            {showAnswers ? (
              <div className="mt-3 rounded-xl border border-dashed p-3">
                <div className="mb-2 text-sm font-medium">Answer review</div>
                <RichContent value={row.answer} />
              </div>
            ) : null}
          </div>
        ))}

        <ActionButtons
          onCheck={() => {
            const next: Record<string, CheckStatus> = {};
            for (const row of rows) {
              next[row.id] =
                normalizeAnswer(answers[row.id] || "") === normalizeAnswer(row.answer) ? "correct" : "incorrect";
            }
            setStatusByRow(next);
            setShowAnswers(true);
          }}
          onReveal={() => setShowAnswers(true)}
        />
      </CardContent>
    </Card>
  );
}

function TrueFalseBlock({
  title,
  instruction,
  passage,
  rows,
}: {
  title: string;
  instruction: string;
  passage: string;
  rows: TrueFalseRowRecord[];
}) {
  const [answers, setAnswers] = useState<Record<string, "true" | "false" | "">>({});
  const [statusByRow, setStatusByRow] = useState<Record<string, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">{title || "True / False"}</CardTitle>
        {instruction ? <CardDescription>{instruction}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {stripHtml(passage) ? (
          <div className="rounded-xl border p-4">
            <RichContent value={passage} />
          </div>
        ) : null}
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-xl border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline">Statement {index + 1}</Badge>
              <ResultBadge status={statusByRow[row.id] || "idle"} />
            </div>
            <div className="mb-3 rounded-xl border p-4 text-sm">{row.statement || "Empty statement"}</div>
            <div className="max-w-xs">
              <Select
                value={answers[row.id] || ""}
                onValueChange={(value) => {
                  setAnswers((current) => ({ ...current, [row.id]: value as "true" | "false" }));
                  setStatusByRow((current) => ({ ...current, [row.id]: "idle" }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select answer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showAnswers ? (
              <div className="mt-3 rounded-xl border border-dashed p-3 text-sm">
                <div className="mb-1 font-medium">Correct answer: {row.expectedAnswer ? "True" : "False"}</div>
                {!row.expectedAnswer && row.correction ? (
                  <div className="text-muted-foreground">Correction: {row.correction}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
        <ActionButtons
          onCheck={() => {
            const next: Record<string, CheckStatus> = {};
            for (const row of rows) {
              next[row.id] =
                (answers[row.id] || "") === (row.expectedAnswer ? "true" : "false") ? "correct" : "incorrect";
            }
            setStatusByRow(next);
            setShowAnswers(true);
          }}
          onReveal={() => setShowAnswers(true)}
        />
      </CardContent>
    </Card>
  );
}

function StudentBlockCard({
  block,
  content,
  suppressRepeatedPassages = false,
}: {
  block: StudentContentRecord["blocks"][number];
  content: StudentContentRecord;
  suppressRepeatedPassages?: boolean;
}) {
  function resolvePassage(record: {
    passage?: string;
    passageSource?: string;
    paragraphBlockId?: string | null;
    resolvedPassage?: string;
  } | null | undefined) {
    if (!record) return "";

    const candidatePassage = record.resolvedPassage !== undefined ? record.resolvedPassage : record.passage || "";
    if (suppressRepeatedPassages && stripHtml(candidatePassage)) {
      const candidateText = normalizeAnswer(candidatePassage);
      const alreadyRendered = content.blocks.some((item) => {
        const body = item.paragraph?.body || item.seenPassageOne?.body || item.seenPassageTwo?.body || "";
        return stripHtml(body) && normalizeAnswer(body) === candidateText;
      });
      if (alreadyRendered) return "";
    }

    if (suppressRepeatedPassages && record.passageSource === "paragraph" && record.paragraphBlockId) return "";
    if (record.resolvedPassage !== undefined) return record.resolvedPassage;
    if (record.passageSource === "paragraph" && record.paragraphBlockId) {
      const linkedBlock = content.blocks.find((item) => item.id === record.paragraphBlockId);
      if (linkedBlock?.paragraph) return linkedBlock.paragraph.body || "";
      if (linkedBlock?.seenPassageOne) return linkedBlock.seenPassageOne.body || "";
      if (linkedBlock?.seenPassageTwo) return linkedBlock.seenPassageTwo.body || "";
      return "";
    }
    return record.passage || "";
  }

  if (block.kind === "paragraph" && block.paragraph) return <ParagraphBlock body={block.paragraph.body} />;
  if (block.kind === "seen-passage-one" && block.seenPassageOne) return <ParagraphBlock body={block.seenPassageOne.body} title="Passage 1" />;
  if (block.kind === "seen-passage-two" && block.seenPassageTwo) return <ParagraphBlock body={block.seenPassageTwo.body} title="Passage 2" />;
  if (block.kind === "vocabulary" && block.vocabulary) {
    return <VocabularyBlock entries={block.vocabulary.entries} passage={resolvePassage(block.vocabulary)} galleryImages={block.vocabulary.galleryImages} />;
  }
  if (block.kind === "synonyms-antonyms" && block.synonymsAntonyms) {
    return (
      <SynonymsAntonymsBlock
        entries={block.synonymsAntonyms.entries}
        passage={resolvePassage(block.synonymsAntonyms)}
      />
    );
  }
  if (block.kind === "mcq" && block.mcqSection) {
    return (
      <McqBlock
        title={block.mcqSection.title}
        description={block.mcqSection.description}
        passage={resolvePassage(block.mcqSection)}
        questions={block.mcqSection.questions}
      />
    );
  }
  if (block.kind === "true-false" && block.trueFalseExercise) {
    return (
      <TrueFalseBlock
        title={block.trueFalseExercise.title}
        instruction={block.trueFalseExercise.instruction}
        passage={block.trueFalseExercise.passage}
        rows={block.trueFalseExercise.rows}
      />
    );
  }
  if (block.kind === "rearrange-sentence" && block.questionAnswerExercise) {
    return block.questionAnswerExercise.rows.length > 0 ? (
      <SentenceOrderingBlock
        title={block.questionAnswerExercise.title || "Rearrange Sentence"}
        instruction={block.questionAnswerExercise.instruction}
        details={block.questionAnswerExercise.details}
        rows={block.questionAnswerExercise.rows}
      />
    ) : (
      <ThreeFieldExerciseBlock
        title={block.questionAnswerExercise.title || "Rearrange Sentence"}
        question={block.questionAnswerExercise.question}
        answer={block.questionAnswerExercise.answer}
        details={block.questionAnswerExercise.details || block.questionAnswerExercise.instruction}
      />
    );
  }

  if (block.kind === "table-completion" && block.questionAnswerExercise) {
    if (block.questionAnswerExercise.table && block.questionAnswerExercise.table.rows.length > 0) {
      return (
        <TableCompletionBlock
          title={block.questionAnswerExercise.title || "Table Completion"}
          instruction={block.questionAnswerExercise.instruction}
          details={block.questionAnswerExercise.details}
          table={block.questionAnswerExercise.table}
        />
      );
    }

    return block.questionAnswerExercise.rows.length > 0 ? (
      <QuestionAnswerRowsBlock
        title={block.questionAnswerExercise.title || "Table Completion"}
        rows={block.questionAnswerExercise.rows}
        details={block.questionAnswerExercise.details || block.questionAnswerExercise.instruction}
      />
    ) : (
      <ThreeFieldExerciseBlock
        title={block.questionAnswerExercise.title || "Table Completion"}
        question={block.questionAnswerExercise.question}
        answer={block.questionAnswerExercise.answer}
        details={block.questionAnswerExercise.details || block.questionAnswerExercise.instruction}
      />
    );
  }

  if (block.kind === "column-matching" && block.questionAnswerExercise) {
    if (block.questionAnswerExercise.table && block.questionAnswerExercise.table.rows.length > 0) {
      return (
        <TableCompletionBlock
          title={block.questionAnswerExercise.title || "Matching Sentences"}
          instruction={block.questionAnswerExercise.instruction}
          details={block.questionAnswerExercise.details}
          table={block.questionAnswerExercise.table}
        />
      );
    }

    return (
      <ThreeFieldExerciseBlock
        title={block.questionAnswerExercise.title || "Matching Sentences"}
        question={block.questionAnswerExercise.question}
        answer={block.questionAnswerExercise.answer}
        details={block.questionAnswerExercise.details || block.questionAnswerExercise.instruction}
      />
    );
  }

  if (block.questionAnswerExercise && ["question-answer", "question-from-poems", "question-from-story"].includes(block.kind)) {
    const rawDetails = block.questionAnswerExercise.details || block.questionAnswerExercise.instruction;
    const detailsText = stripHtml(rawDetails);
    const passageTexts = content.blocks
      .flatMap((item) => [item.paragraph?.body, item.seenPassageOne?.body, item.seenPassageTwo?.body])
      .filter((value): value is string => Boolean(value && stripHtml(value)))
      .map((value) => normalizeAnswer(value));
    const looksLikeParagraph = detailsText.length >= 160 || (detailsText.match(/[.!?।]/g) || []).length >= 3;
    const matchesPrimaryPassage = passageTexts.includes(normalizeAnswer(rawDetails));
    const contextParagraph = looksLikeParagraph && !matchesPrimaryPassage ? rawDetails : "";
    const helperDetails = contextParagraph ? block.questionAnswerExercise.instruction : rawDetails;

    return block.questionAnswerExercise.rows.length > 0 ? (
      <QuestionAnswerRowsBlock
        title={block.questionAnswerExercise.title || threeFieldBlockLabels[block.kind] || "Exercise"}
        rows={block.questionAnswerExercise.rows}
        details={helperDetails}
        contextParagraph={contextParagraph}
      />
    ) : (
      <ThreeFieldExerciseBlock
        title={block.questionAnswerExercise.title || threeFieldBlockLabels[block.kind] || "Exercise"}
        question={block.questionAnswerExercise.question}
        answer={block.questionAnswerExercise.answer}
        details={block.questionAnswerExercise.details || block.questionAnswerExercise.instruction}
      />
    );
  }

  if (block.kind === "information-transfer" && block.informationTransfer) {
    return (
      <FillInTheBlanksBlock
        title="Information Transfer"
        question={block.informationTransfer.question}
        blanks={block.informationTransfer.blanks}
        details={block.informationTransfer.details}
        passage={resolvePassage(block.informationTransfer)}
      />
    );
  }

  if (block.kind === "gap-fill-first-paper" && block.gapFillFirstPaper) {
    return (
      <FillInTheBlanksBlock
        question={block.gapFillFirstPaper.question}
        blanks={block.gapFillFirstPaper.blanks}
        details={block.gapFillFirstPaper.details}
        passage={resolvePassage(block.gapFillFirstPaper)}
      />
    );
  }

  if (block.kind === "gap-fill-second-paper" && block.gapFillSecondPaper) {
    return (
      <FillInTheBlanksBlock
        title="Gap Filling"
        question={block.gapFillSecondPaper.question}
        blanks={block.gapFillSecondPaper.blanks}
        details={block.gapFillSecondPaper.details}
      />
    );
  }

  if (block.kind === "right-form-of-verb" && block.rightFormOfVerb) {
    return (
      <FillInTheBlanksBlock
        title="Right Form of Verb"
        question={block.rightFormOfVerb.question}
        blanks={block.rightFormOfVerb.blanks}
        details={block.rightFormOfVerb.details}
      />
    );
  }

  if (block.kind === "preposition" && block.preposition) {
    return (
      <FillInTheBlanksBlock
        title="Preposition"
        question={block.preposition.question}
        blanks={block.preposition.blanks}
        details={block.preposition.details}
      />
    );
  }

  if (block.kind === "connector" && block.connector) {
    return (
      <FillInTheBlanksBlock
        title="Connector"
        question={block.connector.question}
        blanks={block.connector.blanks}
        details={block.connector.details}
      />
    );
  }

  if (block.kind === "substitution-table" && block.substitutionTable) {
    return block.substitutionTable.table.rows.length > 0 || block.substitutionTable.answer.trim().startsWith("{") ? (
      <SubstitutionTableExercise
        table={block.substitutionTable.table}
        details={block.substitutionTable.details}
      />
    ) : (
      <ThreeFieldExerciseBlock
        title="Substitution Table"
        question={block.substitutionTable.question}
        answer={block.substitutionTable.answer}
        details={block.substitutionTable.details}
      />
    );
  }

  if (block.kind === "changing-sentence" && block.changingSentence) {
    return (
      <QuestionAnswerRowsBlock
        title="Changing Sentence"
        rows={block.changingSentence.rows}
        details={block.changingSentence.details}
      />
    );
  }

  if (block.kind === "tag-question" && block.tagQuestion) {
    return block.tagQuestion.mode === "paragraph" ? (
      <FillInTheBlanksBlock
        title="Tag Question"
        question={block.tagQuestion.question}
        blanks={block.tagQuestion.blanks}
        details={block.tagQuestion.details}
      />
    ) : (
      <TagQuestionItemsBlock
        rows={block.tagQuestion.rows}
        details={block.tagQuestion.details}
      />
    );
  }

  if (block.kind === "suffix-and-prefix" && block.suffixAndPrefix) {
    return block.suffixAndPrefix.items.length > 0 ? (
      <SuffixPrefixExerciseBlock
        question={block.suffixAndPrefix.question}
        items={block.suffixAndPrefix.items}
        details={block.suffixAndPrefix.details}
      />
    ) : (
      <ThreeFieldExerciseBlock
        title="Suffix and Prefix"
        question={block.suffixAndPrefix.question}
        answer={block.suffixAndPrefix.answer}
        details={block.suffixAndPrefix.details}
      />
    );
  }

  const threeFieldMap = {
    "gap-fill": block.gapFill,
    narration: block.narration,
    "punctuation-and-capitalization": block.punctuationAndCapitalization,
  } as const;

  const threeFieldBlock = threeFieldMap[block.kind as keyof typeof threeFieldMap];

  if (threeFieldBlock) {
    return (
      <ThreeFieldExerciseBlock
        title={threeFieldBlockLabels[block.kind] || "Exercise"}
        question={threeFieldBlock.question}
        answer={threeFieldBlock.answer}
        details={threeFieldBlock.details}
        passage={block.kind === "gap-fill" ? resolvePassage(block.gapFill) : ""}
      />
    );
  }

  return (
    <Card className="rounded-xl border-dashed">
      <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
        <CircleHelp className="mt-0.5 h-4 w-4" />
        <div>
          This block type is missing student rendering. Kind: <span className="font-medium">{block.kind}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentContentViewer({
  content,
  title = "Content viewer",
  description = "Read the lesson content and use the answer review tools where available.",
  showHeader = true,
  suppressRepeatedPassages = false,
}: {
  content: StudentContentRecord;
  title?: string;
  description?: string;
  showHeader?: boolean;
  suppressRepeatedPassages?: boolean;
}) {
  const visibleBlocks = content.blocks.filter((block) => {
    if (block.kind === "paragraph" && block.paragraph) return Boolean(stripHtml(block.paragraph.body));
    if (block.kind === "seen-passage-one" && block.seenPassageOne) return Boolean(stripHtml(block.seenPassageOne.body));
    if (block.kind === "seen-passage-two" && block.seenPassageTwo) return Boolean(stripHtml(block.seenPassageTwo.body));
    return true;
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      {showHeader ? (
        <>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{visibleBlocks.length} blocks</Badge>
            <Badge variant="secondary">{content.topicId ? "Topic-level content" : "Lesson-level content"}</Badge>
          </div>
        </>
      ) : null}
      {visibleBlocks.length > 0 ? (
        <div className="space-y-5 sm:space-y-6">
          {visibleBlocks.map((block) => (
            <StudentBlockCard
              key={block.id}
              block={block}
              content={content}
              suppressRepeatedPassages={suppressRepeatedPassages}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          This content record has no blocks yet.
        </div>
      )}
    </div>
  );
}
