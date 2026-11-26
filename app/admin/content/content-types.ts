export type ClassOption = {
  id: string;
  name: string;
};

export type SubjectOption = {
  id: string;
  classId: string;
  name: string;
};

export type UnitOption = {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
};

export type LessonOption = {
  id: string;
  unitId: string;
  title: string;
};

export type TopicOption = {
  id: string;
  lessonId: string;
  title: string;
};

export type ContentBlockKind =
  | "paragraph"
  | "seen-passage-one"
  | "seen-passage-two"
  | "vocabulary"
  | "synonyms-antonyms"
  | "gap-fill"
  | "gap-fill-first-paper"
  | "gap-fill-second-paper"
  | "mcq"
  | "true-false"
  | "question-answer"
  | "table-completion"
  | "column-matching"
  | "rearrange-sentence"
  | "question-from-poems"
  | "question-from-story"
  | "writing-summary"
  | "information-transfer"
  | "substitution-table"
  | "right-form-of-verb"
  | "narration"
  | "changing-sentence"
  | "punctuation-and-capitalization"
  | "preposition"
  | "parts-of-speech"
  | "suffix-and-prefix"
  | "tag-question"
  | "connector";

export type SeenCompositionPassageRecord = {
  id: string;
  contentBlockId: string;
  contentId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
  body: string;
};

export type ParagraphRecord = {
  id: string;
  contentBlockId: string;
  contentId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
  body: string;
};

export type VocabularyEntryRecord = {
  id: string;
  vocabularyId: string;
  word: string;
  meaning: string;
  imageUrl: string;
  imagePath: string;
  sortOrder: number;
};

export type VocabularyRecord = {
  id: string;
  contentBlockId: string;
  contentId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
  passage: string;
  passageSource: PassageSource;
  paragraphBlockId: string | null;
  resolvedPassage?: string;
  entries: VocabularyEntryRecord[];
};

// Shared projection for admin editing and student model-paper rendering.
export const synonymsAntonymsEntrySelect = {
  id: true,
  synonymsAntonymsId: true,
  word: true,
  meanings: true,
  synonyms: true,
  antonyms: true,
  answerType: true,
  details: true,
  sortOrder: true,
} as const;

export function normalizeSynonymsAntonymsAnswerType(value: unknown): "synonym" | "antonym" | "both" {
  return value === "synonym" || value === "antonym" ? value : "both";
}

export type SynonymsAntonymsEntryRecord = {
  id: string;
  synonymsAntonymsId: string;
  word: string;
  meanings: string;
  synonyms: string;
  antonyms: string;
  /** Legacy records default to both; model questions may require a single type. */
  answerType?: "synonym" | "antonym" | "both";
  details: string;
  sortOrder: number;
};

export type PassageSource = "manual" | "paragraph";

export type SynonymsAntonymsRecord = {
  id: string;
  contentBlockId: string;
  contentId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
  passage: string;
  passageSource: PassageSource;
  paragraphBlockId: string | null;
  resolvedPassage?: string;
  entries: SynonymsAntonymsEntryRecord[];
};

export type GapFillExerciseRecord = {
  id: string;
  contentBlockId: string;
  contentId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
  question: string;
  answer: string;
  details: string;
  passage?: string;
  passageSource?: PassageSource;
  paragraphBlockId?: string | null;
  resolvedPassage?: string;
};

export type FillBlankAnswerRecord = {
  id: string;
  sortOrder: number;
  answer: string;
};

export type GapFillFirstPaperRecord = GapFillExerciseRecord & {
  blanks: FillBlankAnswerRecord[];
};
export type GapFillSecondPaperRecord = GapFillExerciseRecord & {
  blanks: FillBlankAnswerRecord[];
};

export type McqQuestionOptionRecord = {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
};

export type McqQuestionRecord = {
  id: string;
  prompt: string;
  answerMode: "single" | "multiple";
  sortOrder: number;
  options: McqQuestionOptionRecord[];
};

export type McqSectionRecord = {
  id: string;
  contentBlockId: string;
  contentId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
  title: string;
  description: string;
  passage: string;
  passageSource: PassageSource;
  paragraphBlockId: string | null;
  resolvedPassage?: string;
  documentJson: string;
  questions: McqQuestionRecord[];
};

