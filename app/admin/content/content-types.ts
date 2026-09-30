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
  | "sentence-ordering"
  | "information-transfer"
  | "substitution-table"
  | "right-form-of-verb"
  | "narration"
  | "changing-sentence"
  | "punctuation-and-capitalization"
  | "preposition"
  | "suffix-and-prefix"
  | "tag-question"
  | "connector";

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
  entries: VocabularyEntryRecord[];
};

export type SynonymsAntonymsEntryRecord = {
  id: string;
  synonymsAntonymsId: string;
  word: string;
  meanings: string;
  synonyms: string;
  antonyms: string;
  details: string;
  sortOrder: number;
};

export type SynonymsAntonymsRecord = {
  id: string;
  contentBlockId: string;
  contentId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
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
};

export type FillBlankAnswerRecord = {
  id: string;
  sortOrder: number;
  answer: string;
};

export type GapFillFirstPaperRecord = GapFillExerciseRecord & {
  blanks: FillBlankAnswerRecord[];
};
export type GapFillSecondPaperRecord = GapFillExerciseRecord;

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
  documentJson: string;
  questions: McqQuestionRecord[];
};

export type QuestionAnswerRowRecord = {
  id: string;
  sortOrder: number;
  question: string;
  answer: string;
};

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
  rows: QuestionAnswerRowRecord[];
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
  documentJson: string;
  rows: InformationTransferRowRecord[];
};

export type SubstitutionTableRecord = ThreeFieldBlockRecord;
export type RightFormOfVerbRecord = ThreeFieldBlockRecord;
export type NarrationRecord = ThreeFieldBlockRecord;
export type ChangingSentenceRecord = ThreeFieldBlockRecord;
export type PunctuationAndCapitalizationRecord = ThreeFieldBlockRecord;
export type PrepositionRecord = ThreeFieldBlockRecord;
export type SuffixAndPrefixRecord = ThreeFieldBlockRecord;
export type TagQuestionRecord = ThreeFieldBlockRecord;
export type ConnectorRecord = ThreeFieldBlockRecord;

export type ContentBlockRecord = {
  id: string;
  contentId: string;
  kind: ContentBlockKind;
  sortOrder: number;
  paragraph: ParagraphRecord | null;
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
  tagQuestion: TagQuestionRecord | null;
  connector: ConnectorRecord | null;
};

export type ContentRecordWithBlocks = {
  id: string;
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
