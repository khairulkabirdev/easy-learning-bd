"use client";

import { useState } from "react";
import { CheckCircle2, CircleHelp, Eye, XCircle } from "lucide-react";

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
      Review needed
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
      const correct = question.options.filter((option) => option.isCorrect).map((option) => option.id).sort();
      nextStatus[question.id] = JSON.stringify(selected) === JSON.stringify(correct) ? "correct" : "incorrect";
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
                  <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
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
                      {showAnswers && option.isCorrect ? <Badge variant="secondary">Correct option</Badge> : null}
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
}: {
  content: StudentContentRecord;
  title?: string;
  description?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{content.blocks.length} blocks</Badge>
        <Badge variant="secondary">{content.topicId ? "Topic-level content" : "Lesson-level content"}</Badge>
      </div>
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