export type QuestionAnswerRowRecord = {
  id: string;
  sortOrder: number;
  question: string;
  answer: string;
};

export type TableCompletionColumnRecord = {
  id: string;
  label: string;
  sortOrder: number;
};

export type TableCompletionCellRecord = {
  id: string;
  columnId: string;
  mode: "text" | "answer";
  text: string;
  answer: string;
};

export type TableCompletionRowRecord = {
  id: string;
  sortOrder: number;
  cells: TableCompletionCellRecord[];
};

export type TableCompletionAnswerSelectionRecord = {
  columnId: string;
  cellId: string;
};

export type TableCompletionAnswerRecord = {
  id: string;
  sortOrder: number;
  selections: TableCompletionAnswerSelectionRecord[];
};

export type TableCompletionDocumentRecord = {
  version: 1 | 2;
  columns: TableCompletionColumnRecord[];
  rows: TableCompletionRowRecord[];
  answers: TableCompletionAnswerRecord[];
};

export type QuestionAnswerPassageSource = "manual" | "paragraph";

export type QuestionAnswerExerciseRecord = {
  id: string;
  contentBlockId: string;
  contentId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
  title: string;
  instruction: string;
  question: string;
  answer: string;
  details: string;
  documentJson: string;
  passageSource?: QuestionAnswerPassageSource;
  paragraphBlockId?: string | null;
  rows: QuestionAnswerRowRecord[];
  table?: TableCompletionDocumentRecord;
};

export type TrueFalseRowRecord = {
  id: string;
  sortOrder: number;
  statement: string;
  expectedAnswer: boolean;
  correction: string;
};

export type TrueFalseExerciseRecord = {
  id: string;
  contentBlockId: string;
  contentId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
  title: string;
  instruction: string;
  passage: string;
  documentJson: string;
  rows: TrueFalseRowRecord[];
};

type ThreeFieldBlockRecord = {
  id: string;
  contentBlockId: string;
  contentId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
  question: string;
  answer: string;
  details: string;
};

export type InformationTransferRowRecord = {
  id: string;
  sortOrder: number;
  term: string;
  answer: string;
};

export type InformationTransferRecord = ThreeFieldBlockRecord & {
  passage: string;
  passageSource: PassageSource;
  paragraphBlockId: string | null;
  resolvedPassage?: string;
  documentJson: string;
  rows: InformationTransferRowRecord[];
  blanks: FillBlankAnswerRecord[];
};

export type SubstitutionTableColumnRecord = {
  id: string;
  label: string;
  sortOrder: number;
};

export type SubstitutionTableCellRecord = {
  id: string;
  columnId: string;
  text: string;
};

export type SubstitutionTableRowRecord = {
  id: string;
  sortOrder: number;
  cells: SubstitutionTableCellRecord[];
};

export type SubstitutionTableAnswerSelectionRecord = {
  columnId: string;
  cellId: string;
};

export type SubstitutionTableAnswerRecord = {
  id: string;
  sortOrder: number;
  selections: SubstitutionTableAnswerSelectionRecord[];
  sentence: string;
};

export type SubstitutionTableDocumentRecord = {
  version: 1;
  columns: SubstitutionTableColumnRecord[];
  rows: SubstitutionTableRowRecord[];
  answers: SubstitutionTableAnswerRecord[];
};

export type SubstitutionTableRecord = ThreeFieldBlockRecord & {
  table: SubstitutionTableDocumentRecord;
};
export type RightFormOfVerbRecord = ThreeFieldBlockRecord & {
  blanks: FillBlankAnswerRecord[];
};
export type NarrationRecord = ThreeFieldBlockRecord;
export type ChangingSentenceRecord = ThreeFieldBlockRecord & {
  rows: QuestionAnswerRowRecord[];
};
export type PunctuationAndCapitalizationRecord = ThreeFieldBlockRecord;
export type PrepositionRecord = ThreeFieldBlockRecord & {
  blanks: FillBlankAnswerRecord[];
};
export type SuffixPrefixItemRecord = {
  id: string;
  sortOrder: number;
  word: string;
  answer: string;
};

