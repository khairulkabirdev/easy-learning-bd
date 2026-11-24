/** 2026 school question-paper conventions for Class 6–7 English.
 * Suggestions, NOT compulsory national grading rules. Never mutate existing marks.
 * Sources documented in README: Model Academy Class 7 syllabus (2026),
 * St. Charles School 2026 marks distribution (2 November 2026 update).
 */
import type { ContentBlockKind } from "@/app/admin/content/content-types";
import type { FixedModelQuestionLayout } from "@/lib/model-question-fixed-blocks";

export type SuggestedBlockMark = Readonly<{ marks: number; formula: string }>;
const firstPaper: Partial<Record<ContentBlockKind, SuggestedBlockMark>> = {
  mcq: { marks: 7, formula: "7 × 1 = 7" },
  "question-answer": { marks: 10, formula: "5 × 2 = 10" },
  "gap-fill-first-paper": { marks: 5, formula: "5 × 1 = 5" },
  "synonyms-antonyms": { marks: 5, formula: "5 × 1 = 5" },
  "information-transfer": { marks: 5, formula: "5 × 1 = 5" },
  "true-false": { marks: 5, formula: "5 × 1 = 5" },
  "writing-summary": { marks: 10, formula: "1 × 10 = 10" },
  "table-completion": { marks: 5, formula: "5 × 1 = 5" },
  "column-matching": { marks: 5, formula: "5 × 1 = 5" },
  "rearrange-sentence": { marks: 8, formula: "8 × 1 = 8" },
  "question-from-poems": { marks: 10, formula: "Answer any 5 of 8; 5 × 2 = 10" },
};
const commonGrammar: Partial<Record<ContentBlockKind, SuggestedBlockMark>> = {
  "gap-fill-second-paper": { marks: 5, formula: "10 × 0.5 = 5 (or 5 × 1)" },
  "substitution-table": { marks: 5, formula: "5 × 1 = 5" },
  "right-form-of-verb": { marks: 5, formula: "5 × 1 = 5" },
  "changing-sentence": { marks: 5, formula: "5 × 1 = 5" },
  "punctuation-and-capitalization": { marks: 5, formula: "5 marks" },
};

export function classSevenLabel(className: string): boolean {
  return /(?:^|\b)(?:7|seven|seventh)(?:$|\b)|৭|সপ্তম/.test(className.trim().toLowerCase());
}

export function suggestedClass67Mark(
  layout: FixedModelQuestionLayout | null,
  className: string,
  kind: ContentBlockKind,
): SuggestedBlockMark | null {
  if (layout === "class-6-7") return firstPaper[kind] ?? null;
  if (layout !== "class-6-7-second-paper") return null;
  if (kind in commonGrammar) return commonGrammar[kind] ?? null;
  // The school syllabuses differ: Class 6 includes Suffix/Prefix,
  // while Class 7 includes Narration. Parts of Speech is not separately
  // allocated five marks in these references, so do NOT fabricate marks.
  if (classSevenLabel(className) && kind === "narration") {
    return { marks: 5, formula: "5 × 1 = 5" };
  }
  if (!classSevenLabel(className) && kind === "suffix-and-prefix") {
    return { marks: 5, formula: "5 marks" };
  }
  return null;
}

export function class67MarkingGuide(layout: FixedModelQuestionLayout | null, className: string) {
  if (layout === "class-6-7") return {
    group: "Reading", groupMarks: 70, fullPaperMarks: 100,
    note: "Reading: 70 marks. Writing: 30 marks (story 10, paragraph 10, dialogue 10). This fixed editor currently contains the Reading sections only.",
  };
  if (layout === "class-6-7-second-paper") return {
    group: "Grammar", groupMarks: 30, fullPaperMarks: 50,
    note: classSevenLabel(className)
      ? "Grammar: 30 marks; Writing: 20 marks (letter/e-mail 8, composition 12). A standard 2026 Class 7 pattern uses Narration; the current fixed block layout has Parts of Speech instead. Set its marks manually if your school uses it."
      : "Grammar: 30 marks; Writing: 20 marks (letter/e-mail 8, composition 12). A 2026 Class 6 pattern uses Suffix/Prefix; the current fixed block layout has Parts of Speech instead. Set its marks manually if your school uses it.",
  };
  return null;
}
