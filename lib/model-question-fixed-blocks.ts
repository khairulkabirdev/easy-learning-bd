import { isEnglishFirstPaperSubject, isEnglishSecondPaperSubject } from "@/app/admin/content/navigation-helpers";
import type { ContentBlockKind } from "@/app/admin/content/content-types";

type PassageKind = "seen-passage-one" | "seen-passage-two" | "paragraph";
type FixedQuestionSlot = {
  kind: ContentBlockKind;
  number?: number;
  parent?: PassageKind;
};
type FixedQuestionGroup = {
  title: string;
  description: string;
  slots: readonly FixedQuestionSlot[];
};

export type FixedModelQuestionLayout = "class-6-7" | "class-9-10" | "class-6-7-second-paper" | "class-8-second-paper" | "class-9-10-second-paper";

export function isFixedSecondPaperLayout(
  layout: FixedModelQuestionLayout | null,
): layout is "class-8-second-paper" | "class-6-7-second-paper" | "class-9-10-second-paper" {
  return layout === "class-8-second-paper" || layout === "class-6-7-second-paper" || layout === "class-9-10-second-paper";
}

const SEEN_PASSAGE_ONE_SLOTS = [
  { kind: "seen-passage-one", number: 1 },
  { kind: "mcq", number: 2, parent: "seen-passage-one" },
  { kind: "question-answer", number: 3, parent: "seen-passage-one" },
] as const satisfies readonly FixedQuestionSlot[];

const FIXED_GROUPS: Record<FixedModelQuestionLayout, readonly FixedQuestionGroup[]> = {
  "class-9-10-second-paper": [
    {
      title: "Grammar",
      description: "Nine question sections in paper order. Each section can be added once.",
      slots: [
        { kind: "gap-fill-second-paper", number: 1 },
        { kind: "substitution-table", number: 2 },
        { kind: "right-form-of-verb", number: 3 },
        { kind: "changing-sentence", number: 4 },
        { kind: "tag-question", number: 5 },
        { kind: "suffix-and-prefix", number: 6 },
        { kind: "preposition", number: 7 },
        { kind: "connector", number: 8 },
        { kind: "punctuation-and-capitalization", number: 9 },
      ],
    },
  ],
  "class-8-second-paper": [
    {
      title: "Grammar",
      description: "Six question sections in paper order. Each section can be added once.",
      slots: [
        { kind: "gap-fill-second-paper", number: 1 },
        { kind: "substitution-table", number: 2 },
        { kind: "right-form-of-verb", number: 3 },
        { kind: "narration", number: 4 },
        { kind: "changing-sentence", number: 5 },
        { kind: "punctuation-and-capitalization", number: 6 },
      ],
    },
  ],
  "class-6-7-second-paper": [
    {
      title: "Grammar",
      description: "Six question sections in paper order. Each section can be added once.",
      slots: [
        { kind: "parts-of-speech", number: 1 },
        { kind: "gap-fill-second-paper", number: 2 },
        { kind: "substitution-table", number: 3 },
        { kind: "right-form-of-verb", number: 4 },
        { kind: "changing-sentence", number: 5 },
        { kind: "punctuation-and-capitalization", number: 6 },
      ],
    },
  ],
  "class-6-7": [
    {
      title: "Seen — Passage 1",
      description: "Passage 1, MCQ, and Answering Questions.",
      slots: SEEN_PASSAGE_ONE_SLOTS,
    },
    {
      title: "Seen — Passage 2",
      description: "Passage 2, Fill in the Gaps, and Synonyms / Antonyms.",
      slots: [
        { kind: "seen-passage-two", number: 4 },
        { kind: "gap-fill-first-paper", number: 5, parent: "seen-passage-two" },
        { kind: "synonyms-antonyms", number: 6, parent: "seen-passage-two" },
      ],
    },
    {
      title: "Unseen",
      description: "First add Unseen Passage, then its Information Transfer, True / False, and Summary questions.",
      slots: [
        { kind: "paragraph" },
        { kind: "information-transfer", number: 7, parent: "paragraph" },
        { kind: "true-false", number: 8, parent: "paragraph" },
        { kind: "writing-summary", number: 9, parent: "paragraph" },
      ],
    },
    {
      title: "Other Reading Questions",
      description: "Table Completion, Rearrange Sentence, and Question from Poems.",
      slots: [
        { kind: "table-completion", number: 10 },
        { kind: "rearrange-sentence", number: 11 },
        { kind: "question-from-poems", number: 12 },
      ],
    },
  ],
  "class-9-10": [
    {
      title: "Seen",
      description: "First add Passage 1, then its MCQ, Answering Questions, and Fill in the Gaps.",
      slots: [
        ...SEEN_PASSAGE_ONE_SLOTS,
        { kind: "gap-fill-first-paper", number: 4, parent: "seen-passage-one" },
      ],
    },
    {
      title: "Unseen",
      description: "First add Unseen Passage, then its Information Transfer and Summary questions.",
      slots: [
        { kind: "paragraph" },
        { kind: "information-transfer", number: 5, parent: "paragraph" },
        { kind: "writing-summary", number: 6, parent: "paragraph" },
      ],
    },
    {
      title: "Other Reading Questions",
      description: "These blocks do not require a passage.",
      slots: [
        { kind: "table-completion", number: 7 },
        { kind: "rearrange-sentence", number: 8 },
        { kind: "question-from-poems", number: 9 },
        { kind: "question-from-story", number: 10 },
      ],
    },
  ],
};