export type SuffixAndPrefixRecord = ThreeFieldBlockRecord & {
  items: SuffixPrefixItemRecord[];
};
export type TagQuestionMode = "items" | "paragraph";
export type TagQuestionRecord = ThreeFieldBlockRecord & {
  mode: TagQuestionMode;
  rows: QuestionAnswerRowRecord[];
  blanks: FillBlankAnswerRecord[];
};
export type ConnectorRecord = ThreeFieldBlockRecord & {
  blanks: FillBlankAnswerRecord[];
};

export type ContentBlockRecord = {
  id: string;
  contentId: string;
  kind: ContentBlockKind;
  sortOrder: number;
  boardId: string | null;
  academicYearId: string | null;
  // Section-specific metadata, independent of legacy title/instruction fields.
  title: string;
  shortDescription: string;
  marks?: number | null;
  paragraph: ParagraphRecord | null;
  seenPassageOne: SeenCompositionPassageRecord | null;
  seenPassageTwo: SeenCompositionPassageRecord | null;
  vocabulary: VocabularyRecord | null;
  synonymsAntonyms: SynonymsAntonymsRecord | null;
  gapFill: GapFillExerciseRecord | null;
  gapFillFirstPaper: GapFillFirstPaperRecord | null;
  gapFillSecondPaper: GapFillSecondPaperRecord | null;
  mcqSection: McqSectionRecord | null;
  questionAnswerExercise: QuestionAnswerExerciseRecord | null;
  trueFalseExercise: TrueFalseExerciseRecord | null;
  informationTransfer: InformationTransferRecord | null;
  substitutionTable: SubstitutionTableRecord | null;
  rightFormOfVerb: RightFormOfVerbRecord | null;
  narration: NarrationRecord | null;
  changingSentence: ChangingSentenceRecord | null;
  punctuationAndCapitalization: PunctuationAndCapitalizationRecord | null;
  preposition: PrepositionRecord | null;
  suffixAndPrefix: SuffixAndPrefixRecord | null;
  partsOfSpeech?: SuffixAndPrefixRecord | null;
  tagQuestion: TagQuestionRecord | null;
  connector: ConnectorRecord | null;
};

export type ContentRecordWithBlocks = {
  id: string;
  title?: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
  createdAt: Date;
  class: { id: string; name: string };
  subject: { id: string; name: string };
  unit: { id: string; title: string };
  lesson: { id: string; title: string };
  topic: { id: string; title: string } | null;
  blocks: ContentBlockRecord[];
};


