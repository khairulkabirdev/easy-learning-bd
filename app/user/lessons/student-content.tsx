"use client";

import { useContext, useState } from "react";
import { CheckCircle2, CircleHelp, Flag, Heart, XCircle } from "lucide-react";

import type {
  ContentBlockKind,
  ContentRecordWithBlocks,
  McqQuestionRecord,
  TableCompletionDocumentRecord,
  SynonymsAntonymsEntryRecord,
  TrueFalseRowRecord,
  VocabularyEntryRecord,
} from "@/app/admin/content/content-types";
import { normalizeSynonymsAntonymsAnswerType } from "@/app/admin/content/content-types";
import { ModelPaperManualReview, ModelPaperMode, useModelPaperReview } from "@/components/app/ModelPaperMode";
import type { ModelPaperEntry } from "@/lib/model-paper-types";
import { modelRearrangeLetter, readModelRearrangeKey, validateModelRearrangeSlots } from "@/lib/model-rearrange-answers";
import { TableCompletionChoiceCombobox } from "@/components/app/TableCompletionChoiceCombobox";
import { SubstitutionTableExercise } from "@/components/app/SubstitutionTableExercise";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PracticeAnswerActions } from "@/components/app/PracticeAnswerActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TrueFalseQuestionRow, type TrueFalseResponse } from "@/components/app/UserUnseenCompositionViewer";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import { RichQuestionWithAnswers } from "@/components/app/RichQuestionWithAnswers";

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

function RichContent({ value }: { value: string }) {
  if (!stripHtml(value) && !/<img\b|<hr\b/i.test(value)) return null;

  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-x-auto text-base leading-7 text-foreground [overflow-wrap:anywhere]",
        "[&_img]:h-auto [&_img]:max-w-full [&_pre]:overflow-x-auto [&_td]:align-top",
        "[&_a]:text-primary [&_a]:underline",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic",
        "[&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-3 [&_p:last-child]:mb-0",
        "[&_table]:w-full [&_table]:border-collapse [&_col]:!w-auto [&_td_p]:m-0 [&_th_p]:m-0 [&_td]:border [&_td]:border-border [&_td]:p-2",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted/60 [&_th]:p-2 [&_ul]:list-disc [&_ul]:space-y-1",
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }}
    />
  );
}

function ResultBadge({ status }: { status: CheckStatus }) {
  if (useContext(ModelPaperManualReview) || status === "idle") return null;

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
  const manual = useContext(ModelPaperManualReview);
  const mode = useModelPaperReview(() => {
    if (!manual) onCheck();
    onReveal();
  });
  if (mode) return null;

  return <PracticeAnswerActions onCheck={onCheck} onPreview={onReveal} previewLabel="Review Answer" />;
}

