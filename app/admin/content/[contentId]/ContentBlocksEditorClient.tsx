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
import type {
  ContentBlockKind,
  ContentRecordWithBlocks,
  TableCompletionDocumentRecord,
  SubstitutionTableDocumentRecord,
} from "@/app/admin/content/content-types";
import { ResponsiveEntityEditor } from "@/components/admin/ResponsiveEntityEditor";
import { TableCompletionChoiceCombobox } from "@/components/app/TableCompletionChoiceCombobox";
import { QuestionAnswerPassageCombobox } from "@/components/app/QuestionAnswerPassageCombobox";
import { TiptapRichTextEditor } from "@/components/admin/TiptapRichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type BlockDraft = ContentRecordWithBlocks["blocks"][number];

type McqSectionDraft = NonNullable<BlockDraft['mcqSection']>;
type McqQuestionDraftRecord = McqSectionDraft['questions'][number];
type McqOptionDraftRecord = McqQuestionDraftRecord['options'][number];
type QuestionAnswerExerciseDraft = NonNullable<BlockDraft['questionAnswerExercise']>;
type QuestionAnswerRowRecord = QuestionAnswerExerciseDraft['rows'][number];
type TableCompletionDraft = NonNullable<QuestionAnswerExerciseDraft['table']>;
type TableCompletionRowRecord = TableCompletionDraft['rows'][number];
type TableCompletionCellRecord = TableCompletionRowRecord['cells'][number];
type SubstitutionTableDraft = NonNullable<BlockDraft['substitutionTable']>;
type SubstitutionTableRowRecord = SubstitutionTableDraft['table']['rows'][number];
type SubstitutionTableCellRecord = SubstitutionTableRowRecord['cells'][number];
type InformationTransferDraft = NonNullable<BlockDraft['informationTransfer']>;
type InformationTransferRowRecord = InformationTransferDraft['rows'][number];
type ChangingSentenceDraft = NonNullable<BlockDraft['changingSentence']>;
type ChangingSentenceRowRecord = ChangingSentenceDraft['rows'][number];
type TagQuestionDraft = NonNullable<BlockDraft['tagQuestion']>;
type TagQuestionRowRecord = TagQuestionDraft['rows'][number];
type TagQuestionMode = TagQuestionDraft['mode'];
type SuffixPrefixDraft = NonNullable<BlockDraft['suffixAndPrefix']>;
type SuffixPrefixItemRecord = SuffixPrefixDraft['items'][number];
type InformationTransferBlankRecord = InformationTransferDraft['blanks'][number];
type FillBlankFirstPaperDraft = NonNullable<BlockDraft['gapFillFirstPaper']>;
type FillBlankAnswerRecord = FillBlankFirstPaperDraft['blanks'][number];
type BlankExerciseKind =
  | "gap-fill-second-paper"
  | "right-form-of-verb"
  | "preposition"
  | "connector";

type BlankExerciseValue = ThreeFieldBlockValue & {
  blanks: FillBlankAnswerRecord[];
};
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

function paragraphPreview(value: string, maxLength = 80) {
  const text = fillBlankQuestionToText(value);
  if (!text) return "Empty paragraph";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
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

function escapeHtmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractSuffixPrefixWordsFromHtml(value: string) {
  return Array.from(value.matchAll(/<u(?:\s[^>]*)?>([\s\S]*?)<\/u>/gi))
    .map((match) => fillBlankQuestionToText(match[1] || ""))
    .filter(Boolean);
}

function serializeSuffixPrefixItems(items: SuffixPrefixItemRecord[]) {
  return JSON.stringify({
    version: 1,
    items: items.map((item, index) => ({
      id: item.id,
      sortOrder: index,
      word: item.word,
      answer: item.answer,
    })),
  });
}

function syncSuffixPrefixItems(
  question: string,
  currentItems: SuffixPrefixItemRecord[],
): SuffixPrefixItemRecord[] {
  const words = extractSuffixPrefixWordsFromHtml(question);
  return words.map((word, index) => ({
    id: currentItems[index]?.id || crypto.randomUUID(),
    sortOrder: index,
    word,
    answer: currentItems[index]?.answer || "",
  }));
}

function removeSuffixPrefixWordAt(value: string, targetIndex: number) {
  let currentIndex = -1;
  return value.replace(/<u(?:\s[^>]*)?>[\s\S]*?<\/u>/gi, (target) => {
    currentIndex += 1;
    return currentIndex === targetIndex ? "" : target;
  });
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
  title = "Question",
  description = "Write and format the passage with Tiptap. Put the cursor where the answer should go, then click Add blank.",
  addButtonLabel = "Add blank",
  countLabel = "blank",
  placeholder = "Write the passage here. Example: Bangladesh is a ____ country. Its capital is ____.",
  maxBlanks,
}: {
  value: string;
  onCommit: (value: string) => void;
  title?: string;
  description?: string;
  addButtonLabel?: string;
  countLabel?: string;
  placeholder?: string;
  maxBlanks?: number;
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
    if (maxBlanks !== undefined && blankCount >= maxBlanks) return;

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
          <div className="text-sm font-medium">{title}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{blankCount} {countLabel}{blankCount === 1 ? "" : "s"}</Badge>
          <Button
            type="button"
            variant="default"
            size="sm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={insertBlank}
            disabled={maxBlanks !== undefined && blankCount >= maxBlanks}
            title={maxBlanks !== undefined && blankCount >= maxBlanks ? `Maximum ${maxBlanks} blank${maxBlanks === 1 ? "" : "s"} allowed` : undefined}
          >
            <Plus className="mr-2 h-4 w-4" />
            {addButtonLabel}
          </Button>
        </div>
      </div>

      <div className="min-w-0 p-3">
        <TiptapRichTextEditor
          value={value}
          onChange={handleQuestionChange}
          onEditorReady={handleEditorReady}
          minHeight={260}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function SuffixPrefixQuestionEditor({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => void;
}) {
  const editorRef = useRef<Editor | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [word, setWord] = useState("");
  const selectionRef = useRef<{ from: number; to: number } | null>(null);
  const targetCount = extractSuffixPrefixWordsFromHtml(value).length;

  const handleEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  function openWordDialog() {
    const editor = editorRef.current;
    if (editor) {
      const { from, to } = editor.state.selection;
      selectionRef.current = { from, to };
    }
    setWord("");
    setIsOpen(true);
  }

  function insertWord() {
    const trimmedWord = word.trim();
    const editor = editorRef.current;
    if (!trimmedWord || !editor) return;

    const selection = selectionRef.current;
    const chain = editor.chain().focus();
    if (selection) chain.setTextSelection(selection);
    chain.insertContent(`<u>${escapeHtmlText(trimmedWord)}</u>`).run();

    const nextValue = editor.getHTML();
    onCommit(nextValue);
    setWord("");
    setIsOpen(false);
    selectionRef.current = null;
  }

  return (
    <>
      <div className="min-w-0 overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Question</div>
            <p className="text-xs text-muted-foreground">
              Write the passage with Tiptap. Put the cursor where the root word should appear, then click Add Suffix / Prefix.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {targetCount} word{targetCount === 1 ? "" : "s"}
            </Badge>
            <Button
              type="button"
              size="sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={openWordDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Suffix / Prefix
            </Button>
          </div>
        </div>
        <div className="min-w-0 p-3">
          <TiptapRichTextEditor
            value={value}
            onChange={onCommit}
            onEditorReady={handleEditorReady}
            minHeight={260}
            placeholder="Write the passage here. Put the cursor where a root word should appear, then add the word."
          />
        </div>
      </div>

      <ResponsiveEntityEditor
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setWord("");
            selectionRef.current = null;
          }
        }}
        title="Add Suffix / Prefix Word"
        description="Enter the base/root word. It will be inserted underlined at the saved Tiptap cursor position and a matching answer field will be created."
        className="w-[calc(100vw-1.5rem)] sm:max-w-lg"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={insertWord} disabled={!word.trim()}>
              Add word
            </Button>
          </div>
        }
      >
        <Field>
          <FieldContent>
            <FieldLabel>Base / root word</FieldLabel>
            <Input
              autoFocus
              value={word}
              onChange={(event) => setWord(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  insertWord();
                }
              }}
              placeholder="Example: happy, use, nation"
            />
            <FieldDescription>
              The word is inserted as an underlined target in the Question. Enter the completed word in the Answer section afterwards.
            </FieldDescription>
          </FieldContent>
        </Field>
      </ResponsiveEntityEditor>
    </>
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

function serializeChangingSentenceRows(rows: ChangingSentenceRowRecord[]) {
  return JSON.stringify({
    version: 1,
    rows: rows.map((row, index) => ({
      id: row.id,
      sortOrder: index,
      question: row.question,
      answer: row.answer,
    })),
  });
}