// Registered, implemented block types. Assignment never creates or deletes content.
export type BlockAssignmentKind = ContentBlockKind | "unseen-composition";
export const BLOCK_CATALOG: readonly { kind: BlockAssignmentKind; title: string; description: string; group: "General" | "Reading" | "Grammar" }[] = [
  { kind: "paragraph", title: "Paragraph", description: "Add a paragraph block.", group: "General" },
  { kind: "seen-passage-one", title: "Passage", description: "Add a repeatable Seen Composition Passage block.", group: "Reading" },
  { kind: "seen-passage-two", title: "Passage 2", description: "Add a repeatable Seen Composition Passage 2 block.", group: "Reading" },
  { kind: "vocabulary", title: "Vocabulary", description: "Add vocabulary words and meanings.", group: "Reading" },
  { kind: "synonyms-antonyms", title: "Synonyms / Antonyms", description: "Add synonyms and antonyms rows.", group: "Reading" },
  { kind: "gap-fill", title: "Gap Fill (Legacy)", description: "Legacy gap fill block.", group: "General" },
  { kind: "gap-fill-first-paper", title: "Fill in the Blanks", description: "Add question, answer, and details for English 1st paper.", group: "Reading" },
  { kind: "gap-fill-second-paper", title: "Gap Filling", description: "Create a Tiptap question with inline blanks and matching answers.", group: "Grammar" },
  { kind: "mcq", title: "MCQ", description: "Add an MCQ section.", group: "General" },
  { kind: "true-false", title: "True / False", description: "Add a true/false exercise.", group: "Reading" },
  { kind: "writing-summary", title: "Summary", description: "Write an unseen-passage summary instruction and model answer.", group: "Reading" },
  { kind: "question-answer", title: "Question Answer", description: "Add a passage and question-answer items.", group: "General" },
  { kind: "table-completion", title: "Table Completion", description: "Add question, answer, and details.", group: "General" },
  { kind: "column-matching", title: "Matching Sentences", description: "Build Column A / Column B and add Column C when needed.", group: "General" },
  { kind: "rearrange-sentence", title: "Rearrange Sentence", description: "Add sentences one by one in the correct order for students to rearrange.", group: "General" },
  { kind: "question-from-poems", title: "Question from Poems", description: "Add a title and repeatable question-answer items without a passage field.", group: "Reading" },
  { kind: "question-from-story", title: "Question from Story", description: "Add a title and repeatable question-answer items without a passage field.", group: "Reading" },
  { kind: "information-transfer", title: "Information Transfer", description: "Create a Tiptap passage with inline transfer blanks and matching answers.", group: "Reading" },
  { kind: "substitution-table", title: "Substitution Table", description: "Build columns of sentence parts and define meaningful sentence combinations.", group: "Grammar" },
  { kind: "right-form-of-verb", title: "Right Form of Verb", description: "Create a Tiptap question with inline verb blanks and matching answers.", group: "Grammar" },
  { kind: "narration", title: "Narration", description: "Add question, answer, and details.", group: "Grammar" },
  { kind: "changing-sentence", title: "Changing Sentence", description: "Add each changing-sentence question with its own answer.", group: "Grammar" },
  { kind: "punctuation-and-capitalization", title: "Punctuation and Capitalization", description: "Add question, answer, and details.", group: "Grammar" },
  { kind: "preposition", title: "Preposition", description: "Create a Tiptap question with inline preposition blanks and matching answers.", group: "Grammar" },
  { kind: "parts-of-speech", title: "Parts of Speech", description: "Underline target words and enter their grammatical classes.", group: "Grammar" },
  { kind: "suffix-and-prefix", title: "Suffix and Prefix", description: "Add question, answer, and details.", group: "Grammar" },
  { kind: "tag-question", title: "Tag Question", description: "Add question, answer, and details.", group: "Grammar" },
  { kind: "connector", title: "Connector", description: "Create a Tiptap question with inline connector blanks and matching answers.", group: "Grammar" },
  { kind: "unseen-composition", title: "Unseen Composition", description: "Standalone unseen passage and its linked reading exercises.", group: "Reading" },
];

export const BLOCK_ASSIGNMENT_KINDS = BLOCK_CATALOG.map(item => item.kind);
export function isBlockAssignmentKind(value: unknown): value is BlockAssignmentKind {
  return typeof value === "string" && BLOCK_ASSIGNMENT_KINDS.some(kind => kind === value);
}

// null means inherit / unrestricted; [] means explicitly no blocks. Invalid
// stored policies fail closed, not open. Class assignment is the upper limit.
export function parseBlockAssignment(value: string | null): BlockAssignmentKind[] | null {
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every(isBlockAssignmentKind)) return [...new Set(parsed)];
  } catch { /* reject malformed persisted policy */ }
  return [];
}
export function resolveBlockAssignment(classKinds: BlockAssignmentKind[] | null, subjectKinds: BlockAssignmentKind[] | null): BlockAssignmentKind[] | null {
  if (classKinds === null) return subjectKinds;
  if (subjectKinds === null) return classKinds;
  return classKinds.filter(kind => subjectKinds.includes(kind));
}

export const SEEN_COMPOSITION_ASSIGNMENT_KINDS: readonly BlockAssignmentKind[] = ["seen-passage-one", "seen-passage-two", "mcq", "question-answer", "gap-fill-first-paper", "vocabulary", "synonyms-antonyms"];
export function firstPaperSectionAssignmentKinds(slug: string): readonly BlockAssignmentKind[] {
  if (slug === "seen-composition") return SEEN_COMPOSITION_ASSIGNMENT_KINDS;
  if (slug === "matching-sentences") return ["column-matching"];
  return isBlockAssignmentKind(slug) ? [slug] : [];
}
export function secondPaperSectionAssignmentKind(slug: string): BlockAssignmentKind | null {
  if (slug === "gap-filling") return "gap-fill-second-paper";
  return isBlockAssignmentKind(slug) ? slug : null;
}
