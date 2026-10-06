"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Eye,
  FileText,
  Layers3,
  NotebookPen,
  Tag,
  XCircle,
} from "lucide-react";

import type {
  ContentBlockKind,
  ContentRecordWithBlocks,
  McqQuestionRecord,
  TableCompletionDocumentRecord,
  TrueFalseRowRecord,
  VocabularyEntryRecord,
  SynonymsAntonymsEntryRecord,
} from "@/app/admin/content/content-types";
import { EntityVisual } from "@/components/app/EntityVisual";
import { TableCompletionChoiceCombobox } from "@/components/app/TableCompletionChoiceCombobox";
import { SubstitutionTableExercise } from "@/components/app/SubstitutionTableExercise";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";

type ClassRecord = {
  id: string;
  name: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type SubjectRecord = {
  id: string;
  classId: string;
  name: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type UnitRecord = {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  unitNumber: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type LessonRecord = {
  id: string;
  unitId: string;
  title: string;
  lessonNumber: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type TopicRecord = {
  id: string;
  lessonId: string;
  title: string;
  topicNumber: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type SerializedContentRecord = Omit<ContentRecordWithBlocks, "createdAt"> & {
  createdAt: string;
};

type UserLessonsBrowserProps = {
  classes: ClassRecord[];
  subjects: SubjectRecord[];
  units: UnitRecord[];
  lessons: LessonRecord[];
  topics: TopicRecord[];
  contents: SerializedContentRecord[];
};

type BrowserStep = "class" | "subject" | "unit" | "lesson" | "topic" | "content" | "viewer";
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

function formatUnitLabel(unit: UnitRecord) {
  return unit.unitNumber ? `${unit.unitNumber} · ${unit.title}` : unit.title;
}

function formatLessonLabel(lesson: LessonRecord) {
  return lesson.lessonNumber ? `${lesson.lessonNumber} · ${lesson.title}` : lesson.title;
}

function formatTopicLabel(topic: TopicRecord) {
  return topic.topicNumber ? `${topic.topicNumber} · ${topic.title}` : topic.title;
}

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
  if (!stripHtml(value)) {
    return null;
  }

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
      Review needed
    </Badge>
  );
}

function ActionButtons({
  onCheck,
  onReveal,
}: {
  onCheck: () => void;
  onReveal: () => void;
}) {
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
  title = "Fill in the Blanks",
}: {
  question: string;
  blanks: Array<{ id: string; sortOrder: number; answer: string }>;
  details: string;
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
        <div className="rounded-xl border bg-muted/10 p-4 text-base leading-9 whitespace-pre-wrap">
          {segments.map((segment, index) => {
            const blank = blanks[index];
            return (
              <span key={`${index}-${blank?.id || "tail"}`}>
                {segment}
                {blank ? (
                  <span className="mx-1 inline-flex align-middle">
                    <Input
                      value={studentAnswers[blank.id] || ""}
                      onChange={(event) => {
                        setStudentAnswers((current) => ({ ...current, [blank.id]: event.target.value }));
                        setStatusByBlank((current) => ({ ...current, [blank.id]: "idle" }));
                      }}
                      aria-label={`Answer for blank ${index + 1}`}
                      placeholder={`${index + 1}`}
                      className={cn(
                        "h-9 min-w-28 w-36 bg-background px-2 text-center sm:w-44",
                        statusByBlank[blank.id] === "correct" && "border-emerald-500 bg-emerald-50",
                        statusByBlank[blank.id] === "incorrect" && "border-red-500 bg-red-50",
                      )}
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

function VocabularyBlock({
  entries,
}: {
  entries: VocabularyEntryRecord[];
}) {
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

function SynonymsAntonymsBlock({
  entries,
}: {
  entries: SynonymsAntonymsEntryRecord[];
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
  const [showAnswers, setShowAnswers] = useState(false);

  function toggleOption(question: McqQuestionRecord, optionId: string, checked: boolean) {
    setSelectedAnswers((current) => {
      const previous = current[question.id] || [];

      if (question.answerMode === "single") {
        return { ...current, [question.id]: checked ? [optionId] : [] };
      }

      const next = checked ? [...previous, optionId] : previous.filter((value) => value !== optionId);
      return { ...current, [question.id]: Array.from(new Set(next)) };
    });
  }

  function checkAnswers() {
    const nextStatus: Record<string, CheckStatus> = {};

    for (const question of questions) {
      const selected = [...(selectedAnswers[question.id] || [])].sort();
      const correct = question.options
        .filter((option) => option.isCorrect)
        .map((option) => option.id)
        .sort();

      nextStatus[question.id] =
        JSON.stringify(selected) === JSON.stringify(correct) ? "correct" : "incorrect";
    }

    setStatusByQuestion(nextStatus);
    setShowAnswers(true);
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">{title || "MCQ Section"}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {questions.map((question, index) => (
          <div key={question.id} className="rounded-xl border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Question {index + 1}</Badge>
                <span className="text-sm text-muted-foreground">
                  {question.answerMode === "multiple" ? "Multiple correct" : "Single correct"}
                </span>
              </div>
              <ResultBadge status={statusByQuestion[question.id] || "idle"} />
            </div>
            <div className="mb-4 rounded-xl border p-4">
              <RichContent value={question.prompt} />
            </div>
            <div className="space-y-3">
              {question.options.map((option) => {
                const checked = (selectedAnswers[question.id] || []).includes(option.id);

                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        toggleOption(question, option.id, Boolean(next));
                        setStatusByQuestion((current) => ({ ...current, [question.id]: "idle" }));
                      }}
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.text || "Empty option"}</div>
                      {showAnswers && option.isCorrect ? (
                        <Badge variant="secondary">Correct option</Badge>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <ActionButtons onCheck={checkAnswers} onReveal={() => setShowAnswers(true)} />
      </CardContent>
    </Card>
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
                <div className="mb-1 font-medium">
                  Correct answer: {row.expectedAnswer ? "True" : "False"}
                </div>
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
}: {
  block: SerializedContentRecord["blocks"][number];
}) {
  if (block.kind === "paragraph" && block.paragraph) {
    return <ParagraphBlock body={block.paragraph.body} />;
  }

  if (block.kind === "vocabulary" && block.vocabulary) {
    return <VocabularyBlock entries={block.vocabulary.entries} />;
  }

  if (block.kind === "synonyms-antonyms" && block.synonymsAntonyms) {
    return <SynonymsAntonymsBlock entries={block.synonymsAntonyms.entries} />;
  }

  if (block.kind === "mcq" && block.mcqSection) {
    return (
      <McqBlock
        title={block.mcqSection.title}
        description={block.mcqSection.description}
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

  if (block.kind === "question-answer" && block.questionAnswerExercise) {
    return block.questionAnswerExercise.rows.length > 0 ? (
      <QuestionAnswerRowsBlock
        title={block.questionAnswerExercise.title || "Question Answer"}
        rows={block.questionAnswerExercise.rows}
        details={block.questionAnswerExercise.details || block.questionAnswerExercise.instruction}
      />
    ) : (
      <ThreeFieldExerciseBlock
        title={block.questionAnswerExercise.title || "Question Answer"}
        question={block.questionAnswerExercise.question}
        answer={block.questionAnswerExercise.answer}
        details={block.questionAnswerExercise.details || block.questionAnswerExercise.instruction}
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

  if ((block.kind === "question-from-poems" || block.kind === "question-from-story") && block.questionAnswerExercise) {
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

  if (block.kind === "gap-fill" && block.gapFill) {
    return (
      <ThreeFieldExerciseBlock
        title="Gap Fill"
        question={block.gapFill.question}
        answer={block.gapFill.answer}
        details={block.gapFill.details}
      />
    );
  }

  if (block.kind === "gap-fill-first-paper" && block.gapFillFirstPaper) {
    return (
      <FillInTheBlanksBlock
        question={block.gapFillFirstPaper.question}
        blanks={block.gapFillFirstPaper.blanks}
        details={block.gapFillFirstPaper.details}
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

  if (block.kind === "information-transfer" && block.informationTransfer) {
    return (
      <FillInTheBlanksBlock
        title="Information Transfer"
        question={block.informationTransfer.question}
        blanks={block.informationTransfer.blanks}
        details={block.informationTransfer.details}
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

  if (block.kind === "narration" && block.narration) {
    return (
      <ThreeFieldExerciseBlock
        title="Narration"
        question={block.narration.question}
        answer={block.narration.answer}
        details={block.narration.details}
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

  if (block.kind === "punctuation-and-capitalization" && block.punctuationAndCapitalization) {
    return (
      <ThreeFieldExerciseBlock
        title="Punctuation and Capitalization"
        question={block.punctuationAndCapitalization.question}
        answer={block.punctuationAndCapitalization.answer}
        details={block.punctuationAndCapitalization.details}
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

function StepHeader({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      {onBack ? (
        <Button type="button" variant="outline" size="sm" className="cursor-pointer self-start" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      ) : null}
    </div>
  );
}

export default function UserLessonsBrowser({
  classes,
  subjects,
  units,
  lessons,
  topics,
  contents,
}: UserLessonsBrowserProps) {
  const [step, setStep] = useState<BrowserStep>("class");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((item) => item.id === selectedSubjectId) ?? null,
    [selectedSubjectId, subjects],
  );
  const selectedUnit = useMemo(
    () => units.find((item) => item.id === selectedUnitId) ?? null,
    [selectedUnitId, units],
  );
  const selectedLesson = useMemo(
    () => lessons.find((item) => item.id === selectedLessonId) ?? null,
    [lessons, selectedLessonId],
  );
  const selectedTopic = useMemo(
    () => topics.find((item) => item.id === selectedTopicId) ?? null,
    [selectedTopicId, topics],
  );
  const selectedContent = useMemo(
    () => contents.find((item) => item.id === selectedContentId) ?? null,
    [contents, selectedContentId],
  );

  const visibleSubjects = useMemo(
    () => subjects.filter((item) => item.classId === selectedClassId),
    [selectedClassId, subjects],
  );
  const visibleUnits = useMemo(
    () => units.filter((item) => item.classId === selectedClassId && item.subjectId === selectedSubjectId),
    [selectedClassId, selectedSubjectId, units],
  );
  const visibleLessons = useMemo(
    () => lessons.filter((item) => item.unitId === selectedUnitId),
    [lessons, selectedUnitId],
  );
  const lessonContents = useMemo(
    () =>
      contents.filter(
        (item) =>
          item.classId === selectedClassId &&
          item.subjectId === selectedSubjectId &&
          item.unitId === selectedUnitId &&
          item.lessonId === selectedLessonId,
      ),
    [contents, selectedClassId, selectedLessonId, selectedSubjectId, selectedUnitId],
  );
  const visibleTopics = useMemo(() => {
    const topicIds = new Set(lessonContents.map((item) => item.topicId).filter(Boolean));
    return topics.filter((item) => item.lessonId === selectedLessonId && topicIds.has(item.id));
  }, [lessonContents, selectedLessonId, topics]);
  const lessonLevelContents = useMemo(
    () => lessonContents.filter((item) => !item.topicId),
    [lessonContents],
  );
  const topicLevelContents = useMemo(
    () => lessonContents.filter((item) => item.topicId === selectedTopicId),
    [lessonContents, selectedTopicId],
  );
  const contentCandidates = selectedTopicId ? topicLevelContents : lessonLevelContents;
  const classSubjectCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const subject of subjects) {
      counts.set(subject.classId, (counts.get(subject.classId) ?? 0) + 1);
    }

    return counts;
  }, [subjects]);

  const pathBadges = (
    <div className="flex flex-wrap items-center gap-2">
      {selectedClass ? <Badge variant="secondary">{selectedClass.name}</Badge> : null}
      {selectedSubject ? <Badge variant="secondary">{selectedSubject.name}</Badge> : null}
      {selectedUnit ? <Badge variant="secondary">{formatUnitLabel(selectedUnit)}</Badge> : null}
      {selectedLesson ? <Badge variant="secondary">{formatLessonLabel(selectedLesson)}</Badge> : null}
      {selectedTopic ? <Badge variant="secondary">{formatTopicLabel(selectedTopic)}</Badge> : null}
      {selectedContent ? (
        <Badge variant="secondary">{selectedContent.topicId ? "Topic content" : "Lesson content"}</Badge>
      ) : null}
    </div>
  );

  let panel: React.ReactNode = null;

  if (step === "class") {
    panel = (
      <>
        <StepHeader title="Select class" description="Choose a class to start browsing its lesson hierarchy." />
        <Separator />
        <div className="grid gap-3 md:grid-cols-3">
          {classes.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="outline"
              className="h-auto cursor-pointer justify-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                setSelectedClassId(item.id);
                setSelectedSubjectId(null);
                setSelectedUnitId(null);
                setSelectedLessonId(null);
                setSelectedTopicId(null);
                setSelectedContentId(null);
                setStep("subject");
              }}
            >
              <div className="flex w-full items-start gap-3">
                <EntityVisual
                  title={item.name}
                  iconType={item.iconType}
                  iconName={item.iconName}
                  iconColor={item.iconColor}
                  imagePath={item.imagePath}
                  className="mt-0.5 h-12 w-12 rounded-2xl"
                />
                <div className="min-w-0 space-y-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {classSubjectCounts.get(item.id) ?? 0} published subjects
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </>
    );
  }

  if (step === "subject") {
    panel = (
      <>
        <StepHeader
          title="Subjects"
          description={`Published subjects for ${selectedClass?.name ?? "the selected class"}.`}
          onBack={() => {
            setSelectedClassId(null);
            setSelectedSubjectId(null);
            setSelectedUnitId(null);
            setSelectedLessonId(null);
            setSelectedTopicId(null);
            setSelectedContentId(null);
            setStep("class");
          }}
        />
        <Separator />
        {visibleSubjects.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleSubjects.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className="h-auto cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                onClick={() => {
                  setSelectedSubjectId(item.id);
                  setSelectedUnitId(null);
                  setSelectedLessonId(null);
                  setSelectedTopicId(null);
                  setSelectedContentId(null);
                  setStep("unit");
                }}
              >
                <div className="flex items-center gap-3">
                  <EntityVisual
                    title={item.name}
                    iconType={item.iconType}
                    iconName={item.iconName}
                    iconColor={item.iconColor}
                    imagePath={item.imagePath}
                    className="h-10 w-10 rounded-2xl"
                  />
                  <span>{item.name}</span>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No published subjects found for this class.
          </div>
        )}
      </>
    );
  }

  if (step === "unit") {
    panel = (
      <>
        <StepHeader
          title="Units"
          description={`Published units for ${selectedSubject?.name ?? "the selected subject"}.`}
          onBack={() => {
            setSelectedSubjectId(null);
            setSelectedUnitId(null);
            setSelectedLessonId(null);
            setSelectedTopicId(null);
            setSelectedContentId(null);
            setStep("subject");
          }}
        />
        <Separator />
        {visibleUnits.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleUnits.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className="h-auto cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                onClick={() => {
                  setSelectedUnitId(item.id);
                  setSelectedLessonId(null);
                  setSelectedTopicId(null);
                  setSelectedContentId(null);
                  setStep("lesson");
                }}
              >
                <div className="flex items-center gap-3">
                  <EntityVisual
                    title={item.title}
                    iconType={item.iconType}
                    iconName={item.iconName}
                    iconColor={item.iconColor}
                    imagePath={item.imagePath}
                    className="h-10 w-10 rounded-2xl"
                  />
                  <span>{formatUnitLabel(item)}</span>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No published units found for this subject.
          </div>
        )}
      </>
    );
  }

  if (step === "lesson") {
    panel = (
      <>
        <StepHeader
          title="Lessons"
          description={`Published lessons for ${selectedUnit ? formatUnitLabel(selectedUnit) : "the selected unit"}.`}
          onBack={() => {
            setSelectedUnitId(null);
            setSelectedLessonId(null);
            setSelectedTopicId(null);
            setSelectedContentId(null);
            setStep("unit");
          }}
        />
        <Separator />
        {visibleLessons.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleLessons.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className="h-auto cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                onClick={() => {
                  const nextLessonContents = contents.filter(
                    (content) =>
                      content.classId === selectedClassId &&
                      content.subjectId === selectedSubjectId &&
                      content.unitId === selectedUnitId &&
                      content.lessonId === item.id,
                  );
                  const hasTopicLevelContent = nextLessonContents.some((content) => Boolean(content.topicId));

                  setSelectedLessonId(item.id);
                  setSelectedTopicId(null);
                  setSelectedContentId(null);
                  setStep(hasTopicLevelContent ? "topic" : "content");
                }}
              >
                <div className="flex items-center gap-3">
                  <EntityVisual
                    title={item.title}
                    iconType={item.iconType}
                    iconName={item.iconName}
                    iconColor={item.iconColor}
                    imagePath={item.imagePath}
                    className="h-10 w-10 rounded-2xl"
                  />
                  <span>{formatLessonLabel(item)}</span>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No published lessons found for this unit.
          </div>
        )}
      </>
    );
  }

  if (step === "topic") {
    panel = (
      <>
        <StepHeader
          title="Topics"
          description={`Select a topic for ${selectedLesson ? formatLessonLabel(selectedLesson) : "the selected lesson"}.`}
          onBack={() => {
            setSelectedLessonId(null);
            setSelectedTopicId(null);
            setSelectedContentId(null);
            setStep("lesson");
          }}
        />
        <Separator />
        <div className="space-y-4">
          {lessonLevelContents.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
              onClick={() => {
                setSelectedTopicId(null);
                setSelectedContentId(null);
                setStep("content");
              }}
            >
              <div className="space-y-1">
                <div className="font-medium">Open lesson-level content</div>
                <div className="text-sm text-muted-foreground">
                  {lessonLevelContents.length} content record{lessonLevelContents.length > 1 ? "s" : ""} directly under the lesson
                </div>
              </div>
            </Button>
          ) : null}

          {visibleTopics.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {visibleTopics.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="outline"
                  className="h-auto cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                  onClick={() => {
                    setSelectedTopicId(item.id);
                    setSelectedContentId(null);
                    setStep("content");
                  }}
                  >
                    <div className="flex items-center gap-3">
                      <EntityVisual
                        title={item.title}
                        iconType={item.iconType}
                        iconName={item.iconName}
                        iconColor={item.iconColor}
                        imagePath={item.imagePath}
                        className="h-10 w-10 rounded-2xl"
                      />
                      <span>{formatTopicLabel(item)}</span>
                    </div>
                  </Button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No topic-level content found for this lesson.
            </div>
          )}
        </div>
      </>
    );
  }

  if (step === "content") {
    const backToStep: BrowserStep = visibleTopics.length > 0 ? "topic" : "lesson";

    panel = (
      <>
        <StepHeader
          title="Content"
          description={`Select a content record for ${selectedLesson ? formatLessonLabel(selectedLesson) : "the selected lesson"}.`}
          onBack={() => {
            setSelectedContentId(null);
            if (backToStep === "topic") {
              setSelectedTopicId(null);
              setStep("topic");
              return;
            }

            setSelectedLessonId(null);
            setSelectedTopicId(null);
            setStep("lesson");
          }}
        />
        <Separator />
        {contentCandidates.length > 0 ? (
          <div className="grid gap-3">
            {contentCandidates.map((item, index) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className="h-auto w-full cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                onClick={() => {
                  setSelectedContentId(item.id);
                  setStep("viewer");
                }}
              >
                <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {item.topicId ? `Topic content ${index + 1}` : `Lesson content ${index + 1}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.blocks.length} block{item.blocks.length > 1 ? "s" : ""} in this content record
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{item.blocks.length} blocks</Badge>
                    <Badge variant="secondary">{item.topicId ? "Topic-level" : "Lesson-level"}</Badge>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No content records found for this selection.
          </div>
        )}
      </>
    );
  }

  if (step === "viewer") {
    panel = selectedContent ? (
      <>
        <StepHeader
          title="Content viewer"
          description="Read the lesson content and use the answer review tools where available."
          onBack={() => {
            setSelectedContentId(null);
            setStep("content");
          }}
        />
        <Separator />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{selectedContent.blocks.length} blocks</Badge>
            <Badge variant="secondary">{selectedContent.topicId ? "Topic-level content" : "Lesson-level content"}</Badge>
          </div>
          {selectedContent.blocks.length > 0 ? (
            <div className="space-y-4">
              {selectedContent.blocks.map((block) => (
                <StudentBlockCard key={block.id} block={block} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              This content record has no blocks yet.
            </div>
          )}
        </div>
      </>
    ) : (
      <>
        <StepHeader title="Content viewer" description="No content record is selected." />
        <Separator />
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          Select a content record first.
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="space-y-1">
            <CardTitle>Lesson content browser</CardTitle>
            <CardDescription>
              Browse published class, subject, unit, lesson, topic, and content records step by step.
            </CardDescription>
          </div>
          {pathBadges}
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">{panel}</CardContent>
      </Card>
    </div>
  );
}