export const FIXED_BLOCK_LABELS: Partial<Record<ContentBlockKind, string>> = {
  paragraph: "Unseen Passage",
  "seen-passage-one": "Passage 1",
  "seen-passage-two": "Passage 2",
  "question-answer": "Answering Questions",
  "gap-fill-first-paper": "Fill in the Gaps",
  "writing-summary": "Summary",
};

export function getFixedModelQuestionTitle(layout: FixedModelQuestionLayout) {
  if (layout === "class-9-10-second-paper") return "Class 9–10 English 2nd Paper";
  if (layout === "class-8-second-paper") return "Class 8 English 2nd Paper";
  if (layout === "class-6-7-second-paper") return "Class 6–7 English 2nd Paper";
  return layout === "class-9-10" ? "Class 9–10 English 1st Paper" : "Class 6–7 English 1st Paper";
}

export function getFixedModelQuestionBlockTitle(layout: FixedModelQuestionLayout, kind: ContentBlockKind) {
  if (isFixedSecondPaperLayout(layout)) {
    if (kind === "gap-fill-second-paper") return "Gap Filling with Clues";
    if (kind === "right-form-of-verb") return "Right Form of Verbs";
    if (kind === "changing-sentence") return "Changing Sentences";
    if (layout === "class-9-10-second-paper") {
      if (kind === "tag-question") return "Tag Questions";
      if (kind === "suffix-and-prefix") return "Suffixes and Prefixes";
      if (kind === "preposition") return "Prepositions";
      if (kind === "connector") return "Sentence Connectors";
    }
  }
  if (layout === "class-9-10" && kind === "seen-passage-one") return "Seen Passage";
  return FIXED_BLOCK_LABELS[kind];
}

