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
      title: "Seen — Passage 1",
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
