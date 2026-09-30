"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Editor } from "@tiptap/react";
import {
  ArrowDown,
  ArrowUp,
  BookText,
  CheckSquare,
  FileOutput,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  GripVertical,
  Languages,
  ListOrdered,
  Plus,
  Rows3,
  SpellCheck2,
  Trash2,
} from "lucide-react";

import {
  createSynonymsAntonymsEntry,
  createVocabularyEntry,
  createContentBlock,
  deleteSynonymsAntonymsEntry,
  deleteVocabularyEntry,
  deleteContentBlock,
  reorderContentBlocks,
  updateChangingSentence,
  updateConnector,
  updateGapFillExercise,
  updateGapFillFirstPaper,
  updateGapFillSecondPaper,
  updateInformationTransfer,
  updateMcqSection,
  updateNarration,
  updateParagraphBlock,
  updatePreposition,
  updatePunctuationAndCapitalization,
  updateQuestionAnswerExercise,
  updateRightFormOfVerb,
  updateSubstitutionTable,
  updateSuffixAndPrefix,
  updateTagQuestion,
  updateTrueFalseExercise,
  updateVocabularyEntry,
  updateSynonymsAntonymsEntry,
} from "@/app/admin/content/actions";
import type { ContentBlockKind, ContentRecordWithBlocks } from "@/app/admin/content/content-types";
import { ResponsiveEntityEditor } from "@/components/admin/ResponsiveEntityEditor";
import { TiptapRichTextEditor } from "@/components/admin/TiptapRichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

type BlockDraft = ContentRecordWithBlocks["blocks"][number];

type McqSectionDraft = NonNullable<BlockDraft['mcqSection']>;
type McqQuestionDraftRecord = McqSectionDraft['questions'][number];
type McqOptionDraftRecord = McqQuestionDraftRecord['options'][number];
type QuestionAnswerExerciseDraft = NonNullable<BlockDraft['questionAnswerExercise']>;
type QuestionAnswerRowRecord = QuestionAnswerExerciseDraft['rows'][number];
type InformationTransferDraft = NonNullable<BlockDraft['informationTransfer']>;
type InformationTransferRowRecord = InformationTransferDraft['rows'][number];
type FillBlankFirstPaperDraft = NonNullable<BlockDraft['gapFillFirstPaper']>;
type FillBlankAnswerRecord = FillBlankFirstPaperDraft['blanks'][number];
type TrueFalseExerciseDraft = NonNullable<BlockDraft['trueFalseExercise']>;
type TrueFalseRowRecord = TrueFalseExerciseDraft['rows'][number];

type ThreeFieldBlockValue = {
  id: string;
  question: string;
  answer: string;
  details: string;
};

type SynonymsAntonymsDraft = {
  word: string;
  meanings: string;
  synonyms: string[];
  antonyms: string[];
  details: string;
};

type McqQuestionDraft = {
  prompt: string;
  answerMode: "single" | "multiple";
  options: Array<{
    id: string;
    label: string;
    text: string;
    isCorrect: boolean;
    sortOrder: number;
  }>;
};

type TrueFalseRowDraft = {
  statement: string;
  expectedAnswer: boolean;
  correction: string;
};

type QuestionAnswerRowDraft = {
  question: string;
  answer: string;
};

type SentenceOrderingRowDraft = {
  sentence: string;
};

type InformationTransferRowDraft = {
  term: string;
  answer: string;
};

const FILL_BLANK_MARKER = "____";

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

function countFillBlankMarkers(value: string) {
  return fillBlankQuestionToText(value).match(/_{2,}/g)?.length ?? 0;
}