function serializeTagQuestionState(
  mode: TagQuestionMode,
  rows: TagQuestionRowRecord[],
  blanks: FillBlankAnswerRecord[],
) {
  return JSON.stringify({
    version: 1,
    mode,
    rows: rows.map((row, index) => ({
      id: row.id,
      sortOrder: index,
      question: row.question,
      answer: row.answer,
    })),
    blanks: blanks.map((blank, index) => ({
      id: blank.id,
      sortOrder: index,
      answer: blank.answer,
    })),
  });
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
  { kind: "gap-fill-second-paper", title: "Gap Filling", description: "Create a Tiptap question with inline blanks and matching answers.", icon: <FileQuestion className="h-4 w-4" /> },
  { kind: "mcq", title: "MCQ", description: "Add an MCQ section.", icon: <CheckSquare className="h-4 w-4" /> },
  { kind: "true-false", title: "True / False", description: "Add a true/false exercise.", icon: <CheckSquare className="h-4 w-4" /> },
  { kind: "question-answer", title: "Question Answer", description: "Add a passage and question-answer items.", icon: <Rows3 className="h-4 w-4" /> },
  { kind: "table-completion", title: "Table Completion", description: "Add question, answer, and details.", icon: <Rows3 className="h-4 w-4" /> },
  { kind: "column-matching", title: "Column Matching", description: "Add question, answer, and details.", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { kind: "sentence-ordering", title: "Rearrange Sentence", description: "Add sentences one by one in the correct order for students to rearrange.", icon: <ListOrdered className="h-4 w-4" /> },
  { kind: "information-transfer", title: "Information Transfer", description: "Create a Tiptap passage with inline transfer blanks and matching answers.", icon: <FileOutput className="h-4 w-4" /> },
  { kind: "substitution-table", title: "Substitution Table", description: "Build columns of sentence parts and define meaningful sentence combinations.", icon: <FileText className="h-4 w-4" /> },
  { kind: "right-form-of-verb", title: "Right Form of Verb", description: "Create a Tiptap question with inline verb blanks and matching answers.", icon: <FileText className="h-4 w-4" /> },
  { kind: "narration", title: "Narration", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "changing-sentence", title: "Changing Sentence", description: "Add each changing-sentence question with its own answer.", icon: <FileText className="h-4 w-4" /> },
  { kind: "punctuation-and-capitalization", title: "Punctuation and Capitalization", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "preposition", title: "Preposition", description: "Create a Tiptap question with inline preposition blanks and matching answers.", icon: <FileText className="h-4 w-4" /> },
  { kind: "suffix-and-prefix", title: "Suffix and Prefix", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "tag-question", title: "Tag Question", description: "Add question, answer, and details.", icon: <FileText className="h-4 w-4" /> },
  { kind: "connector", title: "Connector", description: "Create a Tiptap question with inline connector blanks and matching answers.", icon: <FileText className="h-4 w-4" /> },
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

const BLANK_EXERCISE_KINDS = new Set<ContentBlockKind>([
  "gap-fill-second-paper",
  "right-form-of-verb",
  "preposition",
  "connector",
]);

function isBlankExerciseKind(kind: ContentBlockKind): kind is BlankExerciseKind {
  return BLANK_EXERCISE_KINDS.has(kind);
}

function getBlankExerciseValue(block: BlockDraft, kind: BlankExerciseKind): BlankExerciseValue | null {
  switch (kind) {
    case "gap-fill-second-paper":
      return block.gapFillSecondPaper;
    case "right-form-of-verb":
      return block.rightFormOfVerb;
    case "preposition":
      return block.preposition;
    case "connector":
      return block.connector;
  }
}

function patchBlankExerciseValue(
  block: BlockDraft,
  kind: BlankExerciseKind,
  next: BlankExerciseValue,
): BlockDraft {
  switch (kind) {
    case "gap-fill-second-paper":
      return { ...block, gapFillSecondPaper: block.gapFillSecondPaper ? { ...block.gapFillSecondPaper, ...next } : null };
    case "right-form-of-verb":
      return { ...block, rightFormOfVerb: block.rightFormOfVerb ? { ...block.rightFormOfVerb, ...next } : null };
    case "preposition":
      return { ...block, preposition: block.preposition ? { ...block.preposition, ...next } : null };
    case "connector":
      return { ...block, connector: block.connector ? { ...block.connector, ...next } : null };
  }
}

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
  const [isChangingSentenceModalOpen, setIsChangingSentenceModalOpen] = useState(false);
  const [activeChangingSentenceBlockId, setActiveChangingSentenceBlockId] = useState<string | null>(null);
  const [newChangingSentenceDraft, setNewChangingSentenceDraft] = useState<QuestionAnswerRowDraft>(
    createEmptyQuestionAnswerRowDraft(),
  );
  const [isTagQuestionModalOpen, setIsTagQuestionModalOpen] = useState(false);
  const [activeTagQuestionBlockId, setActiveTagQuestionBlockId] = useState<string | null>(null);
  const [newTagQuestionDraft, setNewTagQuestionDraft] = useState<QuestionAnswerRowDraft>(
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
  const paragraphPassageOptions = useMemo(
    () =>
      blocks
        .filter((block) => block.kind === "paragraph" && block.paragraph)
        .map((block, index) => ({
          id: block.id,
          label: `Paragraph ${index + 1} — ${paragraphPreview(block.paragraph!.body)}`,
        })),
    [blocks],
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

  function resetChangingSentenceModal() {
    setNewChangingSentenceDraft(createEmptyQuestionAnswerRowDraft());
  }

  function resetTagQuestionModal() {
    setNewTagQuestionDraft(createEmptyQuestionAnswerRowDraft());
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
      passageSource?: QuestionAnswerExerciseDraft["passageSource"];
      paragraphBlockId?: string | null;
      rows?: QuestionAnswerExerciseDraft["rows"];
    },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.questionAnswerExercise) return;

    const next = {
      ...currentBlock.questionAnswerExercise,
      ...patch,
    };

    const questionAnswerDocumentJson =
      currentBlock.kind === "question-answer"
        ? JSON.stringify({
            version: 2,
            passageSource: next.passageSource ?? "manual",
            paragraphBlockId: next.passageSource === "paragraph" ? next.paragraphBlockId ?? null : null,
            rows: next.rows,
          })
        : patch.rows !== undefined
          ? JSON.stringify({ rows: next.rows })
          : next.documentJson;

    const persisted = {
      ...next,
      // Row-based exercises keep their items in documentJson. Once row mode is
      // used, clear the legacy combined question/answer fields so there is only
      // one source of truth for the exercise items.
      question: patch.rows !== undefined ? "" : next.question,
      answer: patch.rows !== undefined ? "" : next.answer,
      documentJson: questionAnswerDocumentJson,
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

  function normalizeTableCompletion(table: TableCompletionDocumentRecord): TableCompletionDocumentRecord {
    const columns = table.columns.map((column, index) => ({ ...column, sortOrder: index }));
    const rows = table.rows.map((row, rowIndex) => ({
      ...row,
      sortOrder: rowIndex,
      cells: columns.map((column, columnIndex) => {
        const current = row.cells.find((cell) => cell.columnId === column.id) || row.cells[columnIndex];
        if (!current) {
          return {
            id: crypto.randomUUID(),
            columnId: column.id,
            mode: "text" as const,
            text: "",
            answer: "",
          };
        }

        // The previous Table Completion design used per-cell answer blanks.
        // The new design treats every table cell as a selectable sentence part.
        // Preserve any old answer text as the visible cell value during migration.
        return {
          ...current,
          columnId: column.id,
          mode: "text" as const,
          text: current.mode === "answer" ? current.answer || current.text : current.text,
          answer: "",
        };
      }),
    }));

    const sourceAnswers = Array.isArray(table.answers) ? table.answers : [];
    const answers = Array.from({ length: rows.length }, (_, answerIndex) => {
      const current = sourceAnswers[answerIndex];
      return {
        id: current?.id || crypto.randomUUID(),
        sortOrder: answerIndex,
        selections: columns.map((column) => {
          const selection = current?.selections?.find((item) => item.columnId === column.id);
          const selectedCellExists = rows.some((row) =>
            row.cells.some((cell) => cell.id === selection?.cellId && cell.columnId === column.id),
          );
          return {
            columnId: column.id,
            cellId: selectedCellExists ? selection?.cellId || "" : "",
          };
        }),
      };
    });

    return {
      version: 2,
      columns,
      rows,
      answers,
    };
  }

  function handleTableCompletionChange(
    blockId: string,
    exerciseId: string,
    patch: {
      title?: string;
      instruction?: string;
      details?: string;
      table?: TableCompletionDocumentRecord;
    },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.questionAnswerExercise) return;

    const currentExercise = currentBlock.questionAnswerExercise;
    const table = patch.table
      ? normalizeTableCompletion(patch.table)
      : currentExercise.table;
    if (!table) return;

    const persisted = {
      ...currentExercise,
      ...patch,
      table,
      documentJson: JSON.stringify(table),
    };

    patchBlock(blockId, (block) => ({
      ...block,
      questionAnswerExercise: block.questionAnswerExercise ? persisted : null,
    }));

    saveInBackground(`table-completion:${blockId}`, () =>
      updateQuestionAnswerExercise({
        contentId: content.id,
        blockId,
        questionAnswerExerciseId: exerciseId,
        title: persisted.title,
        instruction: persisted.instruction,
        question: persisted.question,
        answer: persisted.answer,
        details: persisted.details,
        documentJson: persisted.documentJson,
      }),
    );
  }

  function handleAddTableCompletionColumn(blockId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const exercise = currentBlock?.questionAnswerExercise;
    if (!exercise?.table) return;

    const columnId = crypto.randomUUID();
    const nextTable: TableCompletionDocumentRecord = {
      ...exercise.table,
      columns: [
        ...exercise.table.columns,
        {
          id: columnId,
          label: `Column ${exercise.table.columns.length + 1}`,
          sortOrder: exercise.table.columns.length,
        },
      ],
      rows: exercise.table.rows.map((row) => ({
        ...row,
        cells: [
          ...row.cells,
          {
            id: crypto.randomUUID(),
            columnId,
            mode: "text",
            text: "",
            answer: "",
          },
        ],
      })),
      answers: exercise.table.answers.map((answer) => ({
        ...answer,
        selections: [...answer.selections, { columnId, cellId: "" }],
      })),
    };

    handleTableCompletionChange(blockId, exercise.id, { table: nextTable });
  }

  function handleDeleteTableCompletionColumn(blockId: string, columnId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const exercise = currentBlock?.questionAnswerExercise;
    if (!exercise?.table || exercise.table.columns.length <= 2) return;

    handleTableCompletionChange(blockId, exercise.id, {
      table: {
        ...exercise.table,
        columns: exercise.table.columns.filter((column) => column.id !== columnId),
        rows: exercise.table.rows.map((row) => ({
          ...row,
          cells: row.cells.filter((cell) => cell.columnId !== columnId),
        })),
        answers: exercise.table.answers.map((answer) => ({
          ...answer,
          selections: answer.selections.filter((selection) => selection.columnId !== columnId),
        })),
      },
    });
  }

  function handleTableCompletionColumnLabel(blockId: string, columnId: string, label: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const exercise = currentBlock?.questionAnswerExercise;
    if (!exercise?.table) return;

    handleTableCompletionChange(blockId, exercise.id, {
      table: {
        ...exercise.table,
        columns: exercise.table.columns.map((column) =>
          column.id === columnId ? { ...column, label } : column,
        ),
      },
    });
  }

  function handleAddTableCompletionRow(blockId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const exercise = currentBlock?.questionAnswerExercise;
    if (!exercise?.table) return;

    const row: TableCompletionRowRecord = {
      id: crypto.randomUUID(),
      sortOrder: exercise.table.rows.length,
      cells: exercise.table.columns.map((column) => ({
        id: crypto.randomUUID(),
        columnId: column.id,
        mode: "text",
        text: "",
        answer: "",
      })),
    };

    const answer = {
      id: crypto.randomUUID(),
      sortOrder: exercise.table.answers.length,
      selections: exercise.table.columns.map((column) => ({ columnId: column.id, cellId: "" })),
    };

    handleTableCompletionChange(blockId, exercise.id, {
      table: {
        ...exercise.table,
        rows: [...exercise.table.rows, row],
        answers: [...exercise.table.answers, answer],
      },
    });
  }

  function handleDeleteTableCompletionRow(blockId: string, rowId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const exercise = currentBlock?.questionAnswerExercise;
    if (!exercise?.table) return;

    const deletedRow = exercise.table.rows.find((row) => row.id === rowId);
    const deletedCellIds = new Set(deletedRow?.cells.map((cell) => cell.id) || []);
    const rows = exercise.table.rows.filter((row) => row.id !== rowId);
    const answers = exercise.table.answers
      .slice(0, rows.length)
      .map((answer) => ({
        ...answer,
        selections: answer.selections.map((selection) =>
          deletedCellIds.has(selection.cellId) ? { ...selection, cellId: "" } : selection,
        ),
      }));

    handleTableCompletionChange(blockId, exercise.id, {
      table: { ...exercise.table, rows, answers },
    });
  }

  function handleMoveTableCompletionRow(
    blockId: string,
    rowId: string,
    direction: "up" | "down",
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const exercise = currentBlock?.questionAnswerExercise;
    if (!exercise?.table) return;

    const currentIndex = exercise.table.rows.findIndex((row) => row.id === rowId);
    if (currentIndex < 0) return;
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= exercise.table.rows.length) return;

    const rows = [...exercise.table.rows];
    const [moved] = rows.splice(currentIndex, 1);
    rows.splice(nextIndex, 0, moved);
    handleTableCompletionChange(blockId, exercise.id, { table: { ...exercise.table, rows } });
  }

  function handleTableCompletionCellPatch(
    blockId: string,
    rowId: string,
    cellId: string,
    patch: Partial<Pick<TableCompletionCellRecord, "mode" | "text" | "answer">>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const exercise = currentBlock?.questionAnswerExercise;
    if (!exercise?.table) return;

    handleTableCompletionChange(blockId, exercise.id, {
      table: {
        ...exercise.table,
        rows: exercise.table.rows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                cells: row.cells.map((cell) =>
                  cell.id === cellId ? { ...cell, ...patch } : cell,
                ),
              }
            : row,
        ),
      },
    });
  }

  function handleTableCompletionAnswerSelection(
    blockId: string,
    answerId: string,
    columnId: string,
    cellId: string,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const exercise = currentBlock?.questionAnswerExercise;
    if (!exercise?.table) return;

    // A row/cell may only be used once per column across all answer slots.
    // Clearing the current value is always allowed and immediately releases it.
    if (
      cellId &&
      exercise.table.answers.some(
        (answer) =>
          answer.id !== answerId &&
          answer.selections.some(
            (selection) => selection.columnId === columnId && selection.cellId === cellId,
          ),
      )
    ) {
      return;
    }

    handleTableCompletionChange(blockId, exercise.id, {
      table: {
        ...exercise.table,
        answers: exercise.table.answers.map((answer) =>
          answer.id === answerId
            ? {
                ...answer,
                selections: exercise.table!.columns.map((column) => {
                  const current = answer.selections.find((selection) => selection.columnId === column.id);
                  return column.id === columnId
                    ? { columnId: column.id, cellId }
                    : { columnId: column.id, cellId: current?.cellId || "" };
                }),
              }
            : answer,
        ),
      },
    });
  }

  function getTableCompletionAnswerPreview(
    table: TableCompletionDocumentRecord,
    answerId: string,
  ) {
    const answer = table.answers.find((item) => item.id === answerId);
    if (!answer) return "";

    return table.columns
      .map((column) => {
        const selection = answer.selections.find((item) => item.columnId === column.id);
        if (!selection?.cellId) return "";
        const cell = table.rows
          .flatMap((row) => row.cells)
          .find((item) => item.id === selection.cellId && item.columnId === column.id);
        return cell?.text?.trim() || "";
      })
      .filter(Boolean)
      .join(" ");
  }

  function substitutionColumnLabel(index: number) {
    return index < 26 ? `Column ${String.fromCharCode(65 + index)}` : `Column ${index + 1}`;
  }

  function getSubstitutionPreviewForSelections(
    table: SubstitutionTableDocumentRecord,
    selections: SubstitutionTableDocumentRecord["answers"][number]["selections"],
  ) {
    return table.columns
      .map((column) => {
        const selection = selections.find((item) => item.columnId === column.id);
        if (!selection?.cellId) return "";
        const cell = table.rows
          .flatMap((row) => row.cells)
          .find((item) => item.id === selection.cellId && item.columnId === column.id);
        return cell?.text?.trim() || "";
      })
      .filter(Boolean)
      .join(" ");
  }

  function getSubstitutionAnswerPreview(
    table: SubstitutionTableDocumentRecord,
    answerId: string,
  ) {
    const answer = table.answers.find((item) => item.id === answerId);
    return answer ? getSubstitutionPreviewForSelections(table, answer.selections) : "";
  }

  function normalizeSubstitutionTable(
    table: SubstitutionTableDocumentRecord,
  ): SubstitutionTableDocumentRecord {
    const sourceColumns = table.columns.length >= 2
      ? table.columns
      : Array.from({ length: 3 }, (_, index) => ({
          id: crypto.randomUUID(),
          label: substitutionColumnLabel(index),
          sortOrder: index,
        }));
    const columns = sourceColumns.map((column, index) => ({
      ...column,
      label: column.label || substitutionColumnLabel(index),
      sortOrder: index,
    }));
    const rows = table.rows.map((row, rowIndex) => ({
      ...row,
      sortOrder: rowIndex,
      cells: columns.map((column, columnIndex) => {
        const current = row.cells.find((cell) => cell.columnId === column.id) || row.cells[columnIndex];
        return current
          ? { ...current, columnId: column.id }
          : { id: crypto.randomUUID(), columnId: column.id, text: "" };
      }),
    }));
    const answers = table.answers.map((answer, answerIndex) => ({
      ...answer,
      sortOrder: answerIndex,
      selections: columns.map((column) => {
        const current = answer.selections.find((selection) => selection.columnId === column.id);
        const validCell = rows.some((row) =>
          row.cells.some(
            (cell) => cell.id === current?.cellId && cell.columnId === column.id && cell.text.trim(),
          ),
        );
        return { columnId: column.id, cellId: validCell ? current?.cellId || "" : "" };
      }),
      sentence: answer.sentence || "",
    }));

    return { version: 1, columns, rows, answers };
  }

  function syncSubstitutionAutoSentences(
    previous: SubstitutionTableDocumentRecord,
    next: SubstitutionTableDocumentRecord,
  ): SubstitutionTableDocumentRecord {
    return {
      ...next,
      answers: next.answers.map((answer) => {
        const previousAnswer = previous.answers.find((item) => item.id === answer.id);
        const previousPreview = previousAnswer
          ? getSubstitutionPreviewForSelections(previous, previousAnswer.selections)
          : "";
        const nextPreview = getSubstitutionPreviewForSelections(next, answer.selections);
        const sentence = answer.sentence || "";
        const shouldAutoFill =
          !sentence.trim() ||
          (previousAnswer && sentence.trim().replace(/\s+/g, " ") === previousPreview.trim().replace(/\s+/g, " "));

        return shouldAutoFill ? { ...answer, sentence: nextPreview } : answer;
      }),
    };
  }

  function handleSubstitutionTableChange(
    blockId: string,
    recordId: string,
    patch: {
      question?: string;
      details?: string;
      table?: SubstitutionTableDocumentRecord;
    },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const current = currentBlock?.substitutionTable;
    if (!current) return;

    const table = patch.table
      ? syncSubstitutionAutoSentences(current.table, normalizeSubstitutionTable(patch.table))
      : current.table;
    const next = {
      ...current,
      question: patch.question !== undefined ? patch.question : current.question,
      details: patch.details !== undefined ? patch.details : current.details,
      table,
      answer: patch.table !== undefined ? JSON.stringify(table) : current.answer,
    };

    patchBlock(blockId, (block) => ({
      ...block,
      substitutionTable: block.substitutionTable ? next : null,
    }));

    saveInBackground(`substitution-table:${blockId}`, () =>
      updateSubstitutionTable({
        contentId: content.id,
        blockId,
        recordId,
        question: next.question,
        answer: next.answer,
        details: next.details,
      }),
    );
  }

  function handleAddSubstitutionColumn(blockId: string) {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current) return;
    const columnId = crypto.randomUUID();
    const columnIndex = current.table.columns.length;
    handleSubstitutionTableChange(blockId, current.id, {
      table: {
        ...current.table,
        columns: [
          ...current.table.columns,
          { id: columnId, label: substitutionColumnLabel(columnIndex), sortOrder: columnIndex },
        ],
        rows: current.table.rows.map((row) => ({
          ...row,
          cells: [...row.cells, { id: crypto.randomUUID(), columnId, text: "" }],
        })),
        answers: current.table.answers.map((answer) => ({
          ...answer,
          selections: [...answer.selections, { columnId, cellId: "" }],
        })),
      },
    });
  }

  function handleDeleteSubstitutionColumn(blockId: string, columnId: string) {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current || current.table.columns.length <= 2) return;
    handleSubstitutionTableChange(blockId, current.id, {
      table: {
        ...current.table,
        columns: current.table.columns.filter((column) => column.id !== columnId),
        rows: current.table.rows.map((row) => ({
          ...row,
          cells: row.cells.filter((cell) => cell.columnId !== columnId),
        })),
        answers: current.table.answers.map((answer) => ({
          ...answer,
          selections: answer.selections.filter((selection) => selection.columnId !== columnId),
        })),
      },
    });
  }

  function handleSubstitutionColumnLabel(blockId: string, columnId: string, label: string) {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current) return;
    handleSubstitutionTableChange(blockId, current.id, {
      table: {
        ...current.table,
        columns: current.table.columns.map((column) =>
          column.id === columnId ? { ...column, label } : column,
        ),
      },
    });
  }

  function handleAddSubstitutionRow(blockId: string) {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current) return;
    const row: SubstitutionTableRowRecord = {
      id: crypto.randomUUID(),
      sortOrder: current.table.rows.length,
      cells: current.table.columns.map((column) => ({
        id: crypto.randomUUID(),
        columnId: column.id,
        text: "",
      })),
    };
    handleSubstitutionTableChange(blockId, current.id, {
      table: { ...current.table, rows: [...current.table.rows, row] },
    });
  }

  function handleDeleteSubstitutionRow(blockId: string, rowId: string) {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current) return;
    const row = current.table.rows.find((item) => item.id === rowId);
    const deletedCellIds = new Set(row?.cells.map((cell) => cell.id) || []);
    handleSubstitutionTableChange(blockId, current.id, {
      table: {
        ...current.table,
        rows: current.table.rows.filter((item) => item.id !== rowId),
        answers: current.table.answers.map((answer) => ({
          ...answer,
          selections: answer.selections.map((selection) =>
            deletedCellIds.has(selection.cellId) ? { ...selection, cellId: "" } : selection,
          ),
        })),
      },
    });
  }

  function handleMoveSubstitutionRow(blockId: string, rowId: string, direction: "up" | "down") {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current) return;
    const currentIndex = current.table.rows.findIndex((row) => row.id === rowId);
    if (currentIndex < 0) return;
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= current.table.rows.length) return;
    const rows = [...current.table.rows];
    const [moved] = rows.splice(currentIndex, 1);
    rows.splice(nextIndex, 0, moved);
    handleSubstitutionTableChange(blockId, current.id, { table: { ...current.table, rows } });
  }

  function handleSubstitutionCellChange(
    blockId: string,
    rowId: string,
    cellId: string,
    text: string,
  ) {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current) return;
    handleSubstitutionTableChange(blockId, current.id, {
      table: {
        ...current.table,
        rows: current.table.rows.map((row) =>
          row.id === rowId
            ? { ...row, cells: row.cells.map((cell) => (cell.id === cellId ? { ...cell, text } : cell)) }
            : row,
        ),
      },
    });
  }

  function handleAddSubstitutionAnswer(blockId: string) {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current) return;
    const answer = {
      id: crypto.randomUUID(),
      sortOrder: current.table.answers.length,
      selections: current.table.columns.map((column) => ({ columnId: column.id, cellId: "" })),
      sentence: "",
    };
    handleSubstitutionTableChange(blockId, current.id, {
      table: { ...current.table, answers: [...current.table.answers, answer] },
    });
  }

  function handleDeleteSubstitutionAnswer(blockId: string, answerId: string) {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current) return;
    handleSubstitutionTableChange(blockId, current.id, {
      table: {
        ...current.table,
        answers: current.table.answers.filter((answer) => answer.id !== answerId),
      },
    });
  }

  function handleSubstitutionAnswerSelection(
    blockId: string,
    answerId: string,
    columnId: string,
    cellId: string,
  ) {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current) return;
    handleSubstitutionTableChange(blockId, current.id, {
      table: {
        ...current.table,
        answers: current.table.answers.map((answer) =>
          answer.id === answerId
            ? {
                ...answer,
                selections: current.table.columns.map((column) => {
                  const selection = answer.selections.find((item) => item.columnId === column.id);
                  return column.id === columnId
                    ? { columnId: column.id, cellId }
                    : { columnId: column.id, cellId: selection?.cellId || "" };
                }),
              }
            : answer,
        ),
      },
    });
  }

  function handleSubstitutionAnswerSentence(blockId: string, answerId: string, sentence: string) {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current) return;
    handleSubstitutionTableChange(blockId, current.id, {
      table: {
        ...current.table,
        answers: current.table.answers.map((answer) =>
          answer.id === answerId ? { ...answer, sentence } : answer,
        ),
      },
    });
  }

  function handleUseSubstitutionPreview(blockId: string, answerId: string) {
    const current = blocks.find((block) => block.id === blockId)?.substitutionTable;
    if (!current) return;
    handleSubstitutionAnswerSentence(
      blockId,
      answerId,
      getSubstitutionAnswerPreview(current.table, answerId),
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

  async function handleChangingSentenceChange(
    blockId: string,
    patch: { details?: string; rows?: ChangingSentenceRowRecord[] },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.changingSentence) return;

    const rows = (patch.rows ?? currentBlock.changingSentence.rows).map((row, index) => ({
      ...row,
      sortOrder: index,
    }));
    const next = {
      ...currentBlock.changingSentence,
      question: patch.rows !== undefined ? "" : currentBlock.changingSentence.question,
      answer: patch.rows !== undefined ? serializeChangingSentenceRows(rows) : currentBlock.changingSentence.answer,
      details: patch.details !== undefined ? patch.details : currentBlock.changingSentence.details,
      rows,
    };

    patchBlock(blockId, (block) => ({
      ...block,
      changingSentence: block.changingSentence ? next : null,
    }));

    saveInBackground(`changing-sentence:${blockId}`, () =>
      updateChangingSentence({
        contentId: content.id,
        blockId,
        recordId: next.id,
        question: next.question,
        answer: next.answer,
        details: next.details,
      }),
    );
  }

  function openChangingSentenceModal(blockId: string) {
    setActiveChangingSentenceBlockId(blockId);
    resetChangingSentenceModal();
    setIsChangingSentenceModalOpen(true);
  }

  async function handleCreateChangingSentenceRow(keepOpen: boolean) {
    if (!activeChangingSentenceBlockId) return;
    const currentBlock = blocks.find((block) => block.id === activeChangingSentenceBlockId);
    if (!currentBlock?.changingSentence) return;

    const nextRow: ChangingSentenceRowRecord = {
      id: crypto.randomUUID(),
      sortOrder: currentBlock.changingSentence.rows.length,
      question: newChangingSentenceDraft.question,
      answer: newChangingSentenceDraft.answer,
    };

    await handleChangingSentenceChange(activeChangingSentenceBlockId, {
      rows: [...currentBlock.changingSentence.rows, nextRow],
    });

    if (keepOpen) {
      resetChangingSentenceModal();
      return;
    }

    resetChangingSentenceModal();
    setIsChangingSentenceModalOpen(false);
    setActiveChangingSentenceBlockId(null);
  }

  async function handleChangingSentenceRowPatch(
    blockId: string,
    rowId: string,
    patch: Partial<Pick<ChangingSentenceRowRecord, "question" | "answer">>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.changingSentence) return;

    await handleChangingSentenceChange(blockId, {
      rows: currentBlock.changingSentence.rows.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      ),
    });
  }

  async function handleDeleteChangingSentenceRow(blockId: string, rowId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.changingSentence) return;

    await handleChangingSentenceChange(blockId, {
      rows: currentBlock.changingSentence.rows
        .filter((row) => row.id !== rowId)
        .map((row, index) => ({ ...row, sortOrder: index })),
    });
  }

  async function handleTagQuestionChange(
    blockId: string,
    patch: {
      mode?: TagQuestionMode;
      question?: string;
      details?: string;
      rows?: TagQuestionRowRecord[];
      blanks?: FillBlankAnswerRecord[];
    },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.tagQuestion) return;

    const mode = patch.mode ?? currentBlock.tagQuestion.mode;
    const question = patch.question !== undefined ? patch.question : currentBlock.tagQuestion.question;
    const details = patch.details !== undefined ? patch.details : currentBlock.tagQuestion.details;
    const rows = (patch.rows ?? currentBlock.tagQuestion.rows).map((row, index) => ({
      ...row,
      sortOrder: index,
    }));
    const blankCount = countFillBlankMarkers(question);
    const sourceBlanks = patch.blanks ?? currentBlock.tagQuestion.blanks;
    const blanks = resizeFillBlankAnswers(sourceBlanks, blankCount);
    const answer = serializeTagQuestionState(mode, rows, blanks);

    const next: TagQuestionDraft = {
      ...currentBlock.tagQuestion,
      mode,
      question,
      answer,
      details,
      rows,
      blanks,
    };

    patchBlock(blockId, (block) => ({
      ...block,
      tagQuestion: block.tagQuestion ? next : null,
    }));

    saveInBackground(`tag-question:${blockId}`, () =>
      updateTagQuestion({
        contentId: content.id,
        blockId,
        recordId: next.id,
        question: next.question,
        answer: next.answer,
        details: next.details,
      }),
    );
  }

  function openTagQuestionModal(blockId: string) {
    setActiveTagQuestionBlockId(blockId);
    resetTagQuestionModal();
    setIsTagQuestionModalOpen(true);
  }

  async function handleCreateTagQuestionRow(keepOpen: boolean) {
    if (!activeTagQuestionBlockId) return;
    const currentBlock = blocks.find((block) => block.id === activeTagQuestionBlockId);
    if (!currentBlock?.tagQuestion) return;

    const nextRow: TagQuestionRowRecord = {
      id: crypto.randomUUID(),
      sortOrder: currentBlock.tagQuestion.rows.length,
      question: newTagQuestionDraft.question,
      answer: newTagQuestionDraft.answer,
    };

    await handleTagQuestionChange(activeTagQuestionBlockId, {
      rows: [...currentBlock.tagQuestion.rows, nextRow],
    });

    if (keepOpen) {
      resetTagQuestionModal();
      return;
    }

    resetTagQuestionModal();
    setIsTagQuestionModalOpen(false);
    setActiveTagQuestionBlockId(null);
  }

  async function handleTagQuestionRowPatch(
    blockId: string,
    rowId: string,
    patch: Partial<Pick<TagQuestionRowRecord, "question" | "answer">>,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.tagQuestion) return;

    await handleTagQuestionChange(blockId, {
      rows: currentBlock.tagQuestion.rows.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      ),
    });
  }

  async function handleDeleteTagQuestionRow(blockId: string, rowId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.tagQuestion) return;

    await handleTagQuestionChange(blockId, {
      rows: currentBlock.tagQuestion.rows
        .filter((row) => row.id !== rowId)
        .map((row, index) => ({ ...row, sortOrder: index })),
    });
  }

  async function handleTagQuestionParagraphAnswerChange(
    blockId: string,
    blankId: string,
    answer: string,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.tagQuestion) return;

    await handleTagQuestionChange(blockId, {
      blanks: currentBlock.tagQuestion.blanks.map((blank) =>
        blank.id === blankId ? { ...blank, answer } : blank,
      ),
    });
  }

  async function handleDeleteTagQuestionParagraphBlank(blockId: string, blankId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.tagQuestion) return;

    const blankIndex = currentBlock.tagQuestion.blanks.findIndex((blank) => blank.id === blankId);
    if (blankIndex < 0) return;

    const question = removeFillBlankMarkerAt(currentBlock.tagQuestion.question, blankIndex);
    const blanks = currentBlock.tagQuestion.blanks
      .filter((blank) => blank.id !== blankId)
      .map((blank, index) => ({ ...blank, sortOrder: index }));

    await handleTagQuestionChange(blockId, { question, blanks });
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

  async function handleInformationTransferBlankChange(
    blockId: string,
    patch: { question?: string; details?: string; blanks?: InformationTransferBlankRecord[] },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.informationTransfer) return;

    const question =
      patch.question !== undefined ? patch.question : currentBlock.informationTransfer.question;
    const blankCount = countFillBlankMarkers(question);
    const sourceBlanks =
      patch.blanks !== undefined ? patch.blanks : currentBlock.informationTransfer.blanks;
    const blanks = resizeFillBlankAnswers(sourceBlanks, blankCount);
    const details =
      patch.details !== undefined ? patch.details : currentBlock.informationTransfer.details;
    const documentJson = serializeFillBlankAnswers(blanks);

    const next = {
      ...currentBlock.informationTransfer,
      question,
      answer: "",
      details,
      documentJson,
      rows: [],
      blanks,
    };

    patchBlock(blockId, (block) => ({
      ...block,
      informationTransfer: block.informationTransfer ? next : null,
    }));

    saveInBackground(`information-transfer:${blockId}`, () =>
      updateInformationTransfer({
        contentId: content.id,
        blockId,
        recordId: next.id,
        question: next.question,
        answer: next.answer,
        details: next.details,
        documentJson: next.documentJson,
      }),
    );
  }

  async function handleInformationTransferBlankAnswerChange(
    blockId: string,
    blankId: string,
    answer: string,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.informationTransfer) return;

    await handleInformationTransferBlankChange(blockId, {
      blanks: currentBlock.informationTransfer.blanks.map((item) =>
        item.id === blankId ? { ...item, answer } : item,
      ),
    });
  }

  async function handleDeleteInformationTransferBlank(blockId: string, blankId: string) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.informationTransfer) return;

    const blankIndex = currentBlock.informationTransfer.blanks.findIndex(
      (item) => item.id === blankId,
    );
    if (blankIndex < 0) return;

    const question = removeFillBlankMarkerAt(
      currentBlock.informationTransfer.question,
      blankIndex,
    );
    const blanks = currentBlock.informationTransfer.blanks
      .filter((item) => item.id !== blankId)
      .map((item, index) => ({ ...item, sortOrder: index }));

    await handleInformationTransferBlankChange(blockId, { question, blanks });
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

  async function handleBlankExerciseChange(
    kind: BlankExerciseKind,
    blockId: string,
    patch: { question?: string; details?: string; blanks?: FillBlankAnswerRecord[] },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock) return;

    const currentValue = getBlankExerciseValue(currentBlock, kind);
    const config = THREE_FIELD_BLOCK_META[kind];
    if (!currentValue || !config) return;

    const question = patch.question !== undefined ? patch.question : currentValue.question;
    const blankCount = countFillBlankMarkers(question);
    const sourceBlanks = patch.blanks !== undefined ? patch.blanks : currentValue.blanks;
    const blanks = resizeFillBlankAnswers(sourceBlanks, blankCount);
    const answer = serializeFillBlankAnswers(blanks);
    const details = patch.details !== undefined ? patch.details : currentValue.details;

    const next: BlankExerciseValue = {
      ...currentValue,
      question,
      answer,
      details,
      blanks,
    };

    patchBlock(blockId, (block) => patchBlankExerciseValue(block, kind, next));

    saveInBackground(`${kind}:${blockId}`, () =>
      config.updateAction({
        contentId: content.id,
        blockId,
        recordId: next.id,
        question: next.question,
        answer: next.answer,
        details: next.details,
      }),
    );
  }

  async function handleBlankExerciseAnswerChange(
    kind: BlankExerciseKind,
    blockId: string,
    answerId: string,
    answer: string,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock) return;

    const currentValue = getBlankExerciseValue(currentBlock, kind);
    if (!currentValue) return;

    await handleBlankExerciseChange(kind, blockId, {
      blanks: currentValue.blanks.map((item) =>
        item.id === answerId ? { ...item, answer } : item,
      ),
    });
  }

  async function handleDeleteBlankExercise(
    kind: BlankExerciseKind,
    blockId: string,
    blankId: string,
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock) return;

    const currentValue = getBlankExerciseValue(currentBlock, kind);
    if (!currentValue) return;

    const blankIndex = currentValue.blanks.findIndex((item) => item.id === blankId);
    if (blankIndex < 0) return;

    const question = removeFillBlankMarkerAt(currentValue.question, blankIndex);
    const blanks = currentValue.blanks
      .filter((item) => item.id !== blankId)
      .map((item, index) => ({ ...item, sortOrder: index }));

    await handleBlankExerciseChange(kind, blockId, { question, blanks });
  }

  async function handleSuffixPrefixChange(
    blockId: string,
    patch: { question?: string; details?: string; items?: SuffixPrefixItemRecord[] },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const currentValue = currentBlock?.suffixAndPrefix;
    if (!currentValue) return;

    const question = patch.question !== undefined ? patch.question : currentValue.question;
    const details = patch.details !== undefined ? patch.details : currentValue.details;
    const items = patch.items !== undefined
      ? patch.items.map((item, index) => ({ ...item, sortOrder: index }))
      : syncSuffixPrefixItems(question, currentValue.items);

    // Preserve an old plain-text/rich-text answer until the first structured
    // suffix/prefix target is added. This prevents legacy content from being
    // overwritten merely by editing the question/details.
    const answer = items.length > 0 || currentValue.answer.trim().startsWith("{")
      ? serializeSuffixPrefixItems(items)
      : currentValue.answer;

    const next: SuffixPrefixDraft = {
      ...currentValue,
      question,
      answer,
      details,
      items,
    };

    patchBlock(blockId, (block) => ({ ...block, suffixAndPrefix: next }));
    saveInBackground(`suffix-and-prefix:${blockId}`, () =>
      updateSuffixAndPrefix({
        contentId: content.id,
        blockId,
        recordId: next.id,
        question: next.question,
        answer: next.answer,
        details: next.details,
      }),
    );
  }

  async function handleSuffixPrefixAnswerChange(blockId: string, itemId: string, answer: string) {
    const currentValue = blocks.find((block) => block.id === blockId)?.suffixAndPrefix;
    if (!currentValue) return;
    await handleSuffixPrefixChange(blockId, {
      items: currentValue.items.map((item) => item.id === itemId ? { ...item, answer } : item),
    });
  }

  async function handleDeleteSuffixPrefixItem(blockId: string, itemId: string) {
    const currentValue = blocks.find((block) => block.id === blockId)?.suffixAndPrefix;
    if (!currentValue) return;
    const targetIndex = currentValue.items.findIndex((item) => item.id === itemId);
    if (targetIndex < 0) return;

    const question = removeSuffixPrefixWordAt(currentValue.question, targetIndex);
    const items = currentValue.items
      .filter((item) => item.id !== itemId)
      .map((item, index) => ({ ...item, sortOrder: index }));
    await handleSuffixPrefixChange(blockId, { question, items });
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
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <FieldLabel>Passage</FieldLabel>
                            <FieldDescription>
                              Write a custom passage or link an existing Paragraph block from this content.
                            </FieldDescription>
                          </div>
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                            <span>Use Paragraph block</span>
                            <Switch
                              checked={block.questionAnswerExercise.passageSource === "paragraph"}
                              onCheckedChange={(checked) =>
                                void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, {
                                  passageSource: checked ? "paragraph" : "manual",
                                })
                              }
                            />
                          </label>
                        </div>

                        {block.questionAnswerExercise.passageSource === "paragraph" ? (
                          <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
                            <FieldLabel>Paragraph</FieldLabel>
                            <QuestionAnswerPassageCombobox
                              value={block.questionAnswerExercise.paragraphBlockId || ""}
                              options={paragraphPassageOptions}
                              onChange={(paragraphBlockId) =>
                                void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, {
                                  paragraphBlockId: paragraphBlockId || null,
                                })
                              }
                            />
                            {paragraphPassageOptions.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                Add a Paragraph block to this content first, then it will appear here.
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-xl border bg-background p-3">
                            <TiptapRichTextEditor
                              value={block.questionAnswerExercise.details}
                              onChange={(value) =>
                                void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, { details: value })
                              }
                              minHeight={160}
                              placeholder="Write the passage for these Question Answer items..."
                            />
                          </div>
                        )}
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

              {block.kind === "table-completion" && block.questionAnswerExercise?.table ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-6`}>
                  <FieldGroup className="gap-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field>
                        <FieldContent>
                          <FieldLabel>Title</FieldLabel>
                          <BufferedInput
                            value={block.questionAnswerExercise.title}
                            onCommit={(value) =>
                              handleTableCompletionChange(block.id, block.questionAnswerExercise!.id, { title: value })
                            }
                            placeholder="Table Completion"
                          />
                        </FieldContent>
                      </Field>
                      <Field>
                        <FieldContent>
                          <FieldLabel>Instruction</FieldLabel>
                          <BufferedInput
                            value={block.questionAnswerExercise.instruction}
                            onCommit={(value) =>
                              handleTableCompletionChange(block.id, block.questionAnswerExercise!.id, { instruction: value })
                            }
                            placeholder="Complete the table to make meaningful sentences."
                          />
                        </FieldContent>
                      </Field>
                    </div>

                    <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold">Table Builder</h3>
                          <p className="text-sm text-muted-foreground">
                            Add sentence parts in each column. A correct answer connects one cell from every column.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {block.questionAnswerExercise.table.columns.length} columns × {block.questionAnswerExercise.table.rows.length} rows
                          </Badge>
                          <Button type="button" variant="outline" size="sm" onClick={() => handleAddTableCompletionColumn(block.id)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add column
                          </Button>
                          <Button type="button" size="sm" onClick={() => handleAddTableCompletionRow(block.id)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add row
                          </Button>
                        </div>
                      </div>

                      <div className="overflow-x-auto p-4">
                        <table className="w-full min-w-[760px] border-separate border-spacing-0 overflow-hidden rounded-xl border">
                          <thead>
                            <tr className="bg-muted/40">
                              <th className="w-14 border-b border-r p-2 text-center text-xs font-medium text-muted-foreground">#</th>
                              {block.questionAnswerExercise.table.columns.map((column, columnIndex) => (
                                <th key={column.id} className="min-w-[210px] border-b border-r p-2 align-top last:border-r-0">
                                  <div className="flex items-center gap-2">
                                    <BufferedInput
                                      value={column.label}
                                      onCommit={(value) => handleTableCompletionColumnLabel(block.id, column.id, value)}
                                      placeholder={`Column ${columnIndex + 1}`}
                                      className="h-9 font-medium"
                                    />
                                    {block.questionAnswerExercise!.table!.columns.length > 2 ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => handleDeleteTableCompletionColumn(block.id, column.id)}
                                        aria-label={`Delete column ${columnIndex + 1}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                  </div>
                                </th>
                              ))}
                              <th className="w-32 border-b p-2 text-center text-xs font-medium text-muted-foreground">Row actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {block.questionAnswerExercise.table.rows.length === 0 ? (
                              <tr>
                                <td colSpan={block.questionAnswerExercise.table.columns.length + 2} className="p-8 text-center text-sm text-muted-foreground">
                                  No rows yet. Click <strong>Add row</strong> to add sentence parts.
                                </td>
                              </tr>
                            ) : (
                              block.questionAnswerExercise.table.rows.map((row, rowIndex) => (
                                <tr key={row.id} className="align-top">
                                  <td className="border-b border-r bg-muted/20 p-3 text-center text-sm font-semibold last:border-b-0">
                                    {rowIndex + 1}
                                  </td>
                                  {block.questionAnswerExercise!.table!.columns.map((column, columnIndex) => {
                                    const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                                    if (!cell) return <td key={`${row.id}-${column.id}`} className="border-b border-r p-3" />;
                                    return (
                                      <td key={cell.id} className="border-b border-r p-3 last:border-r-0">
                                        <BufferedInput
                                          value={cell.mode === "answer" ? cell.answer || cell.text : cell.text}
                                          onCommit={(value) =>
                                            handleTableCompletionCellPatch(block.id, row.id, cell.id, {
                                              mode: "text",
                                              text: value,
                                              answer: "",
                                            })
                                          }
                                          placeholder={`${column.label || `Column ${columnIndex + 1}`} - row ${rowIndex + 1}`}
                                        />
                                      </td>
                                    );
                                  })}
                                  <td className="border-b p-2">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={rowIndex === 0}
                                        onClick={() => handleMoveTableCompletionRow(block.id, row.id, "up")}
                                        aria-label={`Move row ${rowIndex + 1} up`}
                                      >
                                        <ArrowUp className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={rowIndex === block.questionAnswerExercise!.table!.rows.length - 1}
                                        onClick={() => handleMoveTableCompletionRow(block.id, row.id, "down")}
                                        aria-label={`Move row ${rowIndex + 1} down`}
                                      >
                                        <ArrowDown className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => handleDeleteTableCompletionRow(block.id, row.id)}
                                        aria-label={`Delete row ${rowIndex + 1}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                        <strong>Example:</strong> with 3 columns, Answer #1 can be Column A row 1 + Column B row 3 + Column C row 2.
                      </div>
                    </div>

                    {block.questionAnswerExercise.table.rows.length > 0 ? (
                      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                        <div className="border-b bg-muted/30 px-4 py-3">
                          <h3 className="text-sm font-semibold">Correct sentence connections</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            There is one answer slot for each table row. For every answer, select one cell from every column. The preview shows the complete sentence.
                          </p>
                        </div>

                        <div className="space-y-4 p-4">
                          {block.questionAnswerExercise.table.answers.map((answer, answerIndex) => {
                            const preview = getTableCompletionAnswerPreview(block.questionAnswerExercise!.table!, answer.id);
                            return (
                              <div key={answer.id} className="rounded-xl border p-4">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                  <div className="font-semibold">Answer #{answerIndex + 1}</div>
                                  <Badge variant={preview ? "secondary" : "outline"}>
                                    {answer.selections.filter((selection) => selection.cellId).length}/{block.questionAnswerExercise!.table!.columns.length} columns connected
                                  </Badge>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {block.questionAnswerExercise!.table!.columns.map((column, columnIndex) => {
                                    const selected = answer.selections.find((selection) => selection.columnId === column.id)?.cellId || "";
                                    const usedByOtherAnswers = new Set(
                                      block.questionAnswerExercise!.table!.answers
                                        .filter((item) => item.id !== answer.id)
                                        .map(
                                          (item) =>
                                            item.selections.find((selection) => selection.columnId === column.id)?.cellId || "",
                                        )
                                        .filter(Boolean),
                                    );
                                    const options = block.questionAnswerExercise!.table!.rows.flatMap((row, rowIndex) => {
                                      const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                                      if (!cell) return [];
                                      const text = cell.mode === "answer" ? cell.answer || cell.text : cell.text;
                                      return [
                                        {
                                          id: cell.id,
                                          label: `Row ${rowIndex + 1}${text ? ` — ${text}` : ""}`,
                                          disabled: usedByOtherAnswers.has(cell.id),
                                        },
                                      ];
                                    });

                                    return (
                                      <div key={column.id} className="space-y-1.5">
                                        <div className="text-xs font-medium text-muted-foreground">
                                          {column.label || `Column ${columnIndex + 1}`}
                                        </div>
                                        <TableCompletionChoiceCombobox
                                          value={selected}
                                          options={options}
                                          placeholder={`Choose from ${column.label || `Column ${columnIndex + 1}`}`}
                                          onChange={(cellId) =>
                                            handleTableCompletionAnswerSelection(
                                              block.id,
                                              answer.id,
                                              column.id,
                                              cellId,
                                            )
                                          }
                                        />
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="mt-4 rounded-xl border border-dashed bg-muted/20 p-3">
                                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sentence preview</div>
                                  <div className="text-sm font-medium">
                                    {preview || "Select one item from every column to build this answer."}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {block.questionAnswerExercise.table.rows.length === 0 &&
                    (fillBlankQuestionToText(block.questionAnswerExercise.question) || fillBlankQuestionToText(block.questionAnswerExercise.answer)) ? (
                      <div className="space-y-4 rounded-2xl border border-dashed p-4">
                        <div>
                          <h3 className="text-sm font-semibold">Legacy Table Completion content</h3>
                          <p className="text-sm text-muted-foreground">
                            Your previous Question/Answer data is preserved below. Add rows in the new Table Builder when you are ready to use interactive table cells.
                          </p>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <Field>
                            <FieldContent>
                              <FieldLabel>Legacy Question</FieldLabel>
                              <div className="rounded-xl border bg-background p-3">
                                <TiptapRichTextEditor
                                  value={block.questionAnswerExercise.question}
                                  onChange={(value) =>
                                    void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, { question: value })
                                  }
                                  minHeight={140}
                                  placeholder="Existing table/question..."
                                />
                              </div>
                            </FieldContent>
                          </Field>
                          <Field>
                            <FieldContent>
                              <FieldLabel>Legacy Answer</FieldLabel>
                              <div className="rounded-xl border bg-background p-3">
                                <TiptapRichTextEditor
                                  value={block.questionAnswerExercise.answer}
                                  onChange={(value) =>
                                    void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, { answer: value })
                                  }
                                  minHeight={140}
                                  placeholder="Existing answer..."
                                />
                              </div>
                            </FieldContent>
                          </Field>
                        </div>
                      </div>
                    ) : null}

                    <Field>
                      <FieldContent>
                        <FieldLabel>Details / Explanation</FieldLabel>
                        <div className="rounded-xl border bg-background p-3">
                          <TiptapRichTextEditor
                            value={block.questionAnswerExercise.details}
                            onChange={(value) =>
                              handleTableCompletionChange(block.id, block.questionAnswerExercise!.id, { details: value })
                            }
                            minHeight={140}
                            placeholder="Optional explanation or note for students..."
                          />
                        </div>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </CardContent>
              ) : null}

              {block.kind === "column-matching" && block.questionAnswerExercise ? (
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
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-6`}>
                  <FieldGroup className="gap-6">
                    <FillBlankQuestionEditor
                      value={block.informationTransfer.question}
                      onCommit={(value) =>
                        void handleInformationTransferBlankChange(block.id, { question: value })
                      }
                      title="Question / Information"
                      description="Write and format the Information Transfer text with Tiptap. Put the cursor where a student answer field should appear, then click Add blank."
                      addButtonLabel="Add blank"
                      countLabel="field"
                      placeholder="Write the information here, place the cursor at each transfer point, and click Add blank."
                    />

                    <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium">Answer</h3>
                          <p className="text-sm text-muted-foreground">
                            Each blank in the Information Transfer question automatically creates one answer field here.
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {block.informationTransfer.blanks.length} answer
                          {block.informationTransfer.blanks.length === 1 ? "" : "s"}
                        </Badge>
                      </div>

                      <div className="p-4">
                        {block.informationTransfer.blanks.length === 0 ? (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            No transfer blanks yet. In the <strong>Question / Information</strong> box, place the cursor where needed and click <strong>Add blank</strong>.
                          </div>
                        ) : (
                          <div className="rounded-2xl border bg-muted/10 p-4">
                            <div className="flex flex-wrap gap-4">
                              {block.informationTransfer.blanks.map((blank, index) => (
                                <div
                                  key={blank.id}
                                  className="min-w-[220px] flex-1 space-y-2 rounded-xl border bg-background p-3 md:max-w-[260px]"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <FieldLabel htmlFor={`information-transfer-blank-${blank.id}`}>
                                      Blank #{index + 1}
                                    </FieldLabel>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() =>
                                        void handleDeleteInformationTransferBlank(block.id, blank.id)
                                      }
                                      aria-label={`Delete Information Transfer blank ${index + 1}`}
                                      title={`Delete blank ${index + 1} from question and answer`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <BufferedInput
                                    id={`information-transfer-blank-${blank.id}`}
                                    value={blank.answer}
                                    onCommit={(value) =>
                                      void handleInformationTransferBlankAnswerChange(
                                        block.id,
                                        blank.id,
                                        value,
                                      )
                                    }
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
                            value={block.informationTransfer.details}
                            onChange={(value) =>
                              void handleInformationTransferBlankChange(block.id, { details: value })
                            }
                            minHeight={140}
                            placeholder="Optional source details, instruction, or explanation for students..."
                          />
                        </div>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </CardContent>
              ) : null}

              {block.kind === "substitution-table" && block.substitutionTable?.table ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-6`}>
                  <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold">Substitution Table Builder</h3>
                        <p className="text-sm text-muted-foreground">
                          Add sentence parts under each column. Empty cells are allowed, so every column can have a different number of usable items.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {block.substitutionTable.table.columns.length} columns × {block.substitutionTable.table.rows.length} rows
                        </Badge>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleAddSubstitutionColumn(block.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add column
                        </Button>
                        <Button type="button" size="sm" onClick={() => handleAddSubstitutionRow(block.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add row
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto p-4">
                      <table className="w-full min-w-[760px] border-separate border-spacing-0 overflow-hidden rounded-xl border">
                        <thead>
                          <tr className="bg-muted/40">
                            <th className="w-14 border-b border-r p-2 text-center text-xs font-medium text-muted-foreground">#</th>
                            {block.substitutionTable.table.columns.map((column, columnIndex) => (
                              <th key={column.id} className="min-w-[210px] border-b border-r p-2 align-top last:border-r-0">
                                <div className="flex items-center gap-2">
                                  <BufferedInput
                                    value={column.label}
                                    onCommit={(value) => handleSubstitutionColumnLabel(block.id, column.id, value)}
                                    placeholder={substitutionColumnLabel(columnIndex)}
                                    className="h-9 font-medium"
                                  />
                                  {block.substitutionTable!.table.columns.length > 2 ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => handleDeleteSubstitutionColumn(block.id, column.id)}
                                      aria-label={`Delete ${column.label || substitutionColumnLabel(columnIndex)}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              </th>
                            ))}
                            <th className="w-32 border-b p-2 text-center text-xs font-medium text-muted-foreground">Row actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {block.substitutionTable.table.rows.length === 0 ? (
                            <tr>
                              <td colSpan={block.substitutionTable.table.columns.length + 2} className="p-8 text-center text-sm text-muted-foreground">
                                No rows yet. Click <strong>Add row</strong> to add substitution-table parts.
                              </td>
                            </tr>
                          ) : (
                            block.substitutionTable.table.rows.map((row, rowIndex) => (
                              <tr key={row.id} className="align-top">
                                <td className="border-b border-r bg-muted/20 p-3 text-center text-sm font-semibold">
                                  {rowIndex + 1}
                                </td>
                                {block.substitutionTable!.table.columns.map((column, columnIndex) => {
                                  const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                                  return (
                                    <td key={cell?.id || `${row.id}-${column.id}`} className="border-b border-r p-3 last:border-r-0">
                                      {cell ? (
                                        <BufferedInput
                                          value={cell.text}
                                          onCommit={(value) => handleSubstitutionCellChange(block.id, row.id, cell.id, value)}
                                          placeholder={`${column.label || substitutionColumnLabel(columnIndex)} - row ${rowIndex + 1}`}
                                        />
                                      ) : null}
                                    </td>
                                  );
                                })}
                                <td className="border-b p-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      disabled={rowIndex === 0}
                                      onClick={() => handleMoveSubstitutionRow(block.id, row.id, "up")}
                                      aria-label={`Move row ${rowIndex + 1} up`}
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      disabled={rowIndex === block.substitutionTable!.table.rows.length - 1}
                                      onClick={() => handleMoveSubstitutionRow(block.id, row.id, "down")}
                                      aria-label={`Move row ${rowIndex + 1} down`}
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => handleDeleteSubstitutionRow(block.id, row.id)}
                                      aria-label={`Delete row ${rowIndex + 1}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                      Cells may be reused in several answers. This matches real substitution tables such as <strong>Education + is</strong> being used with more than one ending.
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold">Correct sentences</h3>
                        <p className="text-sm text-muted-foreground">
                          Choose one usable item from every column, then confirm the final correct sentence. The final sentence is editable for grammar changes such as <strong>be → am / is / are</strong>.
                        </p>
                      </div>
                      <Button type="button" size="sm" onClick={() => handleAddSubstitutionAnswer(block.id)} disabled={block.substitutionTable.table.rows.length === 0}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add answer
                      </Button>
                    </div>

                    <div className="space-y-4 p-4">
                      {block.substitutionTable.table.answers.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                          No correct sentences yet. Build the table first, then click <strong>Add answer</strong> for every meaningful sentence students should be able to make.
                        </div>
                      ) : (
                        block.substitutionTable.table.answers.map((answer, answerIndex) => {
                          const preview = getSubstitutionAnswerPreview(block.substitutionTable!.table, answer.id);
                          return (
                            <div key={answer.id} className="rounded-xl border p-4">
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div className="font-semibold">Answer #{answerIndex + 1}</div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={preview ? "secondary" : "outline"}>
                                    {answer.selections.filter((selection) => selection.cellId).length}/{block.substitutionTable!.table.columns.length} columns connected
                                  </Badge>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => handleDeleteSubstitutionAnswer(block.id, answer.id)}
                                    aria-label={`Delete answer ${answerIndex + 1}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {block.substitutionTable!.table.columns.map((column, columnIndex) => {
                                  const selected = answer.selections.find((selection) => selection.columnId === column.id)?.cellId || "";
                                  const options = block.substitutionTable!.table.rows.flatMap((row, rowIndex) => {
                                    const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                                    if (!cell?.text.trim()) return [];
                                    return [{ id: cell.id, label: `Row ${rowIndex + 1} — ${cell.text.trim()}` }];
                                  });

                                  return (
                                    <div key={column.id} className="space-y-1.5">
                                      <div className="text-xs font-medium text-muted-foreground">
                                        {column.label || substitutionColumnLabel(columnIndex)}
                                      </div>
                                      <TableCompletionChoiceCombobox
                                        value={selected}
                                        options={options}
                                        placeholder={`Choose from ${column.label || substitutionColumnLabel(columnIndex)}`}
                                        onChange={(cellId) =>
                                          handleSubstitutionAnswerSelection(block.id, answer.id, column.id, cellId)
                                        }
                                      />
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="mt-4 rounded-xl border border-dashed bg-muted/20 p-3">
                                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected-parts preview</div>
                                <div className="text-sm font-medium">
                                  {preview || "Select one item from every column."}
                                </div>
                              </div>

                              <div className="mt-4 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <FieldLabel htmlFor={`substitution-answer-${answer.id}`}>Correct sentence</FieldLabel>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={!preview}
                                    onClick={() => handleUseSubstitutionPreview(block.id, answer.id)}
                                  >
                                    Use preview
                                  </Button>
                                </div>
                                <BufferedInput
                                  id={`substitution-answer-${answer.id}`}
                                  value={answer.sentence}
                                  onCommit={(value) => handleSubstitutionAnswerSentence(block.id, answer.id, value)}
                                  placeholder="Write the final grammatically correct sentence..."
                                />
                                <p className="text-xs text-muted-foreground">
                                  Example: selected parts may show “I be happy with my result.” but the correct sentence can be “I am happy with my result.”
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <Field>
                    <FieldContent>
                      <FieldLabel>Details / Instruction</FieldLabel>
                      <div className="rounded-xl border bg-background p-3">
                        <TiptapRichTextEditor
                          value={block.substitutionTable.details}
                          onChange={(value) =>
                            handleSubstitutionTableChange(block.id, block.substitutionTable!.id, { details: value })
                          }
                          minHeight={140}
                          placeholder="Optional instruction, explanation, or note for students..."
                        />
                      </div>
                    </FieldContent>
                  </Field>

                  {block.substitutionTable.table.rows.length === 0 &&
                  (fillBlankQuestionToText(block.substitutionTable.question) ||
                    (!block.substitutionTable.answer.trim().startsWith("{") && fillBlankQuestionToText(block.substitutionTable.answer))) ? (
                    <div className="space-y-4 rounded-2xl border border-dashed p-4">
                      <div>
                        <h3 className="text-sm font-semibold">Legacy Substitution Table content</h3>
                        <p className="text-sm text-muted-foreground">
                          Your old Question/Answer content is preserved. Add rows above when you are ready to move to the new table builder.
                        </p>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Field>
                          <FieldContent>
                            <FieldLabel>Legacy Question</FieldLabel>
                            <div className="rounded-xl border bg-background p-3">
                              <TiptapRichTextEditor
                                value={block.substitutionTable.question}
                                onChange={(value) =>
                                  void handleThreeFieldChange("substitution-table", block.id, block.substitutionTable!.id, { question: value })
                                }
                                minHeight={140}
                                placeholder="Existing substitution-table question..."
                              />
                            </div>
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldContent>
                            <FieldLabel>Legacy Answer</FieldLabel>
                            <div className="rounded-xl border bg-background p-3">
                              <TiptapRichTextEditor
                                value={block.substitutionTable.answer}
                                onChange={(value) =>
                                  void handleThreeFieldChange("substitution-table", block.id, block.substitutionTable!.id, { answer: value })
                                }
                                minHeight={140}
                                placeholder="Existing substitution-table answer..."
                              />
                            </div>
                          </FieldContent>
                        </Field>
                      </div>
                    </div>
                  ) : null}
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

              {isBlankExerciseKind(block.kind) && getBlankExerciseValue(block, block.kind)
                ? (() => {
                    const blankKind: BlankExerciseKind = block.kind;
                    const exercise = getBlankExerciseValue(block, blankKind);
                    if (!exercise) return null;
                    const blockTitle = getBlockTitle(blankKind);

                    return (
                      <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-6`}>
                        <FieldGroup className="gap-6">
                          <FillBlankQuestionEditor
                            value={exercise.question}
                            onCommit={(value) =>
                              void handleBlankExerciseChange(blankKind, block.id, { question: value })
                            }
                            title="Question"
                            description={`Write and format the ${blockTitle} question with Tiptap. Put the cursor where the student should answer, then click Add blank.`}
                            addButtonLabel="Add blank"
                            placeholder={`Write the ${blockTitle} question here. Put the cursor at each answer position and click Add blank.`}
                          />

                          <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                              <div className="space-y-1">
                                <h3 className="text-sm font-medium">Answer</h3>
                                <p className="text-sm text-muted-foreground">
                                  Each blank in the question automatically creates one answer field here.
                                </p>
                              </div>
                              <Badge variant="secondary">
                                {exercise.blanks.length} answer{exercise.blanks.length === 1 ? "" : "s"}
                              </Badge>
                            </div>

                            <div className="p-4">
                              {exercise.blanks.length === 0 ? (
                                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                                  No blanks yet. In the <strong>Question</strong> box, place the cursor where needed and click <strong>Add blank</strong>.
                                </div>
                              ) : (
                                <div className="rounded-2xl border bg-muted/10 p-4">
                                  <div className="flex flex-wrap gap-4">
                                    {exercise.blanks.map((blank, index) => (
                                      <div
                                        key={blank.id}
                                        className="min-w-[220px] flex-1 space-y-2 rounded-xl border bg-background p-3 md:max-w-[260px]"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <FieldLabel htmlFor={`${blankKind}-blank-${blank.id}`}>
                                            Blank #{index + 1}
                                          </FieldLabel>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() =>
                                              void handleDeleteBlankExercise(blankKind, block.id, blank.id)
                                            }
                                            aria-label={`Delete blank ${index + 1}`}
                                            title={`Delete blank ${index + 1} from question and answer`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        <BufferedInput
                                          id={`${blankKind}-blank-${blank.id}`}
                                          value={blank.answer}
                                          onCommit={(value) =>
                                            void handleBlankExerciseAnswerChange(
                                              blankKind,
                                              block.id,
                                              blank.id,
                                              value,
                                            )
                                          }
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
                                  value={exercise.details}
                                  onChange={(value) =>
                                    void handleBlankExerciseChange(blankKind, block.id, { details: value })
                                  }
                                  minHeight={140}
                                  placeholder={`Optional instructions or explanation for ${blockTitle}...`}
                                />
                              </div>
                            </FieldContent>
                          </Field>
                        </FieldGroup>
                      </CardContent>
                    );
                  })()
                : null}

              {block.kind === "suffix-and-prefix" && block.suffixAndPrefix ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-6`}>
                  <FieldGroup className="gap-6">
                    <SuffixPrefixQuestionEditor
                      value={block.suffixAndPrefix.question}
                      onCommit={(value) => void handleSuffixPrefixChange(block.id, { question: value })}
                    />

                    <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium">Answer</h3>
                          <p className="text-sm text-muted-foreground">
                            Each underlined base word in the question creates one matching completed-word answer field.
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {block.suffixAndPrefix.items.length} answer{block.suffixAndPrefix.items.length === 1 ? "" : "s"}
                        </Badge>
                      </div>

                      <div className="p-4">
                        {block.suffixAndPrefix.items.length === 0 ? (
                          <div className="space-y-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            <p>
                              No Suffix / Prefix words yet. Put the cursor in the <strong>Question</strong>, click <strong>Add Suffix / Prefix</strong>, then enter the root word.
                            </p>
                            {block.suffixAndPrefix.answer.trim() && !block.suffixAndPrefix.answer.trim().startsWith("{") ? (
                              <div className="rounded-lg bg-muted/40 p-3">
                                <div className="mb-1 font-medium text-foreground">Legacy answer preserved</div>
                                <div>{fillBlankQuestionToText(block.suffixAndPrefix.answer)}</div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-2xl border bg-muted/10 p-4">
                            <div className="flex flex-wrap gap-4">
                              {block.suffixAndPrefix.items.map((item, index) => (
                                <div key={item.id} className="min-w-[240px] flex-1 space-y-3 rounded-xl border bg-background p-3 md:max-w-[300px]">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <FieldLabel htmlFor={`suffix-prefix-${item.id}`}>Answer #{index + 1}</FieldLabel>
                                      <div className="mt-1 text-sm text-muted-foreground">
                                        Base word: <span className="font-medium text-foreground underline underline-offset-4">{item.word}</span>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => void handleDeleteSuffixPrefixItem(block.id, item.id)}
                                      aria-label={`Delete suffix/prefix word ${index + 1}`}
                                      title="Delete this word from both Question and Answer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <BufferedInput
                                    id={`suffix-prefix-${item.id}`}
                                    value={item.answer}
                                    onCommit={(value) => void handleSuffixPrefixAnswerChange(block.id, item.id, value)}
                                    placeholder={`Completed word for ${item.word}`}
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
                            value={block.suffixAndPrefix.details}
                            onChange={(value) => void handleSuffixPrefixChange(block.id, { details: value })}
                            minHeight={140}
                            placeholder="Optional instructions or explanation for students..."
                          />
                        </div>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </CardContent>
              ) : null}

              {block.kind === "tag-question" && block.tagQuestion ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-6`}>
                  <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                    <div className="border-b bg-muted/30 px-4 py-3">
                      <div className="text-sm font-semibold">Tag Question mode</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Choose separate Question + Answer items, or one paragraph with multiple inline blanks.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 p-4 sm:flex-row">
                      <Button
                        type="button"
                        variant={block.tagQuestion.mode === "items" ? "default" : "outline"}
                        className="justify-start sm:flex-1"
                        onClick={() => void handleTagQuestionChange(block.id, { mode: "items" })}
                      >
                        Per item
                      </Button>
                      <Button
                        type="button"
                        variant={block.tagQuestion.mode === "paragraph" ? "default" : "outline"}
                        className="justify-start sm:flex-1"
                        onClick={() => void handleTagQuestionChange(block.id, { mode: "paragraph" })}
                      >
                        Paragraph / passage
                      </Button>
                    </div>
                  </div>

                  {block.tagQuestion.mode === "items" ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold">Tag Question items</h3>
                          <p className="text-sm text-muted-foreground">
                            Add each sentence as one item. Put one ____ blank where the tag answer should appear.
                          </p>
                        </div>
                        <Button type="button" onClick={() => openTagQuestionModal(block.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Tag Question Item
                        </Button>
                      </div>

                      {block.tagQuestion.rows.length === 0 ? (
                        <Empty className="border">
                          <EmptyHeader>
                            <EmptyTitle>No Tag Question items yet</EmptyTitle>
                            <EmptyDescription>
                              Add the first sentence and its matching tag answer.
                            </EmptyDescription>
                          </EmptyHeader>
                          <EmptyContent>
                            <Button type="button" onClick={() => openTagQuestionModal(block.id)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add first item
                            </Button>
                          </EmptyContent>
                        </Empty>
                      ) : (
                        <div className="space-y-4">
                          {block.tagQuestion.rows.map((row, index) => (
                            <Card key={row.id} className="shadow-none">
                              <CardContent className="space-y-5 pt-6">
                                <div className="flex items-center justify-between gap-4">
                                  <Badge variant="secondary">Item #{index + 1}</Badge>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleDeleteTagQuestionRow(block.id, row.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </Button>
                                </div>

                                <FillBlankQuestionEditor
                                  value={row.question}
                                  onCommit={(value) =>
                                    void handleTagQuestionRowPatch(block.id, row.id, { question: value })
                                  }
                                  title={`Question #${index + 1}`}
                                  description="Write one sentence and insert one blank where the tag question answer belongs."
                                  addButtonLabel="Add blank"
                                  countLabel="blank"
                                  maxBlanks={1}
                                  placeholder="Example: You are a student, ____"
                                />

                                <Field>
                                  <FieldContent>
                                    <FieldLabel>Answer for item #{index + 1}</FieldLabel>
                                    <BufferedInput
                                      value={row.answer}
                                      onCommit={(value) =>
                                        void handleTagQuestionRowPatch(block.id, row.id, { answer: value })
                                      }
                                      placeholder="Example: aren't you?"
                                    />
                                  </FieldContent>
                                </Field>
                              </CardContent>
                            </Card>
                          ))}

                          <div className="flex justify-center border-t pt-5">
                            <Button type="button" variant="outline" onClick={() => openTagQuestionModal(block.id)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add another Tag Question item
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <FieldGroup className="gap-6">
                      <FillBlankQuestionEditor
                        value={block.tagQuestion.question}
                        onCommit={(value) =>
                          void handleTagQuestionChange(block.id, { question: value })
                        }
                        title="Paragraph / Passage"
                        description="Write the passage with Tiptap. Put the cursor after each sentence and click Add blank."
                        addButtonLabel="Add blank"
                        placeholder="Write the passage here. Example: He is honest, ____. They came early, ____."
                      />

                      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                          <div className="space-y-1">
                            <h3 className="text-sm font-medium">Answers</h3>
                            <p className="text-sm text-muted-foreground">
                              Every blank in the paragraph automatically creates one matching answer field.
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {block.tagQuestion.blanks.length} answer{block.tagQuestion.blanks.length === 1 ? "" : "s"}
                          </Badge>
                        </div>

                        <div className="p-4">
                          {block.tagQuestion.blanks.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                              No blanks yet. Put the cursor in the paragraph and click <strong>Add blank</strong>.
                            </div>
                          ) : (
                            <div className="rounded-2xl border bg-muted/10 p-4">
                              <div className="flex flex-wrap gap-4">
                                {block.tagQuestion.blanks.map((blank, index) => (
                                  <div
                                    key={blank.id}
                                    className="min-w-[220px] flex-1 space-y-2 rounded-xl border bg-background p-3 md:max-w-[280px]"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <FieldLabel htmlFor={`tag-question-blank-${blank.id}`}>
                                        Blank #{index + 1}
                                      </FieldLabel>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() =>
                                          void handleDeleteTagQuestionParagraphBlank(block.id, blank.id)
                                        }
                                        aria-label={`Delete blank ${index + 1}`}
                                        title={`Delete blank ${index + 1} from paragraph and answers`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <BufferedInput
                                      id={`tag-question-blank-${blank.id}`}
                                      value={blank.answer}
                                      onCommit={(value) =>
                                        void handleTagQuestionParagraphAnswerChange(block.id, blank.id, value)
                                      }
                                      placeholder={`Tag answer for blank ${index + 1}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </FieldGroup>
                  )}

                  <Field>
                    <FieldContent>
                      <FieldLabel>Details / Instruction</FieldLabel>
                      <div className="rounded-xl border bg-background p-3">
                        <TiptapRichTextEditor
                          value={block.tagQuestion.details}
                          onChange={(value) =>
                            void handleTagQuestionChange(block.id, { details: value })
                          }
                          minHeight={140}
                          placeholder="Optional instructions or explanation for Tag Question..."
                        />
                      </div>
                    </FieldContent>
                  </Field>
                </CardContent>
              ) : null}

              {block.kind === "changing-sentence" && block.changingSentence ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-5`}>
                  <Field>
                    <FieldContent>
                      <FieldLabel>Instruction / Details</FieldLabel>
                      <div className="rounded-xl border bg-background p-3">
                        <TiptapRichTextEditor
                          value={block.changingSentence.details}
                          onChange={(value) => void handleChangingSentenceChange(block.id, { details: value })}
                          minHeight={120}
                          placeholder="Add instructions for the Changing Sentence exercise..."
                        />
                      </div>
                    </FieldContent>
                  </Field>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">Changing Sentence Items</h3>
                      <p className="text-sm text-muted-foreground">
                        Add every sentence transformation as its own Question + Answer item.
                      </p>
                    </div>
                    <Button type="button" onClick={() => openChangingSentenceModal(block.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Changing Sentence Item
                    </Button>
                  </div>

                  {block.changingSentence.rows.length === 0 ? (
                    <Empty className="border">
                      <EmptyHeader>
                        <EmptyTitle>No changing-sentence items yet</EmptyTitle>
                        <EmptyDescription>
                          Add the first question and its transformed answer.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button type="button" onClick={() => openChangingSentenceModal(block.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add first item
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <div className="space-y-4">
                      {block.changingSentence.rows.map((row, index) => (
                        <Card key={row.id} className="shadow-none">
                          <CardContent className="space-y-5 pt-6">
                            <div className="flex items-center justify-between gap-4">
                              <Badge variant="secondary">Question #{index + 1}</Badge>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleDeleteChangingSentenceRow(block.id, row.id)}
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
                                      void handleChangingSentenceRowPatch(block.id, row.id, { question: value })
                                    }
                                    minHeight={150}
                                    placeholder={`Write changing sentence question ${index + 1} here...`}
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
                                        void handleChangingSentenceRowPatch(block.id, row.id, { answer: value })
                                      }
                                      minHeight={150}
                                      placeholder={`Write the transformed answer for question ${index + 1} here...`}
                                    />
                                  </div>
                                </FieldContent>
                              </Field>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      <div className="flex justify-center border-t pt-5">
                        <Button type="button" variant="outline" onClick={() => openChangingSentenceModal(block.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add another Changing Sentence item
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              ) : null}

              {block.kind !== "substitution-table" && block.kind !== "changing-sentence" && block.kind !== "tag-question" && block.kind !== "suffix-and-prefix" && !isBlankExerciseKind(block.kind) && THREE_FIELD_BLOCK_META[block.kind] && THREE_FIELD_BLOCK_META[block.kind]!.getValue(block) ? (
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
        open={isChangingSentenceModalOpen}
        onOpenChange={(open) => {
          setIsChangingSentenceModalOpen(open);
          if (!open) {
            setActiveChangingSentenceBlockId(null);
            resetChangingSentenceModal();
          }
        }}
        title="Add Changing Sentence Item"
        description="Enter one sentence/question and its transformed answer, then save it as one item."
        className="w-[calc(100vw-1.5rem)] sm:max-w-4xl"
        footer={
          <div className="flex w-full min-w-0 flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsChangingSentenceModalOpen(false);
                setActiveChangingSentenceBlockId(null);
                resetChangingSentenceModal();
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleCreateChangingSentenceRow(false)}>
              Save item
            </Button>
            <Button type="button" onClick={() => void handleCreateChangingSentenceRow(true)}>
              Save and add another
            </Button>
          </div>
        }
      >
        <FieldGroup className="min-w-0 gap-5">
          <Field>
            <FieldContent className="min-w-0">
              <FieldLabel>Question</FieldLabel>
              <div className="min-w-0 overflow-hidden rounded-xl border bg-background p-3">
                <TiptapRichTextEditor
                  value={newChangingSentenceDraft.question}
                  onChange={(value) =>
                    setNewChangingSentenceDraft((current) => ({ ...current, question: value }))
                  }
                  minHeight={180}
                  placeholder="Write the original sentence or transformation instruction here..."
                />
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldContent className="min-w-0">
              <FieldLabel>Answer</FieldLabel>
              <div className="min-w-0 overflow-hidden rounded-xl border bg-background p-3">
                <TiptapRichTextEditor
                  value={newChangingSentenceDraft.answer}
                  onChange={(value) =>
                    setNewChangingSentenceDraft((current) => ({ ...current, answer: value }))
                  }
                  minHeight={180}
                  placeholder="Write the correctly changed sentence here..."
                />
              </div>
            </FieldContent>
          </Field>
        </FieldGroup>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={isTagQuestionModalOpen}
        onOpenChange={(open) => {
          setIsTagQuestionModalOpen(open);
          if (!open) {
            setActiveTagQuestionBlockId(null);
            resetTagQuestionModal();
          }
        }}
        title="Add Tag Question Item"
        description="Enter one sentence, insert one ____ blank for the tag, then enter the matching answer."
        className="w-[calc(100vw-1.5rem)] sm:max-w-4xl"
        footer={
          <div className="flex w-full min-w-0 flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsTagQuestionModalOpen(false);
                setActiveTagQuestionBlockId(null);
                resetTagQuestionModal();
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleCreateTagQuestionRow(false)}>
              Save item
            </Button>
            <Button type="button" onClick={() => void handleCreateTagQuestionRow(true)}>
              Save and add another
            </Button>
          </div>
        }
      >
        <FieldGroup className="min-w-0 gap-5">
          <FillBlankQuestionEditor
            value={newTagQuestionDraft.question}
            onCommit={(value) =>
              setNewTagQuestionDraft((current) => ({ ...current, question: value }))
            }
            title="Question"
            description="Write one sentence and add one blank where the tag question should go."
            addButtonLabel="Add blank"
            countLabel="blank"
            maxBlanks={1}
            placeholder="Example: She is a teacher, ____"
          />

          <Field>
            <FieldContent className="min-w-0">
              <FieldLabel>Answer</FieldLabel>
              <Input
                value={newTagQuestionDraft.answer}
                onChange={(event) =>
                  setNewTagQuestionDraft((current) => ({ ...current, answer: event.target.value }))
                }
                placeholder="Example: isn't she?"
              />
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