export function getFixedModelQuestionLayout(
  className: string,
  subject: Parameters<typeof isEnglishFirstPaperSubject>[0],
): FixedModelQuestionLayout | null {
  const label = className.trim().toLowerCase();
  const isClassSixOrSeven =
    /^(?:6|7|৬|৭)(?:th)?$/.test(label) ||
    /\b(?:class|grade|standard|std\.?)\s*[-:]?\s*(?:6|7)(?:th)?\b/.test(label) ||
    /(?:ক্লাস|শ্রেণি|শ্রেণী)\s*(?:[৬৭](?![০-৯])|ষষ্ঠ|সপ্তম)|(?:৬ষ্ঠ|৭ম|ষষ্ঠ|সপ্তম)\s*(?:শ্রেণি|শ্রেণী|ক্লাস)/.test(label) ||
    /^(?:six|seven|sixth|seventh)$|\b(?:class|grade)\s+(?:six|seven|sixth|seventh)\b/.test(label);


  const isClassEight =
    /^(?:0?8(?:th)?|eighth?|viii|৮ম?|অষ্টম)$/.test(label) ||
    /\b(?:class|grade|standard|std\.?)\s*[-:]?\s*(?:0?8(?:th)?|eighth?|viii)\b/.test(label) ||
    /(?:ক্লাস|শ্রেণি|শ্রেণী)\s*(?:৮ম?(?![0-9০-৯])|অষ্টম)|(?:৮ম|অষ্টম)\s*(?:শ্রেণি|শ্রেণী|ক্লাস)/.test(label);
  const isClassNineOrTen =
    /^(?:(?:0?9|10)(?:th)?|ix|x|ninth|tenth|৯|১০|৯ম|১০ম|নবম|দশম)$/.test(label) ||
    /\b(?:class|grade|standard|std\.?)\s*[-:]?\s*(?:(?:0?9|10)(?:th)?|ninth|tenth|ix|x)\b/.test(label) ||
    /(?:ক্লাস|শ্রেণি|শ্রেণী)\s*(?:৯|১০)(?![০-৯])|(?:নবম|দশম|৯ম|১০ম)/.test(label);

  if (isEnglishSecondPaperSubject(subject)) {
    if (isClassNineOrTen) return "class-9-10-second-paper";
    if (isClassEight) return "class-8-second-paper";
    return isClassSixOrSeven ? "class-6-7-second-paper" : null;
  }
  if (!isEnglishFirstPaperSubject(subject)) return null;
  if (isClassSixOrSeven) return "class-6-7";
  if (isClassNineOrTen) return "class-9-10";

  return null;
}

export function getFixedModelQuestionGroups(layout: FixedModelQuestionLayout) {
  return FIXED_GROUPS[layout];
}

export function getFixedModelQuestionSlots(layout: FixedModelQuestionLayout) {
  return getFixedModelQuestionGroups(layout).flatMap((group) => group.slots);
}

export function getFixedPassageParentKind(layout: FixedModelQuestionLayout, kind: string): PassageKind | null {
  return getFixedModelQuestionSlots(layout).find((slot) => slot.kind === kind)?.parent ?? null;
}

/** The first saved block occupies the numbered slot. Keep additional saved copies editable. */
export function getDuplicateFixedBlockIds(
  slots: readonly FixedQuestionSlot[],
  orderedBlocks: readonly { id: string; kind: ContentBlockKind }[],
) {
  const fixedKinds = new Set(slots.map(({ kind }) => kind));
  const seen = new Set<ContentBlockKind>();
  const duplicateIds = new Set<string>();
  for (const { id, kind } of orderedBlocks) {
    if (!fixedKinds.has(kind)) continue;
    if (seen.has(kind)) duplicateIds.add(id);
    else seen.add(kind);
  }
  return duplicateIds;
}


