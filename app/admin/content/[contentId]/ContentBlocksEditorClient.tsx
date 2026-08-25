"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

const BLOCK_CONTENT_CLASS = "max-h-[70vh] overflow-y-auto pr-2";

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
  { kind: "sentence-ordering", title: "Rearrange Sentence", description: "Add rearrange sentence content.", icon: <ListOrdered className="h-4 w-4" /> },
  { kind: "information-transfer", title: "Information Transfer", description: "Add question, answer, and details.", icon: <FileOutput className="h-4 w-4" /> },
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
  "gap-fill-first-paper": {
    title: "Fill in the Blanks",
    questionPlaceholder: "Write the fill in the blanks question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.gapFillFirstPaper,
    updateAction: updateGapFillFirstPaper,
    patchBlock: (block, next) => ({
      ...block,
      gapFillFirstPaper: block.gapFillFirstPaper ? { ...block.gapFillFirstPaper, ...next } : null,
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
  "information-transfer": {
    title: "Information Transfer",
    questionPlaceholder: "Write the full information transfer question here...",
    answerPlaceholder: "Write the answer here...",
    detailsPlaceholder: "Add details here...",
    getValue: (block) => block.informationTransfer,
    updateAction: updateInformationTransfer,
    patchBlock: (block, next) => ({
      ...block,
      informationTransfer: block.informationTransfer ? { ...block.informationTransfer, ...next } : null,
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

    startTransition(async () => {
      await updateParagraphBlock({
        contentId: content.id,
        blockId,
        paragraphId,
        body,
      });
    });
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
    },
  ) {
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock?.questionAnswerExercise) return;

    const next = {
      ...currentBlock.questionAnswerExercise,
      ...patch,
    };

    patchBlock(blockId, (block) => ({
      ...block,
      questionAnswerExercise: block.questionAnswerExercise ? next : null,
    }));

    startTransition(async () => {
      await updateQuestionAnswerExercise({
        contentId: content.id,
        blockId,
        questionAnswerExerciseId,
        title: next.title,
        instruction: next.instruction,
        question: next.question,
        answer: next.answer,
        details: next.details,
        documentJson: next.documentJson,
      });
    });
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

    startTransition(async () => {
      await updateVocabularyEntry({
        contentId: content.id,
        blockId,
        vocabularyEntryId,
        word: nextEntry.word,
        meaning: nextEntry.meaning,
      });
    });
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

    startTransition(async () => {
      await updateSynonymsAntonymsEntry({
        contentId: content.id,
        blockId,
        synonymsAntonymsEntryId: entryId,
        word: nextEntry.word,
        meanings: nextEntry.meanings,
        synonyms: nextEntry.synonyms,
        antonyms: nextEntry.antonyms,
        details: nextEntry.details,
      });
    });
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

    startTransition(async () => {
      await updateMcqSection({
        contentId: content.id,
        blockId,
        mcqSectionId: currentBlock.mcqSection!.id,
        title: persisted.title,
        description: persisted.description,
        documentJson: persisted.documentJson,
      });
    });
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

    startTransition(async () => {
      await updateTrueFalseExercise({
        contentId: content.id,
        blockId,
        trueFalseExerciseId: currentBlock.trueFalseExercise!.id,
        title: persisted.title,
        instruction: persisted.instruction,
        passage: persisted.passage,
        documentJson: persisted.documentJson,
      });
    });
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

  async function handleInformationTransferChange(
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

    startTransition(async () => {
      await config.updateAction({
        contentId: content.id,
        blockId,
        recordId,
        question: next.question,
        answer: next.answer,
        details: next.details,
      });
    });
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
                                <Input
                                  value={entry.word}
                                  onChange={(event) =>
                                    void handleVocabularyEntryChange(block.id, entry.id, { word: event.target.value })
                                  }
                                  placeholder="Write the vocabulary word..."
                                />
                              </FieldContent>
                            </Field>

                            <Field>
                              <FieldContent>
                                <FieldLabel>Meaning</FieldLabel>
                                <Input
                                  value={entry.meaning}
                                  onChange={(event) =>
                                    void handleVocabularyEntryChange(block.id, entry.id, { meaning: event.target.value })
                                  }
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
                                  <Input
                                    value={entry.word}
                                    onChange={(event) =>
                                      void handleSynonymsAntonymsEntryChange(block.id, entry.id, { word: event.target.value })
                                    }
                                    placeholder="Target word"
                                  />
                                </FieldContent>
                              </Field>

                              <Field>
                                <FieldContent>
                                  <FieldLabel>Meanings</FieldLabel>
                                  <Textarea
                                    value={entry.meanings}
                                    onChange={(event) =>
                                      void handleSynonymsAntonymsEntryChange(block.id, entry.id, {
                                        meanings: event.target.value,
                                      })
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
                        <Input
                          value={block.mcqSection.title}
                          onChange={(event) => void handleMcqSectionChange(block.id, { title: event.target.value })}
                          placeholder="Multiple choice questions"
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Section description</FieldLabel>
                        <Textarea
                          value={block.mcqSection.description}
                          onChange={(event) => void handleMcqSectionChange(block.id, { description: event.target.value })}
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
                              <Textarea
                                value={question.prompt}
                                onChange={(event) => void handleMcqQuestionPatch(block.id, question.id, { prompt: event.target.value })}
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

                                  <Input
                                    value={option.text}
                                    onChange={(event) =>
                                      void handleMcqOptionPatch(block.id, question.id, option.id, { text: event.target.value })
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
                        <Input
                          value={block.trueFalseExercise.title}
                          onChange={(event) => void handleTrueFalseExerciseChange(block.id, { title: event.target.value })}
                          placeholder="True / False"
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Instruction</FieldLabel>
                        <Textarea
                          value={block.trueFalseExercise.instruction}
                          onChange={(event) => void handleTrueFalseExerciseChange(block.id, { instruction: event.target.value })}
                          placeholder="Write the instructions for this exercise..."
                          rows={3}
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>Passage</FieldLabel>
                        <Textarea
                          value={block.trueFalseExercise.passage}
                          onChange={(event) => void handleTrueFalseExerciseChange(block.id, { passage: event.target.value })}
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
                              <Textarea
                                value={row.statement}
                                onChange={(event) => void handleTrueFalseRowPatch(block.id, row.id, { statement: event.target.value })}
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
                                <Textarea
                                  value={row.correction}
                                  onChange={(event) => void handleTrueFalseRowPatch(block.id, row.id, { correction: event.target.value })}
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

              {(block.kind === "question-answer" ||
                block.kind === "table-completion" ||
                block.kind === "column-matching" ||
                block.kind === "sentence-ordering") &&
              block.questionAnswerExercise ? (
                <CardContent className={`${BLOCK_CONTENT_CLASS} space-y-5`}>
                  {block.kind === "sentence-ordering" ? (
                    <Field>
                      <FieldContent>
                        <FieldLabel>Exercise Title</FieldLabel>
                        <Input
                          value={block.questionAnswerExercise.title}
                          onChange={(event) =>
                            void handleQuestionAnswerChange(block.id, block.questionAnswerExercise!.id, {
                              title: event.target.value,
                            })
                          }
                          placeholder="Rearrange sentence"
                        />
                      </FieldContent>
                    </Field>
                  ) : null}

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
                              void handleInformationTransferChange(
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
                              void handleInformationTransferChange(
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
                              void handleInformationTransferChange(
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
              <Textarea
                value={newTrueFalseDraft.statement}
                onChange={(event) => setNewTrueFalseDraft((current) => ({ ...current, statement: event.target.value }))}
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
                <Textarea
                  value={newTrueFalseDraft.correction}
                  onChange={(event) => setNewTrueFalseDraft((current) => ({ ...current, correction: event.target.value }))}
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
              <Textarea
                value={newMcqDraft.prompt}
                onChange={(event) => setNewMcqDraft((current) => ({ ...current, prompt: event.target.value }))}
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
                  <Input
                    value={option.text}
                    onChange={(event) => setMcqDraftOption(index, { text: event.target.value })}
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
              <Input
                value={newVocabularyWord}
                onChange={(event) => setNewVocabularyWord(event.target.value)}
                placeholder="Write the vocabulary word..."
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldContent>
              <FieldLabel>Meaning</FieldLabel>
              <Input
                value={newVocabularyMeaning}
                onChange={(event) => setNewVocabularyMeaning(event.target.value)}
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
