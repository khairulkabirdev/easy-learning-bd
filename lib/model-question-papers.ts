import "server-only";

import { createHash } from "node:crypto";

import type { ContentBlockKind } from "@/app/admin/content/content-types";
import { getModelQuestionEditorContent } from "@/app/user/lessons/data";
import { getFixedModelQuestionBlockTitle, getFixedModelQuestionLayout, getFixedModelQuestionSlots } from "@/lib/model-question-fixed-blocks";
import { modelQuestionBlockOptions } from "@/lib/model-question-block-types";
import type { ModelPaper, ModelPaperEntry } from "@/lib/model-paper-types";
import { prisma } from "@/lib/db";
import { readModelRearrangeKey } from "@/lib/model-rearrange-answers";
import { suggestedClass67Mark } from "@/lib/model-question-marks";

export type PaperScope = { organizationId: string; classId: string; subjectId: string };
const titles: Partial<Record<ContentBlockKind, string>> = {
  paragraph: "Read the passage", "seen-passage-one": "Seen Passage 1", "seen-passage-two": "Seen Passage 2",
  mcq: "Multiple-choice questions", "true-false": "True / False", "writing-summary": "Summary Writing",
  "gap-fill": "Fill in the Gaps", "gap-fill-second-paper": "Gap Filling with Clues",
  "question-answer": "Answering Questions", "column-matching": "Matching Sentences",
  "right-form-of-verb": "Right Form of Verbs", "changing-sentence": "Changing Sentences",
  "tag-question": "Tag Questions", "suffix-and-prefix": "Suffixes and Prefixes",
  "synonyms-antonyms": "Synonyms / Antonyms",
  "punctuation-and-capitalization": "Punctuation and Capitalization",
};
const passageKinds = new Set(["paragraph", "seen-passage-one", "seen-passage-two"]);
const hasText = (v?: string | null) => Boolean(v?.replace(/<[^>]+>|&(?:nbsp|#160);|\u00a0/gi, "").trim());
type NativeBlock = NonNullable<ModelPaperEntry["native"]>;

function hasBlankExercise(exercise?: { question: string; blanks: unknown[] } | null) {
  return Boolean(exercise?.blanks.length && hasText(exercise.question));
}

function hasNativeQuestion(b: NativeBlock) {
  switch (b.kind) {
    case "paragraph": return hasText(b.paragraph?.body);
    case "seen-passage-one": return hasText(b.seenPassageOne?.body);
    case "seen-passage-two": return hasText(b.seenPassageTwo?.body);
    case "mcq": return Boolean(b.mcqSection?.questions.some(q => hasText(q.prompt) && q.options.filter(o => hasText(o.text)).length >= 2));
    case "true-false": return Boolean(b.trueFalseExercise?.rows.some(row => hasText(row.statement)));
    case "synonyms-antonyms": return Boolean(b.synonymsAntonyms?.entries.some(row => hasText(row.word) && (
      row.answerType === "synonym" ? row.synonyms.trim() :
      row.answerType === "antonym" ? row.antonyms.trim() :
      row.synonyms.trim() || row.antonyms.trim()
    )));
    case "table-completion":
    case "column-matching":
    case "rearrange-sentence":
    case "question-answer":
    case "question-from-poems":
    case "question-from-story":
    case "writing-summary": {
      const exercise = b.questionAnswerExercise;
      return Boolean(exercise && (hasText(exercise.question) || exercise.rows.some(row => hasText(row.question)) ||
        (exercise.table?.rows.length && (exercise.table.answers.length || exercise.table.rows.some(row => row.cells.some(cell => cell.mode === "answer"))))));
    }
    case "gap-fill": return hasText(b.gapFill?.question);
    case "gap-fill-first-paper": return hasBlankExercise(b.gapFillFirstPaper);
    case "gap-fill-second-paper": return hasBlankExercise(b.gapFillSecondPaper);
    case "information-transfer": return hasBlankExercise(b.informationTransfer);
    case "right-form-of-verb": return hasBlankExercise(b.rightFormOfVerb);
    case "substitution-table": return Boolean(b.substitutionTable?.table.answers.length || hasText(b.substitutionTable?.question));
    case "narration": return hasText(b.narration?.question);
    case "changing-sentence": return Boolean(b.changingSentence?.rows.some(row => hasText(row.question)));
    case "punctuation-and-capitalization": return hasText(b.punctuationAndCapitalization?.question);
    case "preposition": return hasBlankExercise(b.preposition);
    case "parts-of-speech": return hasText(b.partsOfSpeech?.question);
    case "suffix-and-prefix": return hasText(b.suffixAndPrefix?.question);
    case "tag-question": return b.tagQuestion?.mode === "paragraph" ? hasBlankExercise(b.tagQuestion) : Boolean(b.tagQuestion?.rows.some(row => hasText(row.question)));
    case "connector": return hasBlankExercise(b.connector);
    default: return false;
  }
}

export function studentPaperScope(scope: PaperScope) {
  return {
    ...scope, publishedAt: { not: null },
    class: { status: "published" as const, organizationId: scope.organizationId },
    subject: { status: "published" as const, classId: scope.classId, organizationId: scope.organizationId },
  };
}

function optionsFromJson(value: string): string[] {
  try {
    const options: unknown = JSON.parse(value);
    return Array.isArray(options) ? options.filter((option): option is string => typeof option === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

// Model-question papers live outside ordinary published lessons. A set must be
// authorized for the appropriate class and organization before its editor is loaded.
export async function getModelPaper(scope: PaperScope, setId: string, audience: "student" | "admin"): Promise<ModelPaper | null> {
  const set = await prisma.modelQuestionSet.findFirst({
    where: { ...(audience === "student" ? studentPaperScope(scope) : scope), id: setId },
    select: {
      id: true, name: true, editorContentId: true, durationMinutes: true,
      class: { select: { name: true } },
      subject: { select: { name: true, slug: true, code: true } },
      board: { select: { name: true } }, academicYear: { select: { year: true } },
      blocks: {
        where: { organizationId: scope.organizationId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true, kind: true, title: true, question: true, answer: true, instructions: true, passage: true, optionsJson: true, marks: true },
      },
    },
  });
  if (!set) return null;
  const nativeContent = set.editorContentId ? await getModelQuestionEditorContent({ ...scope, id: set.editorContentId, setId }) : null;
  const validBlocks = (nativeContent?.blocks ?? []).filter(hasNativeQuestion);
  const layout = getFixedModelQuestionLayout(set.class.name, set.subject);
  const entries: ModelPaperEntry[] = [];
  let nextNumber = 1;
  const addNative = (block: NativeBlock, number?: number) => {
    // Fixed seen passages may themselves occupy a numbered slot.
    const reference = passageKinds.has(block.kind);
    const index = number ?? (reference ? null : nextNumber);
    if (index !== null) nextNumber = Math.max(nextNumber, index + 1);
    const suggested = suggestedClass67Mark(layout, set.class.name, block.kind);
    entries.push({
      id: block.id, title: block.title?.trim() || (layout && getFixedModelQuestionBlockTitle(layout, block.kind)) || titles[block.kind] ||
        block.kind.replace(/(^|-)([a-z])/g, (_, prefix: string, c: string) => (prefix ? " " : "") + c.toUpperCase()),
      shortDescription: block.shortDescription?.trim() || "",
      number: index === null ? null : String(index), reference,
      marks: reference ? null : (block.marks ?? suggested?.marks ?? null),
      markPattern: block.marks === null || block.marks === undefined ? suggested?.formula : undefined,
      native: block,
    });
  };
  if (layout) {
    for (const slot of getFixedModelQuestionSlots(layout)) {
      const block = validBlocks.find(candidate => candidate.kind === slot.kind);
      if (block && (!slot.parent || validBlocks.some(candidate => candidate.kind === slot.parent))) addNative(block, slot.number);
    }
  } else {
    validBlocks.forEach(block => addNative(block));
  }
  const legacyTitles = modelQuestionBlockOptions(set.subject);
  for (const block of set.blocks) {
    if (!hasText(block.question)) continue;
    const options = optionsFromJson(block.optionsJson);
    const key = block.answer.trim();
    const index = /^[A-F]$/i.test(key) ? key.toUpperCase().charCodeAt(0) - 65 :
      options.findIndex(o => o.trim().toLowerCase() === key.toLowerCase());
    const mcq = block.kind === "mcq" && options.length >= 2 ? {
      id: block.id, prompt: block.question, sortOrder: 0, answerMode: "single" as const,
      options: options.map((option, i) => ({ id: `${block.id}-${i}`, text: option, label: String.fromCharCode(65 + i), sortOrder: i, isCorrect: Boolean(key) && i === index })),
    } : null;
    entries.push({
      id: `imported-${block.id}`, title: block.title || legacyTitles.find(item => item.value === block.kind)?.label || "Written Question",
      number: String(nextNumber++), marks: block.marks > 0 ? block.marks : null,
      imported: { question: block.question, answer: block.answer, instructions: block.instructions, passage: block.passage, mcq },
    });
  }
  if (!entries.some(entry => !entry.reference)) return null;
  return {
    id: set.id, name: set.name, subjectId: scope.subjectId, subject: set.subject.name, className: set.class.name,
    board: set.board?.name ?? null, year: set.academicYear?.year ?? null, durationMinutes: set.durationMinutes, entries,
  };
}

export function modelPaperPromptOnly(paper: ModelPaper): ModelPaper {
  // Normalized records preserve the control shapes. Do not serialize raw
  // document JSON, keys, or teacher explanation fields before submission.
  function redact(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(redact);
    if (value === null || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => {
      if (key === "answer" || key === "sentence" || key === "correction" || key === "details" || key === "meanings" || key === "synonyms" || key === "antonyms") return [key, ""];
      if (key === "documentJson") return [key, "{}"];
      if (key === "isCorrect" || key === "expectedAnswer") return [key, false];
      if (key === "selections") return [key, []];
      return [key, redact(child)];
    }));
  }
  return {
    ...paper,
    entries: paper.entries.map(entry => {
      const copy = redact(entry) as ModelPaperEntry;
      const b = copy.native;
      if (b?.kind === "rearrange-sentence" && b.questionAnswerExercise) {
        const sourceRows = entry.native?.questionAnswerExercise?.rows ?? [];
        // With a separately saved answer key, question rows are already in the
        // mixed-up order shown in the book and are safe to show as written.
        // Older records used row order as the answer; continue hiding that order.
        if (readModelRearrangeKey(sourceRows).mode !== "explicit") {
          b.questionAnswerExercise.rows.sort((a, c) => a.id.localeCompare(c.id));
        }
        b.questionAnswerExercise.rows.forEach((row, i) => { row.sortOrder = i; });
      }
      return copy;
    }),
  };
}

// Compare the displayed paper version without deriving identifiers from hidden answers.
export function modelPaperEntryKey(paper: ModelPaper) {
  return createHash("sha256").update(JSON.stringify(modelPaperPromptOnly(paper))).digest("hex");
}