// Model-paper categories control creation only, never stored or published content.
export const MODEL_CATEGORY_LABELS = {
  "seen-one": "Seen — Passage 1", "seen-two": "Seen — Passage 2", seen: "Seen",
  unseen: "Unseen", "other-reading": "Other Reading Questions", grammar: "Grammar", general: "General Questions",
} as const;
export type ModelCategoryId = keyof typeof MODEL_CATEGORY_LABELS;
export const MODEL_CATEGORY_IDS = Object.keys(MODEL_CATEGORY_LABELS) as ModelCategoryId[];
export function isModelCategoryId(value: unknown): value is ModelCategoryId {
  return typeof value === "string" && MODEL_CATEGORY_IDS.some(id => id === value);
}
export function parseModelCategories(value: string | null): ModelCategoryId[] | null {
  if (value === null) return null;
  try { const parsed: unknown = JSON.parse(value); if (Array.isArray(parsed) && parsed.every(isModelCategoryId)) return [...new Set(parsed)]; } catch { /* malformed policy */ }
  return [];
}
export type ModelCategoryGroup = { id: ModelCategoryId; title: string; description: string; slots: readonly FixedQuestionSlot[] };
const group = (id: ModelCategoryId, kinds: ContentBlockKind[], description: string): ModelCategoryGroup => ({ id, title: MODEL_CATEGORY_LABELS[id], description, slots: kinds.map(kind => ({ kind })) });
export function getModelQuestionCategoryGroups(className: string, subject: Parameters<typeof isEnglishFirstPaperSubject>[0]): ModelCategoryGroup[] {
  const layout = getFixedModelQuestionLayout(className, subject);
  if (layout) return getFixedModelQuestionGroups(layout).map(g => {
    const id: ModelCategoryId = isFixedSecondPaperLayout(layout) ? "grammar" : g.title === "Unseen" ? "unseen" : g.title === "Other Reading Questions" ? "other-reading" : layout === "class-9-10" ? "seen" : g.slots.some(s => s.kind === "seen-passage-two") ? "seen-two" : "seen-one";
    return { ...g, id, title: MODEL_CATEGORY_LABELS[id] };
  });
  if (isEnglishSecondPaperSubject(subject)) return [group("grammar", ["gap-fill-second-paper", "substitution-table", "right-form-of-verb", "narration", "changing-sentence", "punctuation-and-capitalization", "preposition", "suffix-and-prefix", "tag-question", "connector"], "Supported grammar question types. No fixed mark allocation is imposed.")];
  if (isEnglishFirstPaperSubject(subject)) return [
    group("seen", ["seen-passage-one", "mcq", "question-answer", "gap-fill-first-paper", "synonyms-antonyms"], "Seen passage and associated reading questions."),
    group("unseen", ["paragraph", "information-transfer", "true-false", "writing-summary"], "Unseen passage and reading exercises."),
    group("other-reading", ["table-completion", "column-matching", "rearrange-sentence", "question-from-poems", "question-from-story"], "Independent reading questions."),
  ];
  return [group("general", ["mcq", "question-answer", "gap-fill-first-paper", "table-completion", "column-matching"], "Existing supported general question types.")];
}
// Union of subject profiles, including English papers not yet created in a class.
export function getClassModelCategoryGroups(className: string, subjects: Parameters<typeof isEnglishFirstPaperSubject>[0][] = []): ModelCategoryGroup[] {
  const result = new Map<ModelCategoryId, ModelCategoryGroup>();
  for (const subject of [{ name: "English 1st Paper" }, { name: "English 2nd Paper" }, { name: "General subject" }, ...subjects]) {
    for (const g of getModelQuestionCategoryGroups(className, subject)) {
      const old = result.get(g.id);
      result.set(g.id, old ? { ...old, slots: [...old.slots, ...g.slots.filter(slot => !old.slots.some(s => s.kind === slot.kind))] } : g);
    }
  }
  return [...result.values()];
}
export function resolveModelCategories(defaults: readonly ModelCategoryId[], classCategories: ModelCategoryId[] | null, subjectCategories: ModelCategoryId[] | null = null) {
  return defaults.filter(id => (classCategories === null || classCategories.includes(id)) && (subjectCategories === null || subjectCategories.includes(id)));
}
export function getModelQuestionCreationKinds(groups: readonly ModelCategoryGroup[], categories: readonly ModelCategoryId[], assignedKinds: readonly string[] | null): ContentBlockKind[] {
  return [...new Set(groups.filter(g => categories.includes(g.id)).flatMap(g => g.slots.map(s => s.kind)))].filter(kind => assignedKinds === null || assignedKinds.includes(kind));
}
