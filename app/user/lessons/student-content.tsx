"use client";

import { useState } from "react";
import { CheckCircle2, CircleHelp, Eye, Flag, Heart, XCircle } from "lucide-react";

import type {
  ContentBlockKind,
  ContentRecordWithBlocks,
  McqQuestionRecord,
  SynonymsAntonymsEntryRecord,
  TrueFalseRowRecord,
  VocabularyEntryRecord,
} from "@/app/admin/content/content-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  "column-matching": "Column Matching",
  "sentence-ordering": "Sentence Ordering",
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
      )}
      dangerouslySetInnerHTML={{ __html: value }}
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
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" className="cursor-pointer" onClick={onCheck}>
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Check Answer
      </Button>
      <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={onReveal}>
        <Eye className="mr-2 h-4 w-4" />
        Review Answer
      </Button>
    </div>
  );
}

function ThreeFieldExerciseBlock({
  title,
  question,
  answer,
  details,
}: {
  title: string;
  question: string;
  answer: string;
  details: string;
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
            }}
            className="min-h-24"
            placeholder="Write your answer here..."
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

function VocabularyBlock({ entries }: { entries: VocabularyEntryRecord[] }) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg">Vocabulary</CardTitle>
        <CardDescription>Study the word list and meanings for this lesson.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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

function SynonymsAntonymsBlock({ entries }: { entries: SynonymsAntonymsEntryRecord[] }) {
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

function McqBlock({ title, description, questions }: { title: string; description: string; questions: McqQuestionRecord[] }) {
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
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
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
          </label>
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <span>অনুশীলন করা হয়েছে</span>
      </div>
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
            <div className="flex items-center justify-between gap-3">
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
            </div>
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

function QuestionAnswerRowsBlock({
  title,
  rows,
  details,
}: {
  title: string;
  rows: Array<{ id: string; question: string; answer: string }>;
  details: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [statusByRow, setStatusByRow] = useState<Record<string, CheckStatus>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        {stripHtml(details) ? <CardDescription>{stripHtml(details)}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-xl border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline">Item {index + 1}</Badge>
              <ResultBadge status={statusByRow[row.id] || "idle"} />
            </div>
            <div className="mb-3 rounded-xl border p-4">
              <RichContent value={row.question} />
            </div>
            <Input
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

function StudentBlockCard({ block }: { block: StudentContentRecord["blocks"][number] }) {
  if (block.kind === "paragraph" && block.paragraph) return <ParagraphBlock body={block.paragraph.body} />;
  if (block.kind === "vocabulary" && block.vocabulary) return <VocabularyBlock entries={block.vocabulary.entries} />;
  if (block.kind === "synonyms-antonyms" && block.synonymsAntonyms) {
    return <SynonymsAntonymsBlock entries={block.synonymsAntonyms.entries} />;
  }
  if (block.kind === "mcq" && block.mcqSection) {
    return <McqBlock title={block.mcqSection.title} description={block.mcqSection.description} questions={block.mcqSection.questions} />;
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
  if (block.questionAnswerExercise && ["question-answer", "table-completion", "column-matching", "sentence-ordering"].includes(block.kind)) {
    return block.questionAnswerExercise.rows.length > 0 ? (
      <QuestionAnswerRowsBlock
        title={block.questionAnswerExercise.title || threeFieldBlockLabels[block.kind] || "Exercise"}
        rows={block.questionAnswerExercise.rows}
        details={block.questionAnswerExercise.details || block.questionAnswerExercise.instruction}
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

  const threeFieldMap = {
    "gap-fill": block.gapFill,
    "gap-fill-first-paper": block.gapFillFirstPaper,
    "gap-fill-second-paper": block.gapFillSecondPaper,
    "information-transfer": block.informationTransfer,
    "substitution-table": block.substitutionTable,
    "right-form-of-verb": block.rightFormOfVerb,
    narration: block.narration,
    "changing-sentence": block.changingSentence,
    "punctuation-and-capitalization": block.punctuationAndCapitalization,
    preposition: block.preposition,
    "suffix-and-prefix": block.suffixAndPrefix,
    "tag-question": block.tagQuestion,
    connector: block.connector,
  } as const;

  const threeFieldBlock = threeFieldMap[block.kind as keyof typeof threeFieldMap];

  if (threeFieldBlock) {
    return (
      <ThreeFieldExerciseBlock
        title={threeFieldBlockLabels[block.kind] || "Exercise"}
        question={threeFieldBlock.question}
        answer={threeFieldBlock.answer}
        details={threeFieldBlock.details}
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
    <div className="space-y-4">
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
            <StudentBlockCard key={block.id} block={block} />
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