function removeFillBlankMarkerAt(value: string, targetIndex: number) {
  const removeFromPlainText = (text: string) => {
    let currentIndex = -1;
    return text.replace(/_{2,}/g, (marker) => {
      currentIndex += 1;
      return currentIndex === targetIndex ? "" : marker;
    });
  };

  // Preserve Tiptap HTML/formatting while deleting only the selected blank marker.
  // The fallback keeps this helper safe if it is ever called outside the browser.
  if (typeof DOMParser === "undefined") {
    return removeFromPlainText(value);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div data-fill-blank-root>${value}</div>`, "text/html");
  const root = doc.querySelector<HTMLElement>("[data-fill-blank-root]");
  if (!root) return value;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Array<{ node: Text; start: number; end: number; text: string }> = [];
  let fullText = "";
  let node = walker.nextNode();

  while (node) {
    const textNode = node as Text;
    const text = textNode.data;
    const start = fullText.length;
    fullText += text;
    textNodes.push({ node: textNode, start, end: start + text.length, text });
    node = walker.nextNode();
  }

  const matches = Array.from(fullText.matchAll(/_{2,}/g));
  const match = matches[targetIndex];
  if (!match || match.index == null) return value;

  const removeStart = match.index;
  const removeEnd = removeStart + match[0].length;

  for (const entry of textNodes) {
    const overlapStart = Math.max(removeStart, entry.start);
    const overlapEnd = Math.min(removeEnd, entry.end);
    if (overlapStart >= overlapEnd) continue;

    const localStart = overlapStart - entry.start;
    const localEnd = overlapEnd - entry.start;
    entry.node.data = entry.text.slice(0, localStart) + entry.text.slice(localEnd);
  }

  return root.innerHTML;
}

function resizeFillBlankAnswers(answers: FillBlankAnswerRecord[], count: number) {
  return Array.from({ length: count }, (_, index) =>
    answers[index] || {
      id: crypto.randomUUID(),
      sortOrder: index,
      answer: "",
    },
  ).map((item, index) => ({ ...item, sortOrder: index }));
}

function serializeFillBlankAnswers(answers: FillBlankAnswerRecord[]) {
  return JSON.stringify({
    version: 1,
    blanks: answers.map((item, index) => ({
      id: item.id,
      sortOrder: index,
      answer: item.answer,
    })),
  });
}

const BLOCK_CONTENT_CLASS = "max-h-[70vh] overflow-y-auto pr-2";

const FIELD_SAVE_DELAY_MS = 900;

type BufferedInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
};

type BufferedTextareaProps = Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
};

function useBufferedTextValue(value: string, onCommit: (value: string) => void) {
  const [draft, setDraft] = useState(value);
  const latestValueRef = useRef(value);
  const committedValueRef = useRef(value);
  const dirtyRef = useRef(false);
  const onCommitRef = useRef(onCommit);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onCommitRef.current = onCommit;

  useEffect(() => {
    if (dirtyRef.current) return;
    latestValueRef.current = value;
    committedValueRef.current = value;
    setDraft(value);
  }, [value]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    clearTimer();
    const nextValue = latestValueRef.current;
    if (nextValue === committedValueRef.current) {
      dirtyRef.current = false;
      return;
    }

    committedValueRef.current = nextValue;
    dirtyRef.current = false;
    onCommitRef.current(nextValue);
  }, [clearTimer]);

  const update = useCallback(
    (nextValue: string) => {
      latestValueRef.current = nextValue;
      dirtyRef.current = true;
      setDraft(nextValue);
      clearTimer();
      timerRef.current = setTimeout(flush, FIELD_SAVE_DELAY_MS);
    },
    [clearTimer, flush],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { draft, update, flush };
}

function BufferedInput({ value, onCommit, onBlur, onKeyDown, ...props }: BufferedInputProps) {
  const { draft, update, flush } = useBufferedTextValue(value, onCommit);

  return (
    <Input
      {...props}
      value={draft}
      onChange={(event) => update(event.target.value)}
      onBlur={(event) => {
        flush();
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          flush();
        }
        onKeyDown?.(event);
      }}
    />
  );
}

function BufferedTextarea({ value, onCommit, onBlur, onKeyDown, ...props }: BufferedTextareaProps) {
  const { draft, update, flush } = useBufferedTextValue(value, onCommit);

  return (
    <Textarea
      {...props}
      value={draft}
      onChange={(event) => update(event.target.value)}
      onBlur={(event) => {
        flush();
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          flush();
        }
        onKeyDown?.(event);
      }}
    />
  );
}

function FillBlankQuestionEditor({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => void;
}) {
  const editorRef = useRef<Editor | null>(null);
  const [blankCount, setBlankCount] = useState(() => countFillBlankMarkers(value));

  useEffect(() => {
    setBlankCount(countFillBlankMarkers(value));
  }, [value]);

  const handleEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  const handleQuestionChange = useCallback(
    (nextValue: string) => {
      setBlankCount(countFillBlankMarkers(nextValue));
      onCommit(nextValue);
    },
    [onCommit],
  );

  function insertBlank() {
    const editor = editorRef.current;
    if (!editor) return;

    // Tiptap keeps the last text selection even when this toolbar button is used.
    // Insert at that selection, then commit immediately so the matching answer
    // input appears without waiting for the normal debounced rich-text save.
    editor.chain().focus().insertContent(FILL_BLANK_MARKER).run();
    const nextValue = editor.getHTML();
    setBlankCount(countFillBlankMarkers(nextValue));
    onCommit(nextValue);
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">Question</div>
          <p className="text-xs text-muted-foreground">
            Write and format the passage with Tiptap. Put the cursor where the answer should go, then click <strong>Add blank</strong>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{blankCount} blank{blankCount === 1 ? "" : "s"}</Badge>
          <Button
            type="button"
            variant="default"
            size="sm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={insertBlank}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add blank
          </Button>
        </div>
      </div>

      <div className="min-w-0 p-3">
        <TiptapRichTextEditor
          value={value}
          onChange={handleQuestionChange}
          onEditorReady={handleEditorReady}
          minHeight={260}
          placeholder="Write the passage here. Example: Bangladesh is a ____ country. Its capital is ____."
        />
      </div>
    </div>
  );
}

function createEmptyMcqQuestionDraft(): McqQuestionDraft {
  return {
    prompt: "",
    answerMode: "single",
    options: ["A", "B", "C", "D"].map((label, index) => ({
      id: crypto.randomUUID(),
      label,
      text: "",
      isCorrect: index === 0,
      sortOrder: index,
    })),
  };
}

function createEmptyTrueFalseRowDraft(): TrueFalseRowDraft {
  return {
    statement: "",
    expectedAnswer: true,
    correction: "",
  };
}

function createEmptyQuestionAnswerRowDraft(): QuestionAnswerRowDraft {
  return {
    question: "",
    answer: "",
  };
}

function createEmptySentenceOrderingRowDraft(): SentenceOrderingRowDraft {
  return {
    sentence: "",
  };
}

function createEmptyInformationTransferRowDraft(): InformationTransferRowDraft {
  return {
    term: "",
    answer: "",
  };
}

function parseTagString(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeTagString(values: string[]) {
  return values.map((item) => item.trim()).filter(Boolean).join(", ");
}

function TagChipInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function commitValue(raw: string) {
    const normalized = raw.trim();
    if (!normalized) return;
    if (values.includes(normalized)) {
      setDraft("");
      return;
    }
    onChange([...values, normalized]);
    setDraft("");
  }

  return (
    <Field>
      <FieldContent>
        <FieldLabel>{label}</FieldLabel>
        <div className="rounded-md border bg-background p-3">
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <Badge key={value} variant="secondary" className="gap-2 px-2 py-1">
                <span>{value}</span>
                <button
                  type="button"
                  className="text-xs"
                  onClick={() => onChange(values.filter((item) => item !== value))}
                >
                  x
                </button>
              </Badge>
            ))}
          </div>
          <Input
            value={draft}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (nextValue.includes(",")) {
                nextValue.split(",").forEach((segment) => commitValue(segment));
                return;
              }
              setDraft(nextValue);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitValue(draft);
              }
              if (event.key === "Backspace" && !draft && values.length > 0) {
                onChange(values.slice(0, -1));
              }
            }}
            onBlur={() => commitValue(draft)}
            placeholder={placeholder}
            className="mt-3 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
      </FieldContent>
    </Field>
  );
}

const BLOCK_META: Array<{
  kind: ContentBlockKind;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  { kind: "paragraph", title: "Paragraph", description: "Add a paragraph block.", icon: <BookText className="h-4 w-4" /> },
  { kind: "vocabulary", title: "Vocabulary", description: "Add vocabulary words and meanings.", icon: <SpellCheck2 className="h-4 w-4" /> },
  { kind: "synonyms-antonyms", title: "Synonyms / Antonyms", description: "Add synonyms and antonyms rows.", icon: <Languages className="h-4 w-4" /> },
  { kind: "gap-fill", title: "Gap Fill (Legacy)", description: "Legacy gap fill block.", icon: <FileQuestion className="h-4 w-4" /> },
  { kind: "gap-fill-first-paper", title: "Fill in the Blanks", description: "Add question, answer, and details for English 1st paper.", icon: <FileQuestion className="h-4 w-4" /> },
  { kind: "gap-fill-second-paper", title: "Gap Filling", description: "Add question, answer, and details for English 2nd paper.", icon: <FileQuestion className="h-4 w-4" /> },
  { kind: "mcq", title: "MCQ", description: "Add an MCQ section.", icon: <CheckSquare className="h-4 w-4" /> },
  { kind: "true-false", title: "True / False", description: "Add a true/false exercise.", icon: <CheckSquare className="h-4 w-4" /> },
  { kind: "question-answer", title: "Question Answer", description: "Add question, answer, and details.", icon: <Rows3 className="h-4 w-4" /> },
  { kind: "table-completion", title: "Table Completion", description: "Add question, answer, and details.", icon: <Rows3 className="h-4 w-4" /> },
  { kind: "column-matching", title: "Column Matching", description: "Add question, answer, and details.", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { kind: "sentence-ordering", title: "Rearrange Sentence", description: "Add sentences one by one in the correct order for students to rearrange.", icon: <ListOrdered className="h-4 w-4" /> },
  { kind: "information-transfer", title: "Information Transfer", description: "Add term/item and answer pairs one by one.", icon: <FileOutput className="h-4 w-4" /> },
  { kind: "substitution-table", title: "Substitution Table", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "right-form-of-verb", title: "Right Form of Verb", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "narration", title: "Narration", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "changing-sentence", title: "Changing Sentence", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "punctuation-and-capitalization", title: "Punctuation and Capitalization", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "preposition", title: "Preposition", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "suffix-and-prefix", title: "Suffix and Prefix", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "tag-question", title: "Tag Question", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "connector", title: "Connector", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
];

const BLOCK_META_BY_KIND = Object.fromEntries(BLOCK_META.map((item) => [item.kind, item])) as Record<
  ContentBlockKind,
  (typeof BLOCK_META)[number]
>;

const ENGLISH_FIRST_PAPER_KINDS: ContentBlockKind[] = [
  "paragraph",
  "vocabulary",
  "mcq",
  "gap-fill-first-paper",
  "table-completion",
  "question-answer",
  "sentence-ordering",
  "synonyms-antonyms",
  "information-transfer",
  "true-false",
];

const ENGLISH_SECOND_PAPER_KINDS: ContentBlockKind[] = [
  "gap-fill-second-paper",
  "substitution-table",
  "right-form-of-verb",
  "narration",
  "changing-sentence",
  "punctuation-and-capitalization",
  "preposition",
  "suffix-and-prefix",
  "tag-question",
  "connector",
];

function getAllowedBlockKinds(subjectName: string) {
  const normalized = subjectName.toLowerCase();

  if (normalized.includes("english") && (normalized.includes("2nd") || normalized.includes("second"))) {
    return new Set<ContentBlockKind>(ENGLISH_SECOND_PAPER_KINDS);
  }

  if (normalized.includes("english")) {
    return new Set<ContentBlockKind>(ENGLISH_FIRST_PAPER_KINDS);
  }

  return null;
}

function getBlockTitle(kind: ContentBlockKind) {
  return BLOCK_META_BY_KIND[kind]?.title ?? kind.replaceAll("-", " ");
}

const THREE_FIELD_BLOCK_META: Partial<
  Record<
    ContentBlockKind,
    {
      title: string;
      questionPlaceholder: string;
      answerPlaceholder: string;
      detailsPlaceholder: string;
      getValue: (block: BlockDraft) => ThreeFieldBlockValue | null;
      updateAction: (input: {
        contentId: string;
        blockId: string;
        recordId: string;
        question: string;
        answer: string;
        details: string;
      }) => Promise<void>;
      patchBlock: (block: BlockDraft, next: ThreeFieldBlockValue) => BlockDraft;
    }
  >
> = {
  "gap-fill": {
    title: "Gap Fill",
    questionPlaceholder: "Write the gap fill question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.gapFill,
    updateAction: updateGapFillExercise,
    patchBlock: (block, next) => ({
      ...block,
      gapFill: block.gapFill ? { ...block.gapFill, ...next } : null,
    }),
  },
  "gap-fill-second-paper": {
    title: "Gap Filling",
    questionPlaceholder: "Write the gap filling question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.gapFillSecondPaper,
    updateAction: updateGapFillSecondPaper,
    patchBlock: (block, next) => ({
      ...block,
      gapFillSecondPaper: block.gapFillSecondPaper ? { ...block.gapFillSecondPaper, ...next } : null,
    }),
  },
  "substitution-table": {
    title: "Substitution Table",
    questionPlaceholder: "Write the substitution table question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.substitutionTable,
    updateAction: updateSubstitutionTable,
    patchBlock: (block, next) => ({
      ...block,
      substitutionTable: block.substitutionTable ? { ...block.substitutionTable, ...next } : null,
    }),
  },
  "right-form-of-verb": {
    title: "Right Form of Verb",
    questionPlaceholder: "Write the right form of verb question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.rightFormOfVerb,
    updateAction: updateRightFormOfVerb,
    patchBlock: (block, next) => ({
      ...block,
      rightFormOfVerb: block.rightFormOfVerb ? { ...block.rightFormOfVerb, ...next } : null,
    }),
  },
  narration: {
    title: "Narration",
    questionPlaceholder: "Write the narration question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.narration,
    updateAction: updateNarration,
    patchBlock: (block, next) => ({
      ...block,
      narration: block.narration ? { ...block.narration, ...next } : null,
    }),
  },
  "changing-sentence": {
    title: "Changing Sentence",
    questionPlaceholder: "Write the changing sentence question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.changingSentence,
    updateAction: updateChangingSentence,
    patchBlock: (block, next) => ({
      ...block,
      changingSentence: block.changingSentence ? { ...block.changingSentence, ...next } : null,
    }),
  },
  "punctuation-and-capitalization": {
    title: "Punctuation and Capitalization",
    questionPlaceholder: "Write the punctuation and capitalization question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.punctuationAndCapitalization,
    updateAction: updatePunctuationAndCapitalization,
    patchBlock: (block, next) => ({
      ...block,
      punctuationAndCapitalization: block.punctuationAndCapitalization
        ? { ...block.punctuationAndCapitalization, ...next }
        : null,
    }),
  },
  preposition: {
    title: "Preposition",
    questionPlaceholder: "Write the preposition question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.preposition,
    updateAction: updatePreposition,
    patchBlock: (block, next) => ({
      ...block,
      preposition: block.preposition ? { ...block.preposition, ...next } : null,
    }),
  },
  "suffix-and-prefix": {
    title: "Suffix and Prefix",
    questionPlaceholder: "Write the suffix and prefix question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.suffixAndPrefix,
    updateAction: updateSuffixAndPrefix,
    patchBlock: (block, next) => ({
      ...block,
      suffixAndPrefix: block.suffixAndPrefix ? { ...block.suffixAndPrefix, ...next } : null,
    }),
  },
  "tag-question": {
    title: "Tag Question",
    questionPlaceholder: "Write the tag question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.tagQuestion,
    updateAction: updateTagQuestion,
    patchBlock: (block, next) => ({
      ...block,
      tagQuestion: block.tagQuestion ? { ...block.tagQuestion, ...next } : null,
    }),
  },
  connector: {
    title: "Connector",
    questionPlaceholder: "Write the connector question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.connector,
    updateAction: updateConnector,
    patchBlock: (block, next) => ({
      ...block,
      connector: block.connector ? { ...block.connector, ...next } : null,
    }),
  },
};

function getBlockIcon(kind: ContentBlockKind) {
  return BLOCK_META_BY_KIND[kind]?.icon ?? <FileText className="h-4 w-4" />;
}

export function ContentBlocksEditorClient({
  content,
}: {
  content: ContentRecordWithBlocks;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<BlockDraft[]>(content.blocks);
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const [isVocabularyModalOpen, setIsVocabularyModalOpen] = useState(false);
  const [activeVocabularyBlockId, setActiveVocabularyBlockId] = useState<string | null>(null);
  const [newVocabularyWord, setNewVocabularyWord] = useState("");
  const [newVocabularyMeaning, setNewVocabularyMeaning] = useState("");
  const [isSynonymsModalOpen, setIsSynonymsModalOpen] = useState(false);
  const [activeSynonymsBlockId, setActiveSynonymsBlockId] = useState<string | null>(null);
  const [newSynonymsDraft, setNewSynonymsDraft] = useState<SynonymsAntonymsDraft>({
    word: "",
    meanings: "",
    synonyms: [],
    antonyms: [],
    details: "",
  });
  const [isMcqModalOpen, setIsMcqModalOpen] = useState(false);
  const [activeMcqBlockId, setActiveMcqBlockId] = useState<string | null>(null);
  const [newMcqDraft, setNewMcqDraft] = useState<McqQuestionDraft>(createEmptyMcqQuestionDraft());
  const [isTrueFalseModalOpen, setIsTrueFalseModalOpen] = useState(false);
  const [activeTrueFalseBlockId, setActiveTrueFalseBlockId] = useState<string | null>(null);
  const [newTrueFalseDraft, setNewTrueFalseDraft] = useState<TrueFalseRowDraft>(createEmptyTrueFalseRowDraft());
  const [isQuestionAnswerModalOpen, setIsQuestionAnswerModalOpen] = useState(false);
  const [activeQuestionAnswerBlockId, setActiveQuestionAnswerBlockId] = useState<string | null>(null);
  const [newQuestionAnswerDraft, setNewQuestionAnswerDraft] = useState<QuestionAnswerRowDraft>(
    createEmptyQuestionAnswerRowDraft(),
  );
  const [isSentenceOrderingModalOpen, setIsSentenceOrderingModalOpen] = useState(false);
  const [activeSentenceOrderingBlockId, setActiveSentenceOrderingBlockId] = useState<string | null>(null);
  const [newSentenceOrderingDraft, setNewSentenceOrderingDraft] = useState<SentenceOrderingRowDraft>(
    createEmptySentenceOrderingRowDraft(),
  );
  const [isInformationTransferModalOpen, setIsInformationTransferModalOpen] = useState(false);
  const [activeInformationTransferBlockId, setActiveInformationTransferBlockId] = useState<string | null>(null);
  const [newInformationTransferDraft, setNewInformationTransferDraft] = useState<InformationTransferRowDraft>(
    createEmptyInformationTransferRowDraft(),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const saveQueueRef = useRef(new Map<string, Promise<unknown>>());

  useEffect(() => {
    setBlocks(content.blocks);
  }, [content.blocks]);

  const allowedBlockKinds = useMemo(() => getAllowedBlockKinds(content.subject.name), [content.subject.name]);
  const visibleBlocks = useMemo(
    () => (allowedBlockKinds ? blocks.filter((block) => allowedBlockKinds.has(block.kind)) : blocks),
    [allowedBlockKinds, blocks],
  );
  const visibleBlockChooser = useMemo(
    () => (allowedBlockKinds ? BLOCK_META.filter((item) => allowedBlockKinds.has(item.kind)) : BLOCK_META),
    [allowedBlockKinds],
  );

  const pathLabel = useMemo(() => {
    const items = [content.class.name, content.subject.name, content.unit.title, content.lesson.title];
    if (content.topic) {
      items.push(content.topic.title);
    }
    return items.join(" / ");
  }, [content]);

  function patchBlock(blockId: string, updater: (block: BlockDraft) => BlockDraft) {
    setBlocks((current) => current.map((block) => (block.id === blockId ? updater(block) : block)));
  }

  function saveInBackground(
    queueKey: string,
    task: () => Promise<unknown>,
    fallbackMessage = "Failed to save changes.",
  ) {
    const previous = saveQueueRef.current.get(queueKey) ?? Promise.resolve();
    const queued = previous.catch(() => undefined).then(task);
    saveQueueRef.current.set(queueKey, queued);

    void queued
      .catch((error) => {
        setActionError(error instanceof Error ? error.message : fallbackMessage);
      })
      .finally(() => {
        if (saveQueueRef.current.get(queueKey) === queued) {
          saveQueueRef.current.delete(queueKey);
        }
      });
  }

  async function handleMoveBlock(blockId: string, direction: "up" | "down") {
    const currentIndex = blocks.findIndex((block) => block.id === blockId);
    if (currentIndex === -1) return;

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;

    const nextBlocks = [...blocks];
    const [moved] = nextBlocks.splice(currentIndex, 1);
    nextBlocks.splice(nextIndex, 0, moved);

    const normalized = nextBlocks.map((block, index) => ({
      ...block,
      sortOrder: index,
    }));

    setBlocks(normalized);

    try {
      await reorderContentBlocks(normalized.map((block) => ({ id: block.id, sortOrder: block.sortOrder })));
      router.refresh();
    } catch (error) {
      setBlocks(content.blocks);
      setActionError(error instanceof Error ? error.message : "Failed to reorder blocks.");
    }
  }

  function resetVocabularyModal() {
    setNewVocabularyWord("");
    setNewVocabularyMeaning("");
  }

  function resetSynonymsModal() {
    setNewSynonymsDraft({
      word: "",
      meanings: "",
      synonyms: [],
      antonyms: [],
      details: "",
    });
  }

  function resetMcqModal() {
    setNewMcqDraft(createEmptyMcqQuestionDraft());
  }

  function resetTrueFalseModal() {
    setNewTrueFalseDraft(createEmptyTrueFalseRowDraft());
  }

  function resetQuestionAnswerModal() {
    setNewQuestionAnswerDraft(createEmptyQuestionAnswerRowDraft());
  }

  function resetSentenceOrderingModal() {
    setNewSentenceOrderingDraft(createEmptySentenceOrderingRowDraft());
  }

  function resetInformationTransferModal() {
    setNewInformationTransferDraft(createEmptyInformationTransferRowDraft());
  }

  async function handleAddBlock(kind: ContentBlockKind) {
    setActionError(null);
    startTransition(async () => {
      await createContentBlock({ contentId: content.id, kind });
      router.refresh();
    });
  }

  async function handleDeleteBlock(blockId: string) {
    setActionError(null);
    try {
      await deleteContentBlock(blockId);
      setBlocks((current) => current.filter((block) => block.id !== blockId));
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete block.");
    }
  }

  async function handleParagraphChange(blockId: string, paragraphId: string, body: string) {
    patchBlock(blockId, (block) => ({
      ...block,
      paragraph: block.paragraph ? { ...block.paragraph, body } : null,
    }));

    saveInBackground(`paragraph:${blockId}`, () =>
      updateParagraphBlock({
        contentId: content.id,
        blockId,
        paragraphId,
        body,
      }),
    );
  }

  async function handleQuestionAnswerChange(
    blockId: string,
    questionAnswerExerciseId: string,
    patch: {
      question?: string;
      answer?: string;
      details?: string;
      title?: string;
      instruction?: string;
      rows?: QuestionAnswerExerciseDraft["rows"];
    },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.questionAnswerExercise) return;

    const next = {
      ...currentBlock.questionAnswerExercise,
      ...patch,
    };

    const persisted = {
      ...next,
      // Row-based exercises keep their items in documentJson. Once row mode is
      // used, clear the legacy combined question/answer fields so there is only
      // one source of truth for the exercise items.
      question: patch.rows !== undefined ? "" : next.question,
      answer: patch.rows !== undefined ? "" : next.answer,
      documentJson: patch.rows !== undefined ? JSON.stringify({ rows: next.rows }) : next.documentJson,
    };

    patchBlock(blockId, (block) => ({
      ...block,
      questionAnswerExercise: block.questionAnswerExercise ? persisted : null,
    }));

    saveInBackground(`structured-exercise:${blockId}`, () =>
      updateQuestionAnswerExercise({
        contentId: content.id,
        blockId,
        questionAnswerExerciseId,
        title: persisted.title,
        instruction: persisted.instruction,
        question: persisted.question,
        answer: persisted.answer,
        details: persisted.details,
        documentJson: persisted.documentJson,
      }),
    );
  }

  function openQuestionAnswerModal(blockId: string) {
    setActiveQuestionAnswerBlockId(blockId);
    resetQuestionAnswerModal();
    setIsQuestionAnswerModalOpen(true);
  }

  async function handleCreateQuestionAnswerRow(keepOpen: boolean) {
    if (!activeQuestionAnswerBlockId) return;
    const currentBlock = blocks.find((block) => block.id === activeQuestionAnswerBlockId);
    if (!currentBlock?.questionAnswerExercise) return;

    const nextRow: QuestionAnswerRowRecord = {
      id: crypto.randomUUID(),
      sortOrder: currentBlock.questionAnswerExercise.rows.length,
      question: newQuestionAnswerDraft.question,
      answer: newQuestionAnswerDraft.answer,
    };

    await handleQuestionAnswerChange(activeQuestionAnswerBlockId, currentBlock.questionAnswerExercise.id, {
      rows: [...currentBlock.questionAnswerExercise.rows, nextRow],
    });

    if (keepOpen) {
      resetQuestionAnswerModal();
      return;
    }

    resetQuestionAnswerModal();
    setIsQuestionAnswerModalOpen(false);
    setActiveQuestionAnswerBlockId(null);
  }

  async function handleQuestionAnswerRowPatch(
    blockId: string,
    rowId: string,
    patch: Partial<Pick<QuestionAnswerRowRecord, "question" | "answer">>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.questionAnswerExercise) return;

    await handleQuestionAnswerChange(blockId, currentBlock.questionAnswerExercise.id, {
      rows: currentBlock.questionAnswerExercise.rows.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      ),
    });
  }

  async function handleDeleteQuestionAnswerRow(blockId: string, rowId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.questionAnswerExercise) return;

    setActionError(null);
    try {
      await handleQuestionAnswerChange(blockId, currentBlock.questionAnswerExercise.id, {
        rows: currentBlock.questionAnswerExercise.rows
          .filter((row) => row.id !== rowId)
          .map((row, index) => ({ ...row, sortOrder: index })),
      });
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete question.");
    }
  }

  function openSentenceOrderingModal(blockId: string) {
    setActiveSentenceOrderingBlockId(blockId);
    resetSentenceOrderingModal();
    setIsSentenceOrderingModalOpen(true);
  }

  async function handleCreateSentenceOrderingRow(keepOpen: boolean) {
    if (!activeSentenceOrderingBlockId) return;
    const currentBlock = blocks.find((block) => block.id === activeSentenceOrderingBlockId);
    if (!currentBlock?.questionAnswerExercise) return;

    const nextRow: QuestionAnswerRowRecord = {
      id: crypto.randomUUID(),
      sortOrder: currentBlock.questionAnswerExercise.rows.length,
      question: newSentenceOrderingDraft.sentence,
      answer: "",
    };

    await handleQuestionAnswerChange(activeSentenceOrderingBlockId, currentBlock.questionAnswerExercise.id, {
      rows: [...currentBlock.questionAnswerExercise.rows, nextRow],
    });

    if (keepOpen) {
      resetSentenceOrderingModal();
      return;
    }

    resetSentenceOrderingModal();
    setIsSentenceOrderingModalOpen(false);
    setActiveSentenceOrderingBlockId(null);
  }

  async function handleMoveSentenceOrderingRow(
    blockId: string,
    rowId: string,
    direction: "up" | "down",
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.questionAnswerExercise) return;

    const currentIndex = currentBlock.questionAnswerExercise.rows.findIndex((row) => row.id === rowId);
    if (currentIndex === -1) return;

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= currentBlock.questionAnswerExercise.rows.length) return;

    const nextRows = [...currentBlock.questionAnswerExercise.rows];
    const [moved] = nextRows.splice(currentIndex, 1);
    nextRows.splice(nextIndex, 0, moved);

    await handleQuestionAnswerChange(blockId, currentBlock.questionAnswerExercise.id, {
      rows: nextRows.map((row, index) => ({ ...row, sortOrder: index })),
    });
  }

  async function handleDeleteSentenceOrderingRow(blockId: string, rowId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.questionAnswerExercise) return;

    setActionError(null);
    try {
      await handleQuestionAnswerChange(blockId, currentBlock.questionAnswerExercise.id, {
        rows: currentBlock.questionAnswerExercise.rows
          .filter((row) => row.id !== rowId)
          .map((row, index) => ({ ...row, sortOrder: index })),
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete sentence.");
    }
  }

  async function handleVocabularyEntryChange(
    blockId: string,
    vocabularyEntryId: string,
    patch: { word?: string; meaning?: string },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.vocabulary) return;

    const currentEntry = currentBlock.vocabulary.entries.find((entry) => entry.id === vocabularyEntryId);
    if (!currentEntry) return;

    const nextEntry = { ...currentEntry, ...patch };

    patchBlock(blockId, (block) => ({
      ...block,
      vocabulary: block.vocabulary
        ? {
            ...block.vocabulary,
            entries: block.vocabulary.entries.map((entry) => (entry.id === vocabularyEntryId ? nextEntry : entry)),
          }
        : null,
    }));

    saveInBackground(`vocabulary-entry:${vocabularyEntryId}`, () =>
      updateVocabularyEntry({
        contentId: content.id,
        blockId,
        vocabularyEntryId,
        word: nextEntry.word,
        meaning: nextEntry.meaning,
      }),
    );
  }

  function openVocabularyModal(blockId: string) {
    setActiveVocabularyBlockId(blockId);
    resetVocabularyModal();
    setIsVocabularyModalOpen(true);
  }

  async function handleCreateVocabularyRow(keepOpen: boolean) {
    if (!activeVocabularyBlockId) return;
    const currentBlock = blocks.find((block) => block.id === activeVocabularyBlockId);
    if (!currentBlock?.vocabulary) return;

    const created = await createVocabularyEntry({
      contentId: content.id,
      blockId: activeVocabularyBlockId,
      vocabularyId: currentBlock.vocabulary.id,
      word: newVocabularyWord,
      meaning: newVocabularyMeaning,
    });

    patchBlock(activeVocabularyBlockId, (block) => ({
      ...block,
      vocabulary: block.vocabulary
        ? {
            ...block.vocabulary,
            entries: [
              ...block.vocabulary.entries,
              {
                id: created.id,
                vocabularyId: created.vocabularyId,
                word: created.word,
                meaning: created.meaning,
                sortOrder: created.sortOrder,
              },
            ],
          }
        : null,
    }));

    if (keepOpen) {
      resetVocabularyModal();
      return;
    }

    resetVocabularyModal();
    setIsVocabularyModalOpen(false);
    setActiveVocabularyBlockId(null);
  }

  async function handleDeleteVocabularyRow(blockId: string, vocabularyId: string, vocabularyEntryId: string) {
    setActionError(null);
    try {
      await deleteVocabularyEntry({
        contentId: content.id,
        blockId,
        vocabularyId,
        vocabularyEntryId,
      });

      patchBlock(blockId, (block) => ({
        ...block,
        vocabulary: block.vocabulary
          ? {
              ...block.vocabulary,
              entries: block.vocabulary.entries
                .filter((entry) => entry.id !== vocabularyEntryId)
                .map((entry, index) => ({ ...entry, sortOrder: index })),
            }
          : null,
      }));
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete vocabulary row.");
    }
  }

  async function handleSynonymsAntonymsEntryChange(
    blockId: string,
    entryId: string,
    patch: Partial<{
      word: string;
      meanings: string;
      synonyms: string;
      antonyms: string;
      details: string;
    }>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.synonymsAntonyms) return;

    const currentEntry = currentBlock.synonymsAntonyms.entries.find((entry) => entry.id === entryId);
    if (!currentEntry) return;

    const nextEntry = { ...currentEntry, ...patch };

    patchBlock(blockId, (block) => ({
      ...block,
      synonymsAntonyms: block.synonymsAntonyms
        ? {
            ...block.synonymsAntonyms,
            entries: block.synonymsAntonyms.entries.map((entry) => (entry.id === entryId ? nextEntry : entry)),
          }
        : null,
    }));

    saveInBackground(`synonyms-entry:${entryId}`, () =>
      updateSynonymsAntonymsEntry({
        contentId: content.id,
        blockId,
        synonymsAntonymsEntryId: entryId,
        word: nextEntry.word,
        meanings: nextEntry.meanings,
        synonyms: nextEntry.synonyms,
        antonyms: nextEntry.antonyms,
        details: nextEntry.details,
      }),
    );
  }

  function openSynonymsModal(blockId: string) {
    setActiveSynonymsBlockId(blockId);
    resetSynonymsModal();
    setIsSynonymsModalOpen(true);
  }

  async function handleCreateSynonymsRow(keepOpen: boolean) {
    if (!activeSynonymsBlockId) return;
    const currentBlock = blocks.find((block) => block.id === activeSynonymsBlockId);
    if (!currentBlock?.synonymsAntonyms) return;

    const created = await createSynonymsAntonymsEntry({
      contentId: content.id,
      blockId: activeSynonymsBlockId,
      synonymsAntonymsId: currentBlock.synonymsAntonyms.id,
      word: newSynonymsDraft.word,
      meanings: newSynonymsDraft.meanings,
      synonyms: serializeTagString(newSynonymsDraft.synonyms),
      antonyms: serializeTagString(newSynonymsDraft.antonyms),
      details: newSynonymsDraft.details,
    });

    patchBlock(activeSynonymsBlockId, (block) => ({
      ...block,
      synonymsAntonyms: block.synonymsAntonyms
        ? {
            ...block.synonymsAntonyms,
            entries: [
              ...block.synonymsAntonyms.entries,
              {
                id: created.id,
                synonymsAntonymsId: created.synonymsAntonymsId,
                word: created.word,
                meanings: created.meanings,
                synonyms: created.synonyms,
                antonyms: created.antonyms,
                details: created.details,
                sortOrder: created.sortOrder,
              },
            ],
          }
        : null,
    }));

    if (keepOpen) {
      resetSynonymsModal();
      return;
    }

    resetSynonymsModal();
    setIsSynonymsModalOpen(false);
    setActiveSynonymsBlockId(null);
  }

  async function handleDeleteSynonymsRow(blockId: string, synonymsAntonymsId: string, entryId: string) {
    setActionError(null);
    try {
      await deleteSynonymsAntonymsEntry({
        contentId: content.id,
        blockId,
        synonymsAntonymsId,
        synonymsAntonymsEntryId: entryId,
      });

      patchBlock(blockId, (block) => ({
        ...block,
        synonymsAntonyms: block.synonymsAntonyms
          ? {
              ...block.synonymsAntonyms,
              entries: block.synonymsAntonyms.entries
                .filter((entry) => entry.id !== entryId)
                .map((entry, index) => ({ ...entry, sortOrder: index })),
            }
          : null,
      }));
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete row.");
    }
  }

  async function handleMcqSectionChange(
    blockId: string,
    patch: Partial<{
      title: string;
      description: string;
      questions: McqSectionDraft["questions"];
    }>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.mcqSection) return;

    const next = {
      ...currentBlock.mcqSection,
      ...patch,
    };

    const nextDocumentJson = JSON.stringify({ questions: next.questions });
    const persisted = { ...next, documentJson: nextDocumentJson };

    patchBlock(blockId, (block) => ({
      ...block,
      mcqSection: block.mcqSection ? persisted : null,
    }));

    saveInBackground(`mcq:${blockId}`, () =>
      updateMcqSection({
        contentId: content.id,
        blockId,
        mcqSectionId: currentBlock.mcqSection!.id,
        title: persisted.title,
        description: persisted.description,
        documentJson: persisted.documentJson,
      }),
    );
  }

  function openMcqModal(blockId: string) {
    setActiveMcqBlockId(blockId);
    resetMcqModal();
    setIsMcqModalOpen(true);
  }

  function setMcqDraftOption(index: number, patch: Partial<McqQuestionDraft["options"][number]>) {
    setNewMcqDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (optionIndex === index ? { ...option, ...patch } : option)),
    }));
  }

  function toggleMcqDraftCorrect(index: number) {
    setNewMcqDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => {
        if (current.answerMode === "single") {
          return { ...option, isCorrect: optionIndex === index };
        }
        return optionIndex === index ? { ...option, isCorrect: !option.isCorrect } : option;
      }),
    }));
  }

  async function handleCreateMcqQuestion(keepOpen: boolean) {
    if (!activeMcqBlockId) return;
    const currentBlock = blocks.find((block) => block.id === activeMcqBlockId);
    if (!currentBlock?.mcqSection) return;

    const nextQuestion = {
      id: crypto.randomUUID(),
      prompt: newMcqDraft.prompt,
      answerMode: newMcqDraft.answerMode,
      sortOrder: currentBlock.mcqSection.questions.length,
      options: newMcqDraft.options,
    };

    await handleMcqSectionChange(activeMcqBlockId, {
      questions: [...currentBlock.mcqSection.questions, nextQuestion],
    });

    if (keepOpen) {
      resetMcqModal();
      return;
    }

    resetMcqModal();
    setIsMcqModalOpen(false);
    setActiveMcqBlockId(null);
  }

  async function handleMcqQuestionPatch(
    blockId: string,
    questionId: string,
    patch: Partial<McqQuestionDraftRecord>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.mcqSection) return;

    await handleMcqSectionChange(blockId, {
      questions: currentBlock.mcqSection.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question,
      ),
    });
  }

  async function handleMcqOptionPatch(
    blockId: string,
    questionId: string,
    optionId: string,
    patch: Partial<McqOptionDraftRecord>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.mcqSection) return;

    await handleMcqSectionChange(blockId, {
      questions: currentBlock.mcqSection.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) => (option.id === optionId ? { ...option, ...patch } : option)),
            }
          : question,
      ),
    });
  }

  async function handleMcqCorrectToggle(blockId: string, questionId: string, optionId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const question = currentBlock?.mcqSection?.questions.find((item) => item.id === questionId);
    if (!question || !currentBlock?.mcqSection) return;

    await handleMcqSectionChange(blockId, {
      questions: currentBlock.mcqSection.questions.map((item) => {
        if (item.id !== questionId) return item;
        return {
          ...item,
          options: item.options.map((option) => {
            if (question.answerMode === "single") {
              return { ...option, isCorrect: option.id === optionId };
            }
            return option.id === optionId ? { ...option, isCorrect: !option.isCorrect } : option;
          }),
        };
      }),
    });
  }

  async function handleDeleteMcqQuestion(blockId: string, questionId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.mcqSection) return;

    setActionError(null);
    try {
      await handleMcqSectionChange(blockId, {
        questions: currentBlock.mcqSection.questions
          .filter((question) => question.id !== questionId)
          .map((question, index) => ({ ...question, sortOrder: index })),
      });
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete question.");
    }
  }

  async function handleTrueFalseExerciseChange(
    blockId: string,
    patch: Partial<{
      title: string;
      instruction: string;
      passage: string;
      rows: TrueFalseExerciseDraft["rows"];
    }>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.trueFalseExercise) return;

    const next = {
      ...currentBlock.trueFalseExercise,
      ...patch,
    };

    const nextDocumentJson = JSON.stringify({ rows: next.rows });
    const persisted = { ...next, documentJson: nextDocumentJson };

    patchBlock(blockId, (block) => ({
      ...block,
      trueFalseExercise: block.trueFalseExercise ? persisted : null,
    }));

    saveInBackground(`true-false:${blockId}`, () =>
      updateTrueFalseExercise({
        contentId: content.id,
        blockId,
        trueFalseExerciseId: currentBlock.trueFalseExercise!.id,
        title: persisted.title,
        instruction: persisted.instruction,
        passage: persisted.passage,
        documentJson: persisted.documentJson,
      }),
    );
  }

  function openTrueFalseModal(blockId: string) {
    setActiveTrueFalseBlockId(blockId);
    resetTrueFalseModal();
    setIsTrueFalseModalOpen(true);
  }

  async function handleCreateTrueFalseRow(keepOpen: boolean) {
    if (!activeTrueFalseBlockId) return;
    const currentBlock = blocks.find((block) => block.id === activeTrueFalseBlockId);
    if (!currentBlock?.trueFalseExercise) return;

    const nextRow = {
      id: crypto.randomUUID(),
      sortOrder: currentBlock.trueFalseExercise.rows.length,
      statement: newTrueFalseDraft.statement,
      expectedAnswer: newTrueFalseDraft.expectedAnswer,
      correction: newTrueFalseDraft.expectedAnswer ? "" : newTrueFalseDraft.correction,
    };

    await handleTrueFalseExerciseChange(activeTrueFalseBlockId, {
      rows: [...currentBlock.trueFalseExercise.rows, nextRow],
    });

    if (keepOpen) {
      resetTrueFalseModal();
      return;
    }

    resetTrueFalseModal();
    setIsTrueFalseModalOpen(false);
    setActiveTrueFalseBlockId(null);
  }

  async function handleTrueFalseRowPatch(
    blockId: string,
    rowId: string,
    patch: Partial<TrueFalseRowRecord>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.trueFalseExercise) return;

    await handleTrueFalseExerciseChange(blockId, {
      rows: currentBlock.trueFalseExercise.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...patch,
              correction:
                patch.expectedAnswer === true ? "" : patch.correction !== undefined ? patch.correction : row.correction,
            }
          : row,
      ),
    });
  }

  async function handleDeleteTrueFalseRow(blockId: string, rowId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.trueFalseExercise) return;

    setActionError(null);
    try {
      await handleTrueFalseExerciseChange(blockId, {
        rows: currentBlock.trueFalseExercise.rows
          .filter((row) => row.id !== rowId)
          .map((row, index) => ({ ...row, sortOrder: index })),
      });
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete statement.");
    }
  }

  async function handleInformationTransferExerciseChange(
    blockId: string,
    recordId: string,
    patch: Partial<Pick<InformationTransferDraft, "question" | "answer" | "details" | "rows">>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.informationTransfer) return;

    const next = {
      ...currentBlock.informationTransfer,
      ...patch,
      ...(patch.rows ? { question: "", answer: "" } : {}),
    };

    const persisted = {
      ...next,
      documentJson: JSON.stringify({
        rows: next.rows.map((row, index) => ({
          ...row,
          sortOrder: index,
        })),
      }),
    };

    patchBlock(blockId, (block) => ({
      ...block,
      informationTransfer: block.informationTransfer ? persisted : null,
    }));

    saveInBackground(`information-transfer:${blockId}`, () =>
      updateInformationTransfer({
        contentId: content.id,
        blockId,
        recordId,
        question: persisted.question,
        answer: persisted.answer,
        details: persisted.details,
        documentJson: persisted.documentJson,
      }),
    );
  }

  function openInformationTransferModal(blockId: string) {
    setActiveInformationTransferBlockId(blockId);
    resetInformationTransferModal();
    setIsInformationTransferModalOpen(true);
  }

  async function handleCreateInformationTransferRow(keepOpen: boolean) {
    if (!activeInformationTransferBlockId) return;
    const currentBlock = blocks.find((block) => block.id === activeInformationTransferBlockId);
    if (!currentBlock?.informationTransfer) return;

    const nextRow: InformationTransferRowRecord = {
      id: crypto.randomUUID(),
      sortOrder: currentBlock.informationTransfer.rows.length,
      term: newInformationTransferDraft.term,
      answer: newInformationTransferDraft.answer,
    };

    await handleInformationTransferExerciseChange(
      activeInformationTransferBlockId,
      currentBlock.informationTransfer.id,
      {
        rows: [...currentBlock.informationTransfer.rows, nextRow],
      },
    );

    if (keepOpen) {
      resetInformationTransferModal();
      return;
    }

    resetInformationTransferModal();
    setIsInformationTransferModalOpen(false);
    setActiveInformationTransferBlockId(null);
  }

  async function handleInformationTransferRowPatch(
    blockId: string,
    rowId: string,
    patch: Partial<Pick<InformationTransferRowRecord, "term" | "answer">>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.informationTransfer) return;

    await handleInformationTransferExerciseChange(blockId, currentBlock.informationTransfer.id, {
      rows: currentBlock.informationTransfer.rows.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      ),
    });
  }

  async function handleDeleteInformationTransferRow(blockId: string, rowId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.informationTransfer) return;

    await handleInformationTransferExerciseChange(blockId, currentBlock.informationTransfer.id, {
      rows: currentBlock.informationTransfer.rows
        .filter((row) => row.id !== rowId)
        .map((row, index) => ({ ...row, sortOrder: index })),
    });
  }

  async function handleFillBlankFirstPaperChange(
    blockId: string,
    patch: { question?: string; details?: string; blanks?: FillBlankAnswerRecord[] },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.gapFillFirstPaper) return;

    const question = patch.question !== undefined ? patch.question : currentBlock.gapFillFirstPaper.question;
    const blankCount = countFillBlankMarkers(question);
    const sourceBlanks = patch.blanks !== undefined ? patch.blanks : currentBlock.gapFillFirstPaper.blanks;
    const blanks = resizeFillBlankAnswers(sourceBlanks, blankCount);
    const answer = serializeFillBlankAnswers(blanks);
    const details = patch.details !== undefined ? patch.details : currentBlock.gapFillFirstPaper.details;

    const next = {
      ...currentBlock.gapFillFirstPaper,
      question,
      answer,
      details,
      blanks,
    };

    patchBlock(blockId, (block) => ({
      ...block,
      gapFillFirstPaper: block.gapFillFirstPaper ? next : null,
    }));

    saveInBackground(`gap-fill-first-paper:${blockId}`, () =>
      updateGapFillFirstPaper({
        contentId: content.id,
        blockId,
        recordId: next.id,
        question: next.question,
        answer: next.answer,
        details: next.details,
      }),
    );
  }

  async function handleFillBlankAnswerChange(blockId: string, answerId: string, answer: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.gapFillFirstPaper) return;

    await handleFillBlankFirstPaperChange(blockId, {
      blanks: currentBlock.gapFillFirstPaper.blanks.map((item) =>
        item.id === answerId ? { ...item, answer } : item,
      ),
    });
  }

  async function handleDeleteFillBlank(blockId: string, blankId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.gapFillFirstPaper) return;

    const blankIndex = currentBlock.gapFillFirstPaper.blanks.findIndex((item) => item.id === blankId);
    if (blankIndex < 0) return;

    const question = removeFillBlankMarkerAt(currentBlock.gapFillFirstPaper.question, blankIndex);
    const blanks = currentBlock.gapFillFirstPaper.blanks
      .filter((item) => item.id !== blankId)
      .map((item, index) => ({ ...item, sortOrder: index }));

    await handleFillBlankFirstPaperChange(blockId, { question, blanks });
  }

  async function handleThreeFieldChange(
    kind: ContentBlockKind,
    blockId: string,
    recordId: string,
    patch: { question?: string; answer?: string; details?: string },
  ) {
    const config = THREE_FIELD_BLOCK_META[kind];
    const currentBlock = blocks.find((block) => block.id === blockId);
    const currentValue = currentBlock && config ? config.getValue(currentBlock) : null;
    if (!config || !currentValue) return;

    const next = {
      ...currentValue,
      ...patch,
    };

    patchBlock(blockId, (block) => config.patchBlock(block, next));

    saveInBackground(`${kind}:${blockId}`, () =>
      config.updateAction({
        contentId: content.id,
        blockId,
        recordId,
        question: next.question,
        answer: next.answer,
        details: next.details,
      }),
    );
  }

  return (
    <div className="space-y-6">
      {actionError ? (
        <Card className="border-destructive/40 bg-destructive/5 shadow-none">
          <CardContent className="pt-6 text-sm text-destructive">{actionError}</CardContent>
        </Card>
      ) : null}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Manage Content Blocks</CardTitle>
          <CardDescription>{pathLabel}</CardDescription>
          <CardDescription>Typing stays local for speed. Changes auto-save after a short pause, on blur, or with Ctrl/Cmd+S.</CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsChooserOpen(true)} disabled={isPending}>
          <Plus className="mr-2 h-4 w-4" />
          Add block
        </Button>
      </div>

      {visibleBlocks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No blocks yet</EmptyTitle>
            <EmptyDescription>Add the first content block for this lesson path.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={() => setIsChooserOpen(true)}>
              Add block
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-6">
          {visibleBlocks.map((block) => (
            <Card key={block.id} className="shadow-none">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md border p-2">{getBlockIcon(block.kind)}</div>
                    <CardTitle className="text-base">{getBlockTitle(block.kind)}</CardTitle>
                    <Badge variant="secondary">#{block.sortOrder + 1}</Badge>
                  </div>
                  <CardDescription>Block type: {block.kind}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon">
                    <GripVertical className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void handleMoveBlock(block.id, "up")}
                    disabled={isPending || block.sortOrder === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void handleMoveBlock(block.id, "down")}
                    disabled={isPending || block.sortOrder === blocks.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => void handleDeleteBlock(block.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {block.kind === "paragraph" && block.paragraph ? (
                <CardContent className={BLOCK_CONTENT_CLASS}>
                  <Field>
                    <FieldContent>
                      <FieldLabel>Paragraph</FieldLabel>
                      <TiptapRichTextEditor
                        value={block.paragraph.body}
                        onChange={(value) => void handleParagraphChange(block.id, block.paragraph!.id, value)}
                        minHeight={240}
                        placeholder="Write the paragraph here..."
                      />
                    </FieldContent>
                  </Field>
                </CardContent>
              ) : null}

              {block.kind === "vocabulary" && block.vocabulary ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-5`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">Vocabulary rows</h3>
                      <p className="text-sm text-muted-foreground">Manage word and meaning pairs for this content block.</p>
                    </div>
                    <Button type="button" onClick={() => openVocabularyModal(block.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add word
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {block.vocabulary.entries.map((entry, index) => (
                      <Card key={entry.id} className="shadow-none">
                        <CardContent className="pt-6">
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <Badge variant="secondary">Word #{index + 1}</Badge>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleDeleteVocabularyRow(block.id, block.vocabulary!.id, entry.id)}
                              disabled={block.vocabulary!.entries.length <= 1}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>

                          <FieldGroup className="grid gap-4 md:grid-cols-2">
                            <Field>
                              <FieldContent>
                                <FieldLabel>Word</FieldLabel>
                                <BufferedInput
                                  value={entry.word}
                                  onCommit={(value) => void handleVocabularyEntryChange(block.id, entry.id, { word: value })}
                                  placeholder="Write the vocabulary word..."
                                />
                              </FieldContent>
                            </Field>

                            <Field>
                              <FieldContent>
                                <FieldLabel>Meaning</FieldLabel>
                                <BufferedInput
                                  value={entry.meaning}
                                  onCommit={(value) => void handleVocabularyEntryChange(block.id, entry.id, { meaning: value })}
                                  placeholder="Write the meaning..."
                                />
                              </FieldContent>
                            </Field>
                          </FieldGroup>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              ) : null}

              {block.kind === "synonyms-antonyms" && block.synonymsAntonyms ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-5`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">Synonyms and antonyms rows</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage word, meaning, synonyms, antonyms, and details inside this block.
                      </p>
                    </div>
                    <Button type="button" onClick={() => openSynonymsModal(block.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add row
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {block.synonymsAntonyms.entries.map((entry, index) => (
                      <Card key={entry.id} className="shadow-none">
                        <CardContent className="space-y-5 pt-6">
                          <div className="flex items-center justify-between gap-4">
                            <Badge variant="secondary">Row #{index + 1}</Badge>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleDeleteSynonymsRow(block.id, block.synonymsAntonyms!.id, entry.id)}
                              disabled={block.synonymsAntonyms!.entries.length <= 1}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>

                          <FieldGroup className="gap-5">
                            <div className="grid gap-4 md:grid-cols-2">
                              <Field>
                                <FieldContent>
                                  <FieldLabel>Word</FieldLabel>
                                  <BufferedInput
                                    value={entry.word}
                                    onCommit={(value) => void handleSynonymsAntonymsEntryChange(block.id, entry.id, { word: value })}
                                    placeholder="Target word"
                                  />
                                </FieldContent>
                              </Field>

                              <Field>
                                <FieldContent>
                                  <FieldLabel>Meanings</FieldLabel>
                                  <BufferedTextarea
                                    value={entry.meanings}
                                    onCommit={(value) =>
                                      void handleSynonymsAntonymsEntryChange(block.id, entry.id, { meanings: value })
                                    }
                                    placeholder="Meaning or explanation"
                                    rows={3}
                                  />
                                </FieldContent>
                              </Field>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <TagChipInput
                                label="Synonyms"
                                values={parseTagString(entry.synonyms)}
                                onChange={(values) =>
                                  void handleSynonymsAntonymsEntryChange(block.id, entry.id, {
                                    synonyms: serializeTagString(values),
                                  })
                                }
                                placeholder="Type and press comma or Enter"
                              />

                              <TagChipInput
                                label="Antonyms"
                                values={parseTagString(entry.antonyms)}
                                onChange={(values) =>
                                  void handleSynonymsAntonymsEntryChange(block.id, entry.id, {
                                    antonyms: serializeTagString(values),
                                  })
                                }
                                placeholder="Type and press comma or Enter"
                              />
                            </div>

                            <Field>
                              <FieldContent>
                                <FieldLabel>Details</FieldLabel>
                                <TiptapRichTextEditor
                                  value={entry.details}
                                  onChange={(value) =>
                                    void handleSynonymsAntonymsEntryChange(block.id, entry.id, { details: value })
                                  }
                                  minHeight={180}
                                  placeholder="Add details here..."
                                />
                              </FieldContent>
                            </Field>
                          </FieldGroup>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              ) : null}

              {block.kind === "mcq" && block.mcqSection ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-5`}>
                  <FieldGroup className="gap-5">
                    <Field>
                      <FieldContent>
                        <FieldLabel>Section title</FieldLabel>
                        <BufferedInput
                          value={block.mcqSection.title}
                          onCommit={(value) => void handleMcqSectionChange(block.id, { title: value })}
                          placeholder="Multiple choice questions"
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Section description</FieldLabel>
                        <BufferedTextarea
                          value={block.mcqSection.description}
                          onCommit={(value) => void handleMcqSectionChange(block.id, { description: value })}
                          placeholder="Add optional instructions for this MCQ section..."
                          rows={3}
                        />
                      </FieldContent>
                    </Field>
                  </FieldGroup>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">MCQ questions</h3>
                      <p className="text-sm text-muted-foreground">Add prompts, option text, and correct-answer settings.</p>
                    </div>
                    <Button type="button" onClick={() => openMcqModal(block.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add question
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {block.mcqSection.questions.length === 0 ? (
                      <Card className="shadow-none">
                        <CardContent className="pt-6 text-sm text-muted-foreground">
                          No MCQ questions yet. Click Add question to create the first one.
                        </CardContent>
                      </Card>
                    ) : null}

                    {block.mcqSection.questions.map((question, index) => (
                      <Card key={question.id} className="shadow-none">
                        <CardContent className="space-y-5 pt-6">
                          <div className="flex items-center justify-between gap-4">
                            <Badge variant="secondary">Question #{index + 1}</Badge>
                            <Button type="button" variant="outline" size="sm" onClick={() => void handleDeleteMcqQuestion(block.id, question.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>

                          <Field>
                            <FieldContent>
                              <FieldLabel>Question prompt</FieldLabel>
                              <BufferedTextarea
                                value={question.prompt}
                                onCommit={(value) => void handleMcqQuestionPatch(block.id, question.id, { prompt: value })}
                                placeholder="Write the MCQ prompt..."
                                rows={4}
                              />
                            </FieldContent>
                          </Field>

                          <Field>
                            <FieldContent>
                              <FieldLabel>Answer mode</FieldLabel>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant={question.answerMode === "single" ? "default" : "outline"}
                                  onClick={() =>
                                    void handleMcqQuestionPatch(block.id, question.id, {
                                      answerMode: "single",
                                      options: question.options.map((option, optionIndex) => ({
                                        ...option,
                                        isCorrect: optionIndex === 0 ? option.isCorrect || true : false,
                                      })),
                                    })
                                  }
                                >
                                  Single correct
                                </Button>
                                <Button
                                  type="button"
                                  variant={question.answerMode === "multiple" ? "default" : "outline"}
                                  onClick={() => void handleMcqQuestionPatch(block.id, question.id, { answerMode: "multiple" })}
                                >
                                  Multiple correct
                                </Button>
                              </div>
                            </FieldContent>
                          </Field>

                          <div className="grid gap-4 md:grid-cols-2">
                            {question.options.map((option) => (
                              <Card key={option.id} className="shadow-none">
                                <CardContent className="space-y-4 pt-6">
                                  <div className="flex items-center justify-between gap-3">
                                    <Badge variant="outline">Option {option.label}</Badge>
                                    <Button
                                      type="button"
                                      variant={option.isCorrect ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => void handleMcqCorrectToggle(block.id, question.id, option.id)}
                                    >
                                      {option.isCorrect ? "Correct" : "Mark correct"}
                                    </Button>
                                  </div>

                                  <BufferedInput
                                    value={option.text}
                                    onCommit={(value) =>
                                      void handleMcqOptionPatch(block.id, question.id, option.id, { text: value })
                                    }
                                    placeholder={`Write option ${option.label}...`}
                                  />
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              ) : null}

              {block.kind === "true-false" && block.trueFalseExercise ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-5`}>
                  <FieldGroup className="gap-5">
                    <Field>
                      <FieldContent>
                        <FieldLabel>Title</FieldLabel>
                        <BufferedInput
                          value={block.trueFalseExercise.title}
                          onCommit={(value) => void handleTrueFalseExerciseChange(block.id, { title: value })}
                          placeholder="True / False"
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Instruction</FieldLabel>
                        <BufferedTextarea
                          value={block.trueFalseExercise.instruction}
                          onCommit={(value) => void handleTrueFalseExerciseChange(block.id, { instruction: value })}
                          placeholder="Write the instructions for this exercise..."
                          rows={3}
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Passage</FieldLabel>
                        <BufferedTextarea
                          value={block.trueFalseExercise.passage}
                          onCommit={(value) => void handleTrueFalseExerciseChange(block.id, { passage: value })}
                          placeholder="Write the passage here..."
                          rows={5}
                        />
                      </FieldContent>
                    </Field>
                  </FieldGroup>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">Statements</h3>
                      <p className="text-sm text-muted-foreground">Write each statement and choose whether it is true or false.</p>
                    </div>
                    <Button type="button" onClick={() => openTrueFalseModal(block.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add statement
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {block.trueFalseExercise.rows.map((row, index) => (
                      <Card key={row.id} className="shadow-none">
                        <CardContent className="space-y-5 pt-6">
                          <div className="flex items-center justify-between gap-4">
                            <Badge variant="secondary">Statement #{index + 1}</Badge>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleDeleteTrueFalseRow(block.id, row.id)}
                              disabled={block.trueFalseExercise!.rows.length <= 1}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>

                          <Field>
                            <FieldContent>
                              <FieldLabel>Statement</FieldLabel>
                              <BufferedTextarea
                                value={row.statement}
                                onCommit={(value) => void handleTrueFalseRowPatch(block.id, row.id, { statement: value })}
                                placeholder="Type the true/false statement here..."
                                rows={4}
                              />
                            </FieldContent>
                          </Field>

                          <Field>
                            <FieldContent>
                              <FieldLabel>Correct answer</FieldLabel>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant={row.expectedAnswer ? "default" : "outline"}
                                  onClick={() => void handleTrueFalseRowPatch(block.id, row.id, { expectedAnswer: true, correction: "" })}
                                >
                                  True
                                </Button>
                                <Button
                                  type="button"
                                  variant={!row.expectedAnswer ? "default" : "outline"}
                                  onClick={() => void handleTrueFalseRowPatch(block.id, row.id, { expectedAnswer: false })}
                                >
                                  False
                                </Button>
                              </div>
                            </FieldContent>
                          </Field>

                          {!row.expectedAnswer ? (
                            <Field>
                              <FieldContent>
                                <FieldLabel>Correction</FieldLabel>
                                <BufferedTextarea
                                  value={row.correction}
                                  onCommit={(value) => void handleTrueFalseRowPatch(block.id, row.id, { correction: value })}
                                  placeholder="Write the correct statement here..."
                                  rows={3}
                                />
                              </FieldContent>
                            </Field>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              ) : null}

              {block.kind === "question-answer" && block.questionAnswerExercise ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-5`}>
                  <FieldGroup className="gap-5">
                    <Field>
                      <FieldContent>
                        <FieldLabel>Title</FieldLabel>
                        <BufferedInput
                          value={block.questionAnswerExercise.title}
                          onCommit={(value) =>
                            void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, { title: value })
                          }
                          placeholder="Question Answer"
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Instruction / Details</FieldLabel>
                        <div className="rounded-xl border bg-background p-3">
                          <TiptapRichTextEditor
                            value={block.questionAnswerExercise.details}
                            onChange={(value) =>
                              void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, { details: value })
                            }
                            minHeight={120}
                            placeholder="Add instructions or details for this Question Answer section..."
                          />
                        </div>
                      </FieldContent>
                    </Field>
                  </FieldGroup>

                  <div className="flex items-center justify-between gap-4 border-t pt-5">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">Questions &amp; Answers</h3>
                      <p className="text-sm text-muted-foreground">
                        Add every question with its own answer instead of entering all questions and answers together.
                      </p>
                    </div>
                    <Button type="button" onClick={() => openQuestionAnswerModal(block.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Question Answer Item
                    </Button>
                  </div>

                  {block.questionAnswerExercise.rows.length === 0 ? (
                    <Empty className="border">
                      <EmptyHeader>
                        <EmptyTitle>No questions added yet</EmptyTitle>
                        <EmptyDescription>
                          Add the first question. Each question will have its own answer field.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button type="button" onClick={() => openQuestionAnswerModal(block.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add first item
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <div className="space-y-4">
                      {block.questionAnswerExercise.rows.map((row, index) => (
                        <Card key={row.id} className="shadow-none">
                          <CardContent className="space-y-5 pt-6">
                            <div className="flex items-center justify-between gap-4">
                              <Badge variant="secondary">Question #{index + 1}</Badge>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleDeleteQuestionAnswerRow(block.id, row.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>

                            <Field>
                              <FieldContent>
                                <FieldLabel>Question</FieldLabel>
                                <div className="rounded-xl border bg-background p-3">
                                  <TiptapRichTextEditor
                                    value={row.question}
                                    onChange={(value) =>
                                      void handleQuestionAnswerRowPatch(block.id, row.id, { question: value })
                                    }
                                    minHeight={150}
                                    placeholder={`Write question ${index + 1} here...`}
                                  />
                                </div>
                              </FieldContent>
                            </Field>

                            <div className="border-t pt-5">
                              <Field>
                                <FieldContent>
                                  <FieldLabel>Answer</FieldLabel>
                                  <div className="rounded-xl border bg-background p-3">
                                    <TiptapRichTextEditor
                                      value={row.answer}
                                      onChange={(value) =>
                                        void handleQuestionAnswerRowPatch(block.id, row.id, { answer: value })
                                      }
                                      minHeight={150}
                                      placeholder={`Write the answer for question ${index + 1} here...`}
                                    />
                                  </div>
                                </FieldContent>
                              </Field>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      <div className="flex justify-center border-t pt-5">
                        <Button type="button" variant="outline" onClick={() => openQuestionAnswerModal(block.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add another Question Answer item
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              ) : null}

              {block.kind === "sentence-ordering" && block.questionAnswerExercise ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-5`}>
                  <FieldGroup className="gap-5">
                    <Field>
                      <FieldContent>
                        <FieldLabel>Exercise Title</FieldLabel>
                        <BufferedInput
                          value={block.questionAnswerExercise.title}
                          onCommit={(value) =>
                            void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, { title: value })
                          }
                          placeholder="Rearrange Sentence"
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Instruction</FieldLabel>
                        <BufferedTextarea
                          value={block.questionAnswerExercise.instruction}
                          onCommit={(value) =>
                            void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, {
                              instruction: value,
                            })
                          }
                          placeholder="Rearrange the following sentences in the correct order."
                          rows={3}
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Extra details</FieldLabel>
                        <div className="rounded-xl border bg-background p-3">
                          <TiptapRichTextEditor
                            value={block.questionAnswerExercise.details}
                            onChange={(value) =>
                              void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, {
                                details: value,
                              })
                            }
                            minHeight={110}
                            placeholder="Optional passage, hint, or extra instructions..."
                          />
                        </div>
                      </FieldContent>
                    </Field>
                  </FieldGroup>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">Sentences in the correct order</h3>
                      <p className="max-w-2xl text-sm text-muted-foreground">
                        Add one full sentence at a time in the correct sequence. Students will see these items shuffled
                        and will rearrange them back into this order.
                      </p>
                    </div>
                    <Button type="button" onClick={() => openSentenceOrderingModal(block.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rearrange Item
                    </Button>
                  </div>

                  {block.questionAnswerExercise.rows.length === 0 ? (
                    <Empty className="border">
                      <EmptyHeader>
                        <EmptyTitle>No sentence items added yet</EmptyTitle>
                        <EmptyDescription>
                          Add the sentences in their correct final order. The student view will shuffle them automatically.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button type="button" onClick={() => openSentenceOrderingModal(block.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add first sentence
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <div className="space-y-4">
                      {block.questionAnswerExercise.rows.map((row, index) => (
                        <Card key={row.id} className="shadow-none">
                          <CardContent className="space-y-4 pt-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">Correct order #{index + 1}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  Students will not see this correct-order number.
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  aria-label={`Move sentence ${index + 1} up`}
                                  disabled={index === 0}
                                  onClick={() => void handleMoveSentenceOrderingRow(block.id, row.id, "up")}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  aria-label={`Move sentence ${index + 1} down`}
                                  disabled={index === block.questionAnswerExercise!.rows.length - 1}
                                  onClick={() => void handleMoveSentenceOrderingRow(block.id, row.id, "down")}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleDeleteSentenceOrderingRow(block.id, row.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>

                            <Field>
                              <FieldContent>
                                <FieldLabel>Sentence</FieldLabel>
                                <div className="rounded-xl border bg-background p-3">
                                  <TiptapRichTextEditor
                                    value={row.question}
                                    onChange={(value) =>
                                      void handleQuestionAnswerRowPatch(block.id, row.id, { question: value })
                                    }
                                    minHeight={120}
                                    placeholder={`Write the full sentence for correct position ${index + 1}...`}
                                  />
                                </div>
                              </FieldContent>
                            </Field>
                          </CardContent>
                        </Card>
                      ))}

                      <div className="flex justify-center border-t pt-5">
                        <Button type="button" variant="outline" onClick={() => openSentenceOrderingModal(block.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add another Rearrange Item
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              ) : null}

              {(block.kind === "table-completion" || block.kind === "column-matching") &&
              block.questionAnswerExercise ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-5`}>
                  <FieldGroup className="gap-5">
                    <Field>
                      <FieldContent>
                        <FieldLabel>Question</FieldLabel>
                        <FieldDescription>Write the full question here.</FieldDescription>
                        <div className="rounded-xl border bg-background p-3">
                          <TiptapRichTextEditor
                            value={block.questionAnswerExercise.question}
                            onChange={(value) =>
                              void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, { question: value })
                            }
                            minHeight={240}
                            placeholder="Write the full question here..."
                          />
                        </div>
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Answer</FieldLabel>
                        <div className="rounded-xl border bg-background p-3">
                          <TiptapRichTextEditor
                            value={block.questionAnswerExercise.answer}
                            onChange={(value) =>
                              void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, { answer: value })
                            }
                            minHeight={220}
                            placeholder="Write the answer here..."
                          />
                        </div>
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Details</FieldLabel>
                        <div className="rounded-xl border bg-background p-3">
                          <TiptapRichTextEditor
                            value={block.questionAnswerExercise.details}
                            onChange={(value) =>
                              void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, { details: value })
                            }
                            minHeight={180}
                            placeholder="Add extra details here..."
                          />
                        </div>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </CardContent>
              ) : null}

              {block.kind === "information-transfer" && block.informationTransfer ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-5`}>
                  <Field>
                    <FieldContent>
                      <FieldLabel>Instruction / Source details</FieldLabel>
                      <FieldDescription>
                        Optional context or instruction shown above the Information Transfer items.
                      </FieldDescription>
                      <div className="rounded-xl border bg-background p-3">
                        <TiptapRichTextEditor
                          value={block.informationTransfer.details}
                          onChange={(value) =>
                            void handleInformationTransferExerciseChange(
                              block.id,
                              block.informationTransfer!.id,
                              { details: value },
                            )
                          }
                          minHeight={130}
                          placeholder="Add source details or instructions here..."
                        />
                      </div>
                    </FieldContent>
                  </Field>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">Information Transfer Items</h3>
                      <p className="max-w-2xl text-sm text-muted-foreground">
                        Add each term or item separately with its own answer.
                      </p>
                    </div>
                    <Button type="button" onClick={() => openInformationTransferModal(block.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Information Transfer Item
                    </Button>
                  </div>

                  {block.informationTransfer.rows.length === 0 ? (
                    <Empty className="border">
                      <EmptyHeader>
                        <EmptyTitle>No Information Transfer items yet</EmptyTitle>
                        <EmptyDescription>
                          Add one term or item with its answer, then continue adding the remaining items.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button type="button" onClick={() => openInformationTransferModal(block.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add first item
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <div className="space-y-4">
                      {block.informationTransfer.rows.map((row, index) => (
                        <Card key={row.id} className="shadow-none">
                          <CardContent className="space-y-4 pt-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <Badge variant="secondary">Item #{index + 1}</Badge>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleDeleteInformationTransferRow(block.id, row.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>

                            <Field>
                              <FieldContent>
                                <FieldLabel>Term / Item</FieldLabel>
                                <div className="rounded-xl border bg-background p-3">
                                  <TiptapRichTextEditor
                                    value={row.term}
                                    onChange={(value) =>
                                      void handleInformationTransferRowPatch(block.id, row.id, { term: value })
                                    }
                                    minHeight={120}
                                    placeholder="Write the term, label, or information item..."
                                  />
                                </div>
                              </FieldContent>
                            </Field>

                            <Field>
                              <FieldContent>
                                <FieldLabel>Answer</FieldLabel>
                                <div className="rounded-xl border bg-background p-3">
                                  <TiptapRichTextEditor
                                    value={row.answer}
                                    onChange={(value) =>
                                      void handleInformationTransferRowPatch(block.id, row.id, { answer: value })
                                    }
                                    minHeight={120}
                                    placeholder="Write the answer for this item..."
                                  />
                                </div>
                              </FieldContent>
                            </Field>
                          </CardContent>
                        </Card>
                      ))}

                      <div className="flex justify-center border-t pt-5">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openInformationTransferModal(block.id)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add another Information Transfer Item
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              ) : null}

              {block.kind === "gap-fill-first-paper" && block.gapFillFirstPaper ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-6`}>
                  <FieldGroup className="gap-6">
                    <FillBlankQuestionEditor
                      value={block.gapFillFirstPaper.question}
                      onCommit={(value) =>
                        void handleFillBlankFirstPaperChange(block.id, { question: value })
                      }
                    />

                    <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium">Answer</h3>
                          <p className="text-sm text-muted-foreground">
                            Each blank in the question automatically creates one answer field here.
                          </p>
                        </div>
                        <Badge variant="secondary">{block.gapFillFirstPaper.blanks.length} answer{block.gapFillFirstPaper.blanks.length === 1 ? "" : "s"}</Badge>
                      </div>

                      <div className="p-4">
                        {block.gapFillFirstPaper.blanks.length === 0 ? (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            No blanks yet. In the <strong>Question</strong> box, place the cursor where needed and click <strong>Add blank</strong>.
                          </div>
                        ) : (
                          <div className="rounded-2xl border bg-muted/10 p-4">
                            <div className="flex flex-wrap gap-4">
                              {block.gapFillFirstPaper.blanks.map((blank, index) => (
                                <div key={blank.id} className="min-w-[220px] flex-1 space-y-2 rounded-xl border bg-background p-3 md:max-w-[260px]">
                                  <div className="flex items-center justify-between gap-2">
                                    <FieldLabel htmlFor={`fill-blank-${blank.id}`}>Blank #{index + 1}</FieldLabel>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => void handleDeleteFillBlank(block.id, blank.id)}
                                      aria-label={`Delete blank ${index + 1}`}
                                      title={`Delete blank ${index + 1} from question and answer`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <BufferedInput
                                    id={`fill-blank-${blank.id}`}
                                    value={blank.answer}
                                    onCommit={(value) => void handleFillBlankAnswerChange(block.id, blank.id, value)}
                                    placeholder={`Answer for blank ${index + 1}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Details / Instruction</FieldLabel>
                        <div className="rounded-xl border bg-background p-3">
                          <TiptapRichTextEditor
                            value={block.gapFillFirstPaper.details}
                            onChange={(value) =>
                              void handleFillBlankFirstPaperChange(block.id, { details: value })
                            }
                            minHeight={140}
                            placeholder="Optional instructions or explanation for students..."
                          />
                        </div>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </CardContent>
              ) : null}

              {THREE_FIELD_BLOCK_META[block.kind] && THREE_FIELD_BLOCK_META[block.kind]!.getValue(block) ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-5`}>
                  <FieldGroup className="gap-5">
                    <Field>
                      <FieldContent>
                        <FieldLabel>Question</FieldLabel>
                        <div className="rounded-xl border bg-background p-3">
                          <TiptapRichTextEditor
                            value={THREE_FIELD_BLOCK_META[block.kind]!.getValue(block)!.question}
                            onChange={(value) =>
                              void handleThreeFieldChange(
                                block.kind,
                                block.id,
                                THREE_FIELD_BLOCK_META[block.kind]!.getValue(block)!.id,
                                { question: value },
                              )
                            }
                            minHeight={240}
                            placeholder={THREE_FIELD_BLOCK_META[block.kind]!.questionPlaceholder}
                          />
                        </div>
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Answer</FieldLabel>
                        <div className="rounded-xl border bg-background p-3">
                          <TiptapRichTextEditor
                            value={THREE_FIELD_BLOCK_META[block.kind]!.getValue(block)!.answer}
                            onChange={(value) =>
                              void handleThreeFieldChange(
                                block.kind,
                                block.id,
                                THREE_FIELD_BLOCK_META[block.kind]!.getValue(block)!.id,
                                { answer: value },
                              )
                            }
                            minHeight={220}
                            placeholder={THREE_FIELD_BLOCK_META[block.kind]!.answerPlaceholder}
                          />
                        </div>
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Details</FieldLabel>
                        <div className="rounded-xl border bg-background p-3">
                          <TiptapRichTextEditor
                            value={THREE_FIELD_BLOCK_META[block.kind]!.getValue(block)!.details}
                            onChange={(value) =>
                              void handleThreeFieldChange(
                                block.kind,
                                block.id,
                                THREE_FIELD_BLOCK_META[block.kind]!.getValue(block)!.id,
                                { details: value },
                              )
                            }
                            minHeight={180}
                            placeholder={THREE_FIELD_BLOCK_META[block.kind]!.detailsPlaceholder}
                          />
                        </div>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <ResponsiveEntityEditor
        open={isChooserOpen}
        onOpenChange={setIsChooserOpen}
        title="Add Content Block"
        description="Choose the block type to add into this content record."
        className="sm:max-w-6xl"
      >
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleBlockChooser.map((item) => (
              <Card key={item.kind} className="shadow-none">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted">
                    {getBlockIcon(item.kind)}
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      void handleAddBlock(item.kind);
                      setIsChooserOpen(false);
                    }}
                  >
                    Use {item.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={isQuestionAnswerModalOpen}
        onOpenChange={(open) => {
          setIsQuestionAnswerModalOpen(open);
          if (!open) {
            setActiveQuestionAnswerBlockId(null);
            resetQuestionAnswerModal();
          }
        }}
        title="Add Question Answer Item"
        description="Enter one question with its answer, then save it into the Question Answer section."
        className="sm:max-w-4xl"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsQuestionAnswerModalOpen(false);
                setActiveQuestionAnswerBlockId(null);
                resetQuestionAnswerModal();
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleCreateQuestionAnswerRow(false)}>
              Save item
            </Button>
            <Button type="button" onClick={() => void handleCreateQuestionAnswerRow(true)}>
              Save and add another
            </Button>
          </div>
        }
      >
        <FieldGroup className="gap-5">
          <Field>
            <FieldContent>
              <FieldLabel>Question</FieldLabel>
              <div className="rounded-xl border bg-background p-3">
                <TiptapRichTextEditor
                  value={newQuestionAnswerDraft.question}
                  onChange={(value) =>
                    setNewQuestionAnswerDraft((current) => ({ ...current, question: value }))
                  }
                  minHeight={180}
                  placeholder="Write the question here..."
                />
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldContent>
              <FieldLabel>Answer</FieldLabel>
              <div className="rounded-xl border bg-background p-3">
                <TiptapRichTextEditor
                  value={newQuestionAnswerDraft.answer}
                  onChange={(value) =>
                    setNewQuestionAnswerDraft((current) => ({ ...current, answer: value }))
                  }
                  minHeight={180}
                  placeholder="Write the answer for this question here..."
                />
              </div>
            </FieldContent>
          </Field>
        </FieldGroup>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={isSentenceOrderingModalOpen}
        onOpenChange={(open) => {
          setIsSentenceOrderingModalOpen(open);
          if (!open) {
            setActiveSentenceOrderingBlockId(null);
            resetSentenceOrderingModal();
          }
        }}
        title="Add Rearrange Sentence Item"
        description="Enter one full sentence. Add the sentences in their correct final order; students will receive them shuffled."
        className="w-[calc(100vw-1.5rem)] sm:max-w-3xl lg:max-w-4xl"
        footer={
          <div className="flex w-full min-w-0 flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setIsSentenceOrderingModalOpen(false);
                setActiveSentenceOrderingBlockId(null);
                resetSentenceOrderingModal();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void handleCreateSentenceOrderingRow(false)}
            >
              Save item
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void handleCreateSentenceOrderingRow(true)}
            >
              Save and add another
            </Button>
          </div>
        }
      >
        <div className="min-w-0">
          <Field>
            <FieldContent className="min-w-0">
            <FieldLabel>Sentence</FieldLabel>
            <FieldDescription>
              Write the full sentence for the next correct position in the sequence.
            </FieldDescription>
            <div className="min-w-0 rounded-xl border bg-background p-2 sm:p-3">
              <TiptapRichTextEditor
                className="min-w-0 max-w-full"
                value={newSentenceOrderingDraft.sentence}
                onChange={(value) =>
                  setNewSentenceOrderingDraft((current) => ({ ...current, sentence: value }))
                }
                minHeight={180}
                placeholder="Write one full sentence here..."
              />
            </div>
            </FieldContent>
          </Field>
        </div>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={isInformationTransferModalOpen}
        onOpenChange={(open) => {
          setIsInformationTransferModalOpen(open);
          if (!open) {
            setActiveInformationTransferBlockId(null);
            resetInformationTransferModal();
          }
        }}
        title="Add Information Transfer Item"
        description="Add one term or item with its own answer. Save it, then continue with the next item."
        className="w-[calc(100vw-1.5rem)] sm:max-w-3xl lg:max-w-4xl"
        footer={
          <div className="flex w-full min-w-0 flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setIsInformationTransferModalOpen(false);
                setActiveInformationTransferBlockId(null);
                resetInformationTransferModal();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void handleCreateInformationTransferRow(false)}
            >
              Save item
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void handleCreateInformationTransferRow(true)}
            >
              Save and add another
            </Button>
          </div>
        }
      >
        <FieldGroup className="min-w-0 gap-5">
          <Field>
            <FieldContent className="min-w-0">
              <FieldLabel>Term / Item</FieldLabel>
              <FieldDescription>Enter one information-transfer term, label, or item.</FieldDescription>
              <div className="min-w-0 rounded-xl border bg-background p-2 sm:p-3">
                <TiptapRichTextEditor
                  className="min-w-0 max-w-full"
                  value={newInformationTransferDraft.term}
                  onChange={(value) =>
                    setNewInformationTransferDraft((current) => ({ ...current, term: value }))
                  }
                  minHeight={150}
                  placeholder="Write the term or item here..."
                />
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldContent className="min-w-0">
              <FieldLabel>Answer</FieldLabel>
              <FieldDescription>Enter the answer for this item only.</FieldDescription>
              <div className="min-w-0 rounded-xl border bg-background p-2 sm:p-3">
                <TiptapRichTextEditor
                  className="min-w-0 max-w-full"
                  value={newInformationTransferDraft.answer}
                  onChange={(value) =>
                    setNewInformationTransferDraft((current) => ({ ...current, answer: value }))
                  }
                  minHeight={150}
                  placeholder="Write the answer for this item..."
                />
              </div>
            </FieldContent>
          </Field>
        </FieldGroup>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={isTrueFalseModalOpen}
        onOpenChange={(open) => {
          setIsTrueFalseModalOpen(open);
          if (!open) {
            setActiveTrueFalseBlockId(null);
            resetTrueFalseModal();
          }
        }}
        title="Add True / False statement"
        description="Create the statement in this popup, then save it into the True / False exercise."
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsTrueFalseModalOpen(false);
                setActiveTrueFalseBlockId(null);
                resetTrueFalseModal();
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleCreateTrueFalseRow(false)}>
              Save statement
            </Button>
            <Button type="button" onClick={() => void handleCreateTrueFalseRow(true)}>
              Save and add another
            </Button>
          </div>
        }
      >
        <FieldGroup className="gap-5">
          <Field>
            <FieldContent>
              <FieldLabel>Statement</FieldLabel>
              <BufferedTextarea
                value={newTrueFalseDraft.statement}
                onCommit={(value) => setNewTrueFalseDraft((current) => ({ ...current, statement: value }))}
                placeholder="Type the true/false statement here..."
                rows={4}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldContent>
              <FieldLabel>Correct answer</FieldLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newTrueFalseDraft.expectedAnswer ? "default" : "outline"}
                  onClick={() => setNewTrueFalseDraft((current) => ({ ...current, expectedAnswer: true, correction: "" }))}
                >
                  True
                </Button>
                <Button
                  type="button"
                  variant={!newTrueFalseDraft.expectedAnswer ? "default" : "outline"}
                  onClick={() => setNewTrueFalseDraft((current) => ({ ...current, expectedAnswer: false }))}
                >
                  False
                </Button>
              </div>
            </FieldContent>
          </Field>

          {!newTrueFalseDraft.expectedAnswer ? (
            <Field>
              <FieldContent>
                <FieldLabel>Correction</FieldLabel>
                <BufferedTextarea
                  value={newTrueFalseDraft.correction}
                  onCommit={(value) => setNewTrueFalseDraft((current) => ({ ...current, correction: value }))}
                  placeholder="Write the correct statement here..."
                  rows={3}
                />
              </FieldContent>
            </Field>
          ) : null}
        </FieldGroup>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={isMcqModalOpen}
        onOpenChange={(open) => {
          setIsMcqModalOpen(open);
          if (!open) {
            setActiveMcqBlockId(null);
            resetMcqModal();
          }
        }}
        title="Add MCQ question"
        description="Create the question in this popup, then save it into the MCQ section."
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsMcqModalOpen(false);
                setActiveMcqBlockId(null);
                resetMcqModal();
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleCreateMcqQuestion(false)}>
              Save question
            </Button>
            <Button type="button" onClick={() => void handleCreateMcqQuestion(true)}>
              Save and add another
            </Button>
          </div>
        }
      >
        <FieldGroup className="gap-5">
          <Field>
            <FieldContent>
              <FieldLabel>Question prompt</FieldLabel>
              <BufferedTextarea
                value={newMcqDraft.prompt}
                onCommit={(value) => setNewMcqDraft((current) => ({ ...current, prompt: value }))}
                placeholder="Write the MCQ prompt..."
                rows={4}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldContent>
              <FieldLabel>Answer mode</FieldLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newMcqDraft.answerMode === "single" ? "default" : "outline"}
                  onClick={() =>
                    setNewMcqDraft((current) => ({
                      ...current,
                      answerMode: "single",
                      options: current.options.map((option, optionIndex) => ({
                        ...option,
                        isCorrect: optionIndex === 0 ? option.isCorrect || true : false,
                      })),
                    }))
                  }
                >
                  Single correct
                </Button>
                <Button
                  type="button"
                  variant={newMcqDraft.answerMode === "multiple" ? "default" : "outline"}
                  onClick={() => setNewMcqDraft((current) => ({ ...current, answerMode: "multiple" }))}
                >
                  Multiple correct
                </Button>
              </div>
            </FieldContent>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            {newMcqDraft.options.map((option, index) => (
              <Card key={option.id} className="shadow-none">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">Option {option.label}</Badge>
                    <Button
                      type="button"
                      variant={option.isCorrect ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleMcqDraftCorrect(index)}
                    >
                      {option.isCorrect ? "Correct" : "Mark correct"}
                    </Button>
                  </div>
                  <BufferedInput
                    value={option.text}
                    onCommit={(value) => setMcqDraftOption(index, { text: value })}
                    placeholder={`Write option ${option.label}...`}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </FieldGroup>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={isVocabularyModalOpen}
        onOpenChange={(open) => {
          setIsVocabularyModalOpen(open);
          if (!open) {
            setActiveVocabularyBlockId(null);
            resetVocabularyModal();
          }
        }}
        title="Add vocabulary row"
        description="Create the vocabulary row in this popup, then save it into the vocabulary block."
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsVocabularyModalOpen(false);
                setActiveVocabularyBlockId(null);
                resetVocabularyModal();
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleCreateVocabularyRow(false)}>
              Save row
            </Button>
            <Button type="button" onClick={() => void handleCreateVocabularyRow(true)}>
              Save and add another
            </Button>
          </div>
        }
      >
        <FieldGroup className="gap-5">
          <Field>
            <FieldContent>
              <FieldLabel>Word</FieldLabel>
              <BufferedInput
                value={newVocabularyWord}
                onCommit={setNewVocabularyWord}
                placeholder="Write the vocabulary word..."
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldContent>
              <FieldLabel>Meaning</FieldLabel>
              <BufferedInput
                value={newVocabularyMeaning}
                onCommit={setNewVocabularyMeaning}
                placeholder="Write the meaning..."
              />
            </FieldContent>
          </Field>
        </FieldGroup>
      </ResponsiveEntityEditor>
    </div>
  );
}







/* eslint-disable react-hooks/set-state-in-effect */