function ThreeFieldExerciseBlock({
  title,
  question,
  answer,
  details,
  hideHeader = false,
  compactQuestion = false,
  passage = "",
}: {
  title: string;
  question: string;
  answer: string;
  details: string;
  hideHeader?: boolean;
  compactQuestion?: boolean;
  passage?: string;
}) {
  const [studentAnswer, setStudentAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [status, setStatus] = useState<CheckStatus>("idle");

  return (
    <Card className="rounded-xl">
      {!hideHeader && <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <ResultBadge status={status} />
        </div>
        {stripHtml(details) ? <CardDescription>{stripHtml(details)}</CardDescription> : null}
      </CardHeader>}
      <CardContent className={compactQuestion ? "space-y-3" : "space-y-4"}>
        {stripHtml(passage) ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Passage</div>
            <div className="rounded-xl border bg-muted/10 p-4">
              <RichContent value={passage} />
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          {!compactQuestion && <div className="text-sm font-medium">Question</div>}
          <div className={compactQuestion ? "min-w-0" : "rounded-xl border p-4"}>
            <RichContent value={question} />
          </div>
        </div>
        <div className="space-y-2">
          {!compactQuestion && <div className="text-sm font-medium">Your answer</div>}
          <Textarea
            value={studentAnswer}
            onChange={(event) => {
              setStudentAnswer(event.target.value);
              setStatus("idle");
            }}
            aria-label={`${title} answer`}
            className={compactQuestion ? "min-h-[120px] w-full rounded-lg resize-y" : "min-h-24"}
            placeholder={compactQuestion ? "Write your answer..." : "Write your answer here..."}
          />
        </div>
        <ActionButtons
          onCheck={() => {
            setStatus(normalizeAnswer(studentAnswer) === normalizeAnswer(answer) ? "correct" : "incorrect");
            setShowAnswer(true);
          }}
          onReveal={() => setShowAnswer(true)}
        />
        {showAnswer ? (
          <div className="space-y-2 rounded-xl border border-dashed p-4">
            <div className="text-sm font-medium">Answer review</div>
            <RichContent value={answer} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
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
        <RichQuestionWithAnswers
          question={question}
          count={blanks.length}
          className="rounded-lg border border-border/60 bg-muted/10 p-3 sm:p-4"
          renderAnswer={(index) => {
            const blank = blanks[index];
            if (!blank) return null;
            return (
              <span data-slot="inline-blank" className="mx-1 my-0.5 inline-flex max-w-full align-middle">
                <Input
                  value={studentAnswers[blank.id] || ""}
                  onChange={(event) => {
                    setStudentAnswers((current) => ({ ...current, [blank.id]: event.target.value }));
                    setStatusByBlank((current) => ({ ...current, [blank.id]: "idle" }));
                  }}
                  aria-label={`Answer for blank ${index + 1}`}
                  data-answer-status={statusByBlank[blank.id] || "idle"}
                  placeholder={`${index + 1}`}
                  autoComplete="off"
                  className={cn(
                    "h-9 w-24 min-w-0 max-w-full rounded-lg bg-background px-2 text-center sm:w-32",
                    statusByBlank[blank.id] === "correct" && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
                    statusByBlank[blank.id] === "incorrect" && "border-red-500 bg-red-50 dark:bg-red-950/20",
                  )}
                />
              </span>
            );
          }}
        />

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
  title = "Suffix and Prefix",
  question,
  items,
  details,
}: {
  title?: string;
  question: string;
  items: Array<{ id: string; sortOrder: number; word: string; answer: string }>;
  details: string;
}) {
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
          <CardTitle className="text-lg">{title}</CardTitle>
          {hasChecked ? <ResultBadge status={allCorrect ? "correct" : "incorrect"} /> : null}
        </div>
        {stripHtml(details) ? <CardDescription>{stripHtml(details)}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        <RichQuestionWithAnswers
          question={question}
          count={items.length}
          mode="underlines"
          className="rounded-lg border border-border/60 bg-muted/10 p-3 sm:p-4"
          renderAnswer={(index) => {
            const item = items[index];
            if (!item) return null;
            return (
              <span className="mx-1 my-0.5 inline-flex max-w-full flex-wrap items-center gap-2 align-middle">
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
                    "h-9 w-24 min-w-0 max-w-full bg-background px-2 text-center sm:w-32",
                    statusByItem[item.id] === "correct" && "border-emerald-500 bg-emerald-50",
                    statusByItem[item.id] === "incorrect" && "border-red-500 bg-red-50",
                  )}
                />
              </span>
            );
          }}
        />

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

function ParagraphBlock({ body }: { body: string }) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg">Paragraph</CardTitle>
      </CardHeader>
      <CardContent className="rounded-xl border p-4">
        <RichContent value={body} />
      </CardContent>
    </Card>
  );
}

function VocabularyBlock({ entries, passage = "" }: { entries: VocabularyEntryRecord[]; passage?: string }) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg">Vocabulary</CardTitle>
        <CardDescription>Study the word list and meanings for this lesson.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {stripHtml(passage) ? (
          <div className="mb-4 rounded-xl border bg-muted/20 p-4">
            <RichContent value={passage} />
          </div>
        ) : null}
        {entries.map((entry, index) => (
          <div key={entry.id} className="rounded-xl border p-4">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">Word {index + 1}</Badge>
              <span className="font-medium">{entry.word || "Untitled word"}</span>
            </div>
            <div className="text-sm text-muted-foreground">{entry.meaning || "No meaning added."}</div>
          </div>
        ))}
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
  const splitTags = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg">Synonyms / Antonyms</CardTitle>
        <CardDescription>Review each word with meanings, synonyms, antonyms, and notes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stripHtml(passage) ? (
          <div className="rounded-xl border bg-muted/10 p-4">
            <RichContent value={passage} />
          </div>
        ) : null}
        {entries.map((entry, index) => (
          <div key={entry.id} className="rounded-xl border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline">Entry {index + 1}</Badge>
              <span className="font-medium">{entry.word || "Untitled word"}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">Meanings</div>
                <div className="text-sm text-muted-foreground">{entry.meanings || "No meanings added."}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Synonyms</div>
                <div className="flex flex-wrap gap-2">
                  {splitTags(entry.synonyms).length > 0 ? (
                    splitTags(entry.synonyms).map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No synonyms added.</span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Antonyms</div>
                <div className="flex flex-wrap gap-2">
                  {splitTags(entry.antonyms).length > 0 ? (
                    splitTags(entry.antonyms).map((item) => (
                      <Badge key={item} variant="outline">
                        {item}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No antonyms added.</span>
                  )}
                </div>
              </div>
              {stripHtml(entry.details) ? (
                <div className="space-y-1 md:col-span-2">
                  <div className="text-sm font-medium">Details</div>
                  <div className="rounded-xl border p-3">
                    <RichContent value={entry.details} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
  const isPaper = Boolean(useContext(ModelPaperMode));
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [statusByQuestion, setStatusByQuestion] = useState<Record<string, CheckStatus>>({});
  const [liveCheckEnabled, setLiveCheckEnabled] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  function getAnswerStatuses() {
    const nextStatus: Record<string, CheckStatus> = {};
    for (const question of questions) {
      const selected = [...(selectedAnswers[question.id] || [])].sort();
      const correct = question.options.filter((option) => option.isCorrect).map((option) => option.id).sort();
      if (isPaper && !correct.length) continue;
      nextStatus[question.id] = JSON.stringify(selected) === JSON.stringify(correct) ? "correct" : "incorrect";
    }
    return nextStatus;
  }

  function toggleOption(question: McqQuestionRecord, optionId: string, checked: boolean) {
    const previous = selectedAnswers[question.id] || [];
    let next: string[];
    if (question.answerMode === "single") {
      next = checked ? [optionId] : [];
    } else {
      next = checked ? [...previous, optionId] : previous.filter((value) => value !== optionId);
      next = Array.from(new Set(next));
    }

    setSelectedAnswers((current) => ({ ...current, [question.id]: next }));

    if (liveCheckEnabled) {
      const correct = question.options.filter((option) => option.isCorrect).map((option) => option.id).sort();
      setStatusByQuestion((statuses) => ({
        ...statuses,
        [question.id]: JSON.stringify([...next].sort()) === JSON.stringify(correct) ? "correct" : "incorrect",
      }));
    }
  }

  function checkAnswers() {
    const nextStatus = getAnswerStatuses();
    setStatusByQuestion(nextStatus);
    setShowAnswers(true);
  }

  function reviewAnswers() {
    setStatusByQuestion(getAnswerStatuses());
    setShowAnswers(true);
    setReviewOpen(true);
  }

  const correctCount = Object.values(statusByQuestion).filter((status) => status === "correct").length;
  const wrongCount = Object.values(statusByQuestion).filter((status) => status === "incorrect").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title || "Practice MCQ"}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {!isPaper ? <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <span>সঠিক/ভুল দেখান</span>
            <button
              type="button"
              role="switch"
              aria-checked={liveCheckEnabled}
              onClick={() => {
                const nextLiveCheckEnabled = !liveCheckEnabled;
                setLiveCheckEnabled(nextLiveCheckEnabled);

                if (nextLiveCheckEnabled) {
                  const nextStatuses: Record<string, CheckStatus> = {};
                  for (const question of questions) {
                    const selected = [...(selectedAnswers[question.id] || [])].sort();
                    if (selected.length === 0) continue;
                    const correct = question.options.filter((option) => option.isCorrect).map((option) => option.id).sort();
                    nextStatuses[question.id] = JSON.stringify(selected) === JSON.stringify(correct) ? "correct" : "incorrect";
                  }
                  setStatusByQuestion(nextStatuses);
                }
              }}
              className={cn(
                "relative inline-flex h-5 w-10 items-center rounded-full transition-colors",
                liveCheckEnabled ? "bg-primary" : "bg-muted-foreground/50",
              )}
            >
              <span
                className={cn(
                  "h-4 w-4 rounded-full bg-white shadow transition-transform",
                  liveCheckEnabled ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </label> : null}
          <ActionButtons onCheck={checkAnswers} onReveal={reviewAnswers} />
        </div>
      </div>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Answer Review</DialogTitle>
            <DialogDescription>এই ব্যাচের MCQ ফলাফল</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">{correctCount}</div>
              <div className="text-sm text-emerald-700">সঠিক উত্তর</div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{wrongCount}</div>
              <div className="text-sm text-red-700">ভুল উত্তর</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {stripHtml(passage) ? (
        <div className="rounded-xl border bg-muted/10 p-4">
          <RichContent value={passage} />
        </div>
      ) : null}
      {!isPaper ? <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <span>অনুশীলন করা হয়েছে</span>
      </div> : null}
      {questions.map((question, index) => (
        <Card key={question.id} className="rounded-2xl shadow-sm">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-start gap-3">
              <span className="relative shrink-0">
                <Badge className="h-7 min-w-7 justify-center rounded-md bg-sky-100 px-2 text-sky-700 hover:bg-sky-100">
                  {index + 1}
                </Badge>
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5 text-base font-medium leading-7">
                <RichContent value={question.prompt} />
              </div>
            </div>
            {!isPaper ? <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground"></span>
              <div className="inline-flex overflow-hidden rounded-full border">
                <Button type="button" variant="ghost" size="sm" className="h-8 rounded-none border-r px-3 text-xs">
                  <Flag className="mr-1.5 h-3.5 w-3.5" />
                  Flag
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 rounded-none px-3 text-xs">
                  <Heart className="mr-1.5 h-3.5 w-3.5" />
                  Fav
                </Button>
              </div>
            </div> : null}
          </CardHeader>
          <CardContent className="space-y-2">
            {question.options.map((option) => {
              const selectedOptions = selectedAnswers[question.id] || [];
              const checked = selectedOptions.includes(option.id);
              const hasAnswered = selectedOptions.length > 0;
              const feedbackVisible = showAnswers || (liveCheckEnabled && hasAnswered);
              const isCorrectOption = feedbackVisible && option.isCorrect;
              const isWrongSelection = feedbackVisible && hasAnswered && checked && !option.isCorrect;
              return (
                <label
                  key={option.id}
                  className={cn(
                    "group flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                    !isCorrectOption && !isWrongSelection && "border-border bg-muted/20 hover:border-sky-300 hover:bg-sky-50",
                    isCorrectOption && "border-emerald-400 bg-emerald-50 text-emerald-800",
                    isWrongSelection && "border-red-400 bg-red-50 text-red-800",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    className="sr-only"
                    onCheckedChange={(next) => {
                      toggleOption(question, option.id, Boolean(next));
                      setStatusByQuestion((current) => ({ ...current, [question.id]: "idle" }));
                    }}
                  />
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold text-muted-foreground",
                      checked && !isCorrectOption && !isWrongSelection && "border-primary bg-primary text-primary-foreground",
                      isCorrectOption && "border-emerald-500 bg-emerald-500 text-white",
                      isWrongSelection && "border-red-500 bg-red-500 text-white",
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">{option.text || "Empty option"}</span>
                  {isWrongSelection ? <XCircle className="h-5 w-5 shrink-0 text-red-500" /> : null}
                </label>
              );
            })}
            {showAnswers || (liveCheckEnabled && (selectedAnswers[question.id] || []).length > 0) ? (
              <div className="flex justify-end pt-2">
                <ResultBadge status={statusByQuestion[question.id] || "idle"} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
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

/** The displayed letters belong to the fixed question order, not the answer key. */
export function modelRearrangeQuestionText(value: string, index: number) {
  const label = modelRearrangeLetter(index);
  return value.replace(new RegExp(`^(\\s*(?:<[^>]+>\\s*)*)(?:\\(${label}\\)|${label}[.)])(?:\\s|&nbsp;)*`, "i"), "$1");
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
  const mode = useContext(ModelPaperMode);
  // Prompt-only papers already provide the safe book order. Preserve that
  // exact mapping when the full answer key arrives after Finish Test.
  const [questionIds] = useState<string[]>(() => mode || readModelRearrangeKey(rows).mode === "explicit"
    ? rows.map((row) => row.id)
    : createInitialSentenceOrder(rows));
  const [slots, setSlots] = useState<string[]>(() => rows.map(() => ""));
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [showCorrectOrder, setShowCorrectOrder] = useState(false);
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const questionRows = questionIds.flatMap((id) => { const row = rowById.get(id); return row ? [row] : []; });
  const letterById = new Map(questionIds.map((id, index) => [id, modelRearrangeLetter(index)]));
  const maxLetterLength = modelRearrangeLetter(Math.max(0, questionIds.length - 1)).length;
  // Never interpret the redacted prompt rows as the legacy answer key.
  const key = mode === "attempt" ? null : readModelRearrangeKey(rows);
  const correctLetters = key?.order.map((id) => letterById.get(id) || "") ?? [];
  const hasKey = correctLetters.length >= 2 && correctLetters.length === questionIds.length && correctLetters.every(Boolean);
  const errors = validateModelRearrangeSlots(slots, questionIds.length);

  function updateSlot(index: number, value: string) {
    const next = value.toLowerCase().replace(/[^a-z]/g, "").slice(0, maxLetterLength);
    setSlots((current) => current.map((item, i) => i === index ? next : item));
    setStatus("idle");
    setShowCorrectOrder(false);
  }

  function check() {
    if (!hasKey) { setStatus("idle"); return; }
    setStatus(!errors.some(Boolean) && slots.every((value, index) => value === correctLetters[index]) ? "correct" : "incorrect");
  }

  return (
    <Card className="rounded-xl">
      {!mode && <CardHeader className="space-y-3">
        <CardTitle className="text-lg">{title || "Rearrange Sentence"}</CardTitle>
        {instruction ? <CardDescription>{instruction}</CardDescription> : null}
      </CardHeader>}
      <CardContent className="space-y-3">
        {!mode && stripHtml(details) ? <RichContent value={details} /> : null}
        <ol className="space-y-1.5" aria-label="Mixed-up sentences">
          {questionRows.map((row, index) => (
            <li key={row.id} className="flex min-w-0 items-baseline gap-2">
              <span className="w-6 shrink-0 font-medium">{modelRearrangeLetter(index)})</span>
              <div className="min-w-0 flex-1"><RichContent value={modelRearrangeQuestionText(row.question, index)} /></div>
            </li>
          ))}
        </ol>
        <div className="grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,2.75rem),1fr))] gap-2" role="group" aria-label="Enter the correct letter sequence">
          {slots.map((value, index) => (
            <label key={index} className="flex w-full min-w-0 flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{index + 1}</span>
              <Input
                type="text"
                value={value}
                onChange={(event) => updateSlot(index, event.target.value)}
                aria-label={`Answer position ${index + 1}`}
                aria-invalid={Boolean(value && errors[index]) || undefined}
                title={value && errors[index] ? errors[index] : undefined}
                maxLength={maxLetterLength}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="h-11 w-full min-w-0 rounded-[6px] px-1 text-center font-medium lowercase"
              />
            </label>
          ))}
        </div>
        {slots.some((value, index) => value && errors[index]) && mode !== "review" ? (
          <p role="status" className="text-xs text-destructive">Use each question letter only once.</p>
        ) : null}
        <ResultBadge status={status} />
        {showCorrectOrder ? (
          <div className="space-y-1 text-sm">
            {hasKey ? <><span className="font-medium">Correct sequence: </span><span className="break-words text-primary">{correctLetters.join(" – ")}</span></> : <span className="text-muted-foreground">A valid answer key is not available for this question.</span>}
          </div>
        ) : null}
        <ActionButtons onCheck={check} onReveal={() => setShowCorrectOrder(true)} />
      </CardContent>
    </Card>
  );
}

// Two-column exam matching uses display labels, never the saved answer order.
function matchingLabel(index: number, columnIndex: number): string {
  let number = index + 1;
  if (columnIndex === 0) {
    let label = "";
    while (number > 0) {
      number--;
      label = String.fromCharCode(97 + number % 26) + label;
      number = Math.floor(number / 26);
    }
    return label;
  }
  let label = "";
  for (const [value, symbol] of [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]] as const) {
    while (number >= value) {
      label += symbol;
      number -= value;
    }
  }
  return label;
}

function matchingPrefix(text: string, columnIndex: number) {
  const match = text.match(/^\s*(?:\(([a-z]+)\)|([a-z]+)[.)])\s*/i);
  const code = (match?.[1] || match?.[2] || "").toLowerCase();
  // Single-letter labels are the normal Column A convention; Roman labels are
  // accepted only if canonical, to avoid treating ordinary words as numbers.
  const valid = columnIndex === 0 ? /^[a-z]$/.test(code) : /^(?=[mdclxvi]+$)m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/.test(code);
  return match && valid ? { code, text: text.slice(match[0].length).trim() } : null;
}

function matchingInputCode(text: string) {
  return text.trim().toLowerCase().replace(/^\(/, "").replace(/[.)]$/, "").trim();
}

function matchingChoices(table: TableCompletionDocumentRecord, question: string) {
  if (table.columns.length !== 2 || !table.rows.length || !table.answers.length) return null;
  const alternatives = question.replace(/<br\s*\/?\s*>|<\/(?:p|div|li)>/gi, "\n")
    .split("\n").map(stripHtml).filter(text => matchingPrefix(text, 1));
  const raw = table.columns.map((column, columnIndex) => table.rows.map((row, rowIndex) => {
    const cell = row.cells.find(item => item.columnId === column.id);
    return { id: cell?.id || "", text: stripHtml(cell?.text || ""), legacyAnswer: cell?.answer || "", mode: cell?.mode, rowIndex };
  }));
  // Older imports stored the visible choices in the question and only the
  // Roman answer code in Column B cells. Never display that private answer.
  const legacy = alternatives.length === table.rows.length && raw[1].every(cell => cell.mode === "answer" && !cell.text);
  if (legacy) raw[1] = raw[1].map((cell, index) => ({ ...cell, text: alternatives[index] }));
  if (raw.some(column => column.some(cell => !cell.id || !cell.text))) return null;
  const columns = raw.map((column, columnIndex) => {
    const reserved = new Set(column.map(cell => matchingPrefix(cell.text, columnIndex)?.code).filter(Boolean));
    const used = new Set<string>();
    return column.map((cell, index) => {
      const prefix = matchingPrefix(cell.text, columnIndex);
      let code = prefix?.code || "";
      if (!code || used.has(code)) {
        let next = index;
        code = matchingLabel(next, columnIndex);
        while (reserved.has(code) || used.has(code)) code = matchingLabel(++next, columnIndex);
      }
      used.add(code);
      return { ...cell, code, text: prefix?.text ?? cell.text };
    });
  });
  return { columns, legacy };
}

type MatchingChoices = NonNullable<ReturnType<typeof matchingChoices>>;

function matchingAnswerPairs(table: TableCompletionDocumentRecord, choices: MatchingChoices): string[][] {
  const [left, right] = choices.columns;
  if (choices.legacy) return left.flatMap((cell, index) => {
    const code = matchingInputCode(right[index]?.legacyAnswer || "");
    return right.some(option => option.code === code) ? [[cell.code, code]] : [];
  });
  return table.answers.flatMap(answer => {
    const pair = table.columns.map((column, index) => choices.columns[index].find(cell => cell.id === answer.selections.find(selection => selection.columnId === column.id)?.cellId)?.code || "");
    return pair.every(Boolean) ? [pair] : [];
  });
}

function matchingResponseStatuses(responses: string[][], pairs: string[][]): CheckStatus[] {
  const usedLeft = new Set<string>();
  const usedRight = new Set<string>();
  return responses.map(response => {
    const [left, right] = response.map(matchingInputCode);
    if (!left || !right) return "incorrect";
    if (usedLeft.has(left) || usedRight.has(right) || !pairs.some(pair => pair[0] === left && pair[1] === right)) return "incorrect";
    usedLeft.add(left);
    usedRight.add(right);
    return "correct";
  });
}

/** Shared two-column question table for online and printable model papers. */
export function ModelMatchingQuestionTable({ table, question }: { table: TableCompletionDocumentRecord; question: string }) {
  const choices = matchingChoices(table, question);
  if (!choices) return null;
  return (
    <table data-slot="model-matching-table" className="my-2 w-full table-fixed border-collapse text-left">
      <thead><tr>{["Column A", "Column B"].map(label => <th key={label} scope="col" className="w-1/2 border bg-muted/30 p-2 font-semibold">{label}</th>)}</tr></thead>
      <tbody>{choices.columns[0].map((cell, index) => <tr key={cell.id}>
        {choices.columns.map((column, columnIndex) => <td key={columnIndex} className="border p-2 align-top [overflow-wrap:anywhere]">
          <span className="flex items-baseline gap-1.5"><span className="shrink-0">{column[index].code})</span><span className="min-w-0">{column[index].text}</span></span>
        </td>)}
      </tr>)}</tbody>
    </table>
  );
}

export function hasModelMatchingQuestion(table: TableCompletionDocumentRecord, question: string) {
  return matchingChoices(table, question) !== null;
}

function ModelMatchingExercise({ table, question, choices }: { table: TableCompletionDocumentRecord; question: string; choices: MatchingChoices }) {
  const [responses, setResponses] = useState<Record<string, string[]>>({});
  const [review, setReview] = useState(false);
  const mode = useModelPaperReview(() => setReview(true));
  const pairs = review ? matchingAnswerPairs(table, choices) : [];
  const statuses = review ? matchingResponseStatuses(table.answers.map(answer => responses[answer.id] || ["", ""]), pairs) : [];
  return (
    <div className="min-w-0 space-y-3">
      <ModelMatchingQuestionTable table={table} question={question} />
      <div data-slot="model-matching-answers" role="group" aria-label="Matching answers, select a letter and Roman numeral" className="grid w-full min-w-0 grid-cols-2 gap-2" data-print-hide="true">
        {table.answers.map((answer, rowIndex) => {
          const status = statuses[rowIndex];
          return <div key={answer.id} className="contents">
            {[0, 1].map(columnIndex => <TableCompletionChoiceCombobox key={columnIndex}
              options={choices.columns[columnIndex].map(cell => ({ id: cell.code, label: `${cell.code}) ${cell.text}` }))}
              ariaLabel={`Answer ${rowIndex + 1}, Column ${columnIndex === 0 ? "A (letter)" : "B (Roman numeral)"}`}
              placeholder={columnIndex === 0 ? "Column A" : "Column B"}
              wrapOptions
              value={responses[answer.id]?.[columnIndex] || ""} disabled={mode === "review"}
              onChange={value => {
                setResponses(current => {
                  const next = [...(current[answer.id] || ["", ""])];
                  next[columnIndex] = value;
                  return { ...current, [answer.id]: next };
                });
              }}
              className={cn("h-11 min-w-0 rounded-lg bg-background has-[[data-slot=input-group-control]:focus-visible]:border-primary has-[[data-slot=input-group-control]:focus-visible]:ring-0", review && status === "correct" && "border-primary", review && pairs.length > 0 && status === "incorrect" && "border-destructive")}
            />)}
          </div>;
        })}
      </div>
      {review && <div className="text-sm" aria-label="Answer key">
        {pairs.length ? <><span className="font-semibold">Answer key: </span>{pairs.map(pair => `${pair[0]}) – ${pair[1]})`).join(", ")}</> : "Answer key not configured."}
      </div>}
    </div>
  );
}

function TableCompletionBlock({
  title,
  instruction,
  details,
  table,
  question = "",
}: {
  title: string;
  instruction: string;
  details: string;
  table: TableCompletionDocumentRecord;
  question?: string;
}) {
  const [selections, setSelections] = useState<Record<string, Record<string, string>>>({});
  const [statusByAnswer, setStatusByAnswer] = useState<Record<string, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  const paperMode = useContext(ModelPaperMode);
  const choices = paperMode ? matchingChoices(table, question) : null;
  if (choices) return <ModelMatchingExercise table={table} question={question} choices={choices} />;

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

export function modelSynonymsAntonymsPrompt(entry: Pick<SynonymsAntonymsEntryRecord, "word" | "answerType">) {
  const mode = normalizeSynonymsAntonymsAnswerType(entry.answerType);
  return `${entry.word.trim()} (${mode === "both" ? "synonym / antonym" : mode})`;
}

export function modelSynonymsAntonymsItemLabel(index: number) {
  return `${index < 26 ? String.fromCharCode(97 + index) : index + 1})`;
}

function QuestionAnswerRowsBlock({
  title,
  rows,
  details,
  hideHeader = false,
  letteredItems = false,
  compactLetterLabels = false,
}: {
  title: string;
  rows: Array<{ id: string; question: string; answer: string }>;
  details: string;
  hideHeader?: boolean;
  letteredItems?: boolean;
  compactLetterLabels?: boolean;
}) {
  const AnswerField = useContext(ModelPaperManualReview) ? Textarea : Input;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [statusByRow, setStatusByRow] = useState<Record<string, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);
  const description = stripHtml(details);
  const visibleDetails = letteredItems
    ? description.replace(/Answer\s+all\s+five\s+questions\.\s*2\s*[×xX*]\s*5\s*=\s*10\.?/gi, "").trim()
    : description;

  return (
    <Card className="rounded-xl">
      {!hideHeader && <CardHeader className="space-y-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        {visibleDetails ? <CardDescription>{visibleDetails}</CardDescription> : null}
      </CardHeader>}
      <CardContent className="space-y-4">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-xl border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline">{compactLetterLabels ? modelSynonymsAntonymsItemLabel(index) : letteredItems ? `(${index < 26 ? String.fromCharCode(97 + index) : index + 1})` : `Item ${index + 1}`}</Badge>
              <ResultBadge status={statusByRow[row.id] || "idle"} />
            </div>
            <div className="mb-3 rounded-xl border p-4">
              <RichContent value={row.question} />
            </div>
            <AnswerField
              aria-label={`${title}, answer ${index + 1}`}
              value={answers[row.id] || ""}
              onChange={(event) => {
                setAnswers((current) => ({ ...current, [row.id]: event.target.value }));
                setStatusByRow((current) => ({ ...current, [row.id]: "idle" }));
              }}
              placeholder="Write your answer..."
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

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">Tag Question</CardTitle>
        {stripHtml(details) ? <CardDescription>{stripHtml(details)}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row, index) => {
          return (
            <div key={row.id} className="rounded-xl border p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline">Item {index + 1}</Badge>
                <ResultBadge status={statusByRow[row.id] || "idle"} />
              </div>

              <RichQuestionWithAnswers
                question={row.question}
                count={1}
                appendMissing
                className="rounded-lg border border-border/60 bg-muted/10 p-3 sm:p-4"
                renderAnswer={() => (
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
                )}
              />

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
  const [answers, setAnswers] = useState<Record<string, TrueFalseResponse>>({});
  const [checkedByRow, setCheckedByRow] = useState<Record<string, boolean>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">{title || "True / False"}</CardTitle>
        {instruction ? <CardDescription>{instruction}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {stripHtml(passage) ? (
          <div className="rounded-xl border p-4">
            <RichContent value={passage} />
          </div>
        ) : null}
        {rows.map((row, index) => (
          <TrueFalseQuestionRow key={row.id} row={row} index={index} response={answers[row.id]}
            checked={Boolean(checkedByRow[row.id])} preview={showAnswers}
            onChange={(response) => {
              setAnswers((current) => ({ ...current, [row.id]: response }));
              setCheckedByRow((current) => ({ ...current, [row.id]: false }));
            }} />
        ))}
        <ActionButtons
          onCheck={() => {
            setCheckedByRow(Object.fromEntries(rows.map((row) => [row.id, true])));
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
}: {
  block: StudentContentRecord["blocks"][number];
  content: Pick<StudentContentRecord, "blocks">;
}) {
  const isPaper = Boolean(useContext(ModelPaperMode));
  function resolvePassage(record: {
    passage?: string;
    passageSource?: string;
    paragraphBlockId?: string | null;
    resolvedPassage?: string;
  } | null | undefined) {
    if (isPaper || !record) return "";
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
  if (block.kind === "seen-passage-one" && block.seenPassageOne) return <ParagraphBlock body={block.seenPassageOne.body} />;
  if (block.kind === "seen-passage-two" && block.seenPassageTwo) return <ParagraphBlock body={block.seenPassageTwo.body} />;
  if (block.kind === "vocabulary" && block.vocabulary) {
    return <VocabularyBlock entries={block.vocabulary.entries} passage={resolvePassage(block.vocabulary)} />;
  }
  if (block.kind === "synonyms-antonyms" && block.synonymsAntonyms) {
    if (isPaper) {
      return <QuestionAnswerRowsBlock
        title="Synonyms / Antonyms"
        letteredItems={true}
        compactLetterLabels={true}
        rows={block.synonymsAntonyms.entries.filter(entry => entry.word.trim()).map(entry => {
          const mode = normalizeSynonymsAntonymsAnswerType(entry.answerType);
          const question = escapePaperText(modelSynonymsAntonymsPrompt(entry));
          const answer = mode === "synonym"
            ? entry.synonyms || ""
            : mode === "antonym"
              ? entry.antonyms || ""
              : [entry.synonyms && `Synonyms: ${entry.synonyms}`, entry.antonyms && `Antonyms: ${entry.antonyms}`]
                  .filter(Boolean).join(" · ");
          return { id: entry.id, question, answer: escapePaperText(answer) };
        })}
        details=""
      />;
    }

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
        passage={isPaper ? "" : block.trueFalseExercise.passage}
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
          question={block.questionAnswerExercise.question}
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
          question={block.questionAnswerExercise.question}
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

  if (block.questionAnswerExercise && ["question-answer", "question-from-poems", "question-from-story", "writing-summary"].includes(block.kind)) {
    return block.questionAnswerExercise.rows.length > 0 ? (
      <QuestionAnswerRowsBlock
        title={block.questionAnswerExercise.title || threeFieldBlockLabels[block.kind] || "Exercise"}
        rows={block.questionAnswerExercise.rows}
        letteredItems={isPaper && ["question-answer", "question-from-poems", "question-from-story"].includes(block.kind)}
        hideHeader={isPaper && block.kind === "writing-summary"}
        details={block.questionAnswerExercise.details || block.questionAnswerExercise.instruction}
      />
    ) : (
      <ThreeFieldExerciseBlock
        title={block.questionAnswerExercise.title || threeFieldBlockLabels[block.kind] || "Exercise"}
        question={block.questionAnswerExercise.question}
        answer={block.questionAnswerExercise.answer}
        hideHeader={isPaper && block.kind === "writing-summary"}
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
    return block.substitutionTable.table.rows.length > 0 || block.substitutionTable.table.answers.length > 0 || block.substitutionTable.answer.trim().startsWith("{") ? (
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
        letteredItems={isPaper}
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

  if (block.kind === "parts-of-speech" && block.partsOfSpeech) {
    return block.partsOfSpeech.items.length ? (
      <SuffixPrefixExerciseBlock
        title="Parts of Speech"
        question={block.partsOfSpeech.question}
        items={block.partsOfSpeech.items}
        details={block.partsOfSpeech.details}
      />
    ) : <ThreeFieldExerciseBlock title="Parts of Speech" question={block.partsOfSpeech.question} answer={block.partsOfSpeech.answer} details={block.partsOfSpeech.details} />;
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
        compactQuestion={isPaper && block.kind === "punctuation-and-capitalization"}
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
}: {
  content: StudentContentRecord;
  title?: string;
  description?: string;
  showHeader?: boolean;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-4">
      {showHeader ? (
        <>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{content.blocks.length} blocks</Badge>
            <Badge variant="secondary">{content.topicId ? "Topic-level content" : "Lesson-level content"}</Badge>
          </div>
        </>
      ) : null}
      {content.blocks.length > 0 ? (
        <div className="space-y-4">
          {content.blocks.map((block) => (
            <StudentBlockCard key={block.id} block={block} content={content} />
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


function escapePaperText(text: string) {
  return text.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char] || char);
}

/** Adapter only: native and older imported questions use the existing student cards. */
export function StudentModelPaperQuestion({ entry, blocks }: {
  entry: ModelPaperEntry;
  blocks: StudentContentRecord["blocks"];
}) {
  const native = entry.native;
  const imported = entry.imported;
  if (!native && !imported) return null;
  const manual = imported ? !imported.mcq :
    native?.kind === "synonyms-antonyms" || native?.kind === "writing-summary" ||
    native?.kind === "question-answer" || native?.kind === "question-from-poems" || native?.kind === "question-from-story" ||
    native?.kind === "narration" || native?.kind === "changing-sentence" || native?.kind === "punctuation-and-capitalization";
  return (
    <ModelPaperManualReview.Provider value={manual}>
      {native ? <StudentBlockCard block={native} content={{ blocks }} /> : imported?.mcq ? (
        <McqBlock title={entry.title} description={imported.instructions} passage={imported.passage} questions={[imported.mcq]} />
      ) : imported ? (
        <ThreeFieldExerciseBlock title={entry.title} question={imported.question} answer={imported.answer} details={imported.instructions} passage={imported.passage} />
      ) : null}
    </ModelPaperManualReview.Provider>
  );
}
