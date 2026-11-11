import { isEnglishFirstPaperSubject, isEnglishSecondPaperSubject } from "@/app/admin/content/navigation-helpers";

export type ModelQuestionBlockKind = { value: string; label: string; help: string };
const shared: ModelQuestionBlockKind[] = [
  { value: "mcq", label: "Multiple Choice (MCQ)", help: "Question with four answer options" },
  { value: "short-answer", label: "Short Answer", help: "Short question and optional answer" },
  { value: "creative-question", label: "Creative / Written Question", help: "Question, context, and optional model answer" },
];
const englishFirst: ModelQuestionBlockKind[] = [
  { value: "seen-comprehension", label: "Seen Passage & Questions", help: "Use the passage field and write related questions" },
  { value: "unseen-comprehension", label: "Unseen Passage & Questions", help: "Write an unseen passage and comprehension tasks" },
  { value: "information-transfer", label: "Information Transfer", help: "Transfer passage information into answers" },
  { value: "matching-sentences", label: "Matching Sentences", help: "Two-column matching exercise" },
  { value: "rearrange-sentence", label: "Rearrange Sentences", help: "Sentence ordering exercise" },
  { value: "summary", label: "Summary Writing", help: "Passage with summary prompt" },
  { value: "question-from-poems", label: "Question from Poems", help: "Poem and question-answer items" },
  { value: "question-from-story", label: "Question from Story", help: "Story and question-answer items" },
  { value: "completing-story", label: "Completing Story", help: "Story writing prompt" },
  { value: "paragraph", label: "Paragraph Writing", help: "Paragraph topic and instructions" },
  { value: "email-letter", label: "Email / Letter", help: "Email or letter writing prompt" },
  { value: "dialogue", label: "Dialogue Writing", help: "Dialogue writing exercise" },
];
const englishSecond: ModelQuestionBlockKind[] = [
  { value: "gap-filling", label: "Gap Filling", help: "Fill in blank spaces" },
  { value: "substitution-table", label: "Substitution Table", help: "Build sentences from a substitution table" },
  { value: "right-form-of-verb", label: "Right Form of Verb", help: "Complete sentences with the correct verb form" },
  { value: "narration", label: "Narration", help: "Direct and indirect speech" },
  { value: "changing-sentence", label: "Changing Sentence", help: "Sentence transformation" },
  { value: "punctuation-and-capitalization", label: "Punctuation & Capitalization", help: "Correct punctuation and capital letters" },
  { value: "preposition", label: "Preposition", help: "Complete with appropriate prepositions" },
  { value: "suffix-and-prefix", label: "Suffix & Prefix", help: "Word formation" },
  { value: "tag-question", label: "Tag Question", help: "Add appropriate question tags" },
  { value: "connector", label: "Connector", help: "Complete text with connectors" },
  { value: "composition", label: "Composition", help: "Composition writing" },
  { value: "application", label: "Application / Formal Letter", help: "Formal writing task" },
];

export function modelQuestionBlockOptions(subject: { name: string; slug?: string | null; code?: string | null }): ModelQuestionBlockKind[] {
  if (isEnglishSecondPaperSubject(subject)) return [...englishSecond, ...shared];
  if (isEnglishFirstPaperSubject(subject)) return [...englishFirst, ...shared];
  return shared;
}
