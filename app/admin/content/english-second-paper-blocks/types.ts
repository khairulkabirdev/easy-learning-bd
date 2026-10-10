export type EnglishSecondPaperKind =
  | "gap-filling"
  | "substitution-table"
  | "right-form-of-verb"
  | "narration"
  | "changing-sentence"
  | "punctuation-and-capitalization"
  | "preposition"
  | "suffix-and-prefix"
  | "tag-question"
  | "connector";

export type EnglishSecondPaperRecord = {
  id: string;
  classId: string;
  subjectId: string;
  kind: EnglishSecondPaperKind;
  boardId?: string | null;
  academicYearId?: string | null;
  title: string;
  instruction: string;
  details: string;
  documentJson: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt: string;
};

export type BlankAnswer = {
  id: string;
  sortOrder: number;
  answer: string;
};

export type BlankExerciseDocument = {
  version: 1;
  question: string;
  blanks: BlankAnswer[];
};

export type SimpleQuestionAnswerDocument = {
  version: 1;
  question: string;
  answer: string;
};

export type QuestionAnswerRow = {
  id: string;
  sortOrder: number;
  question: string;
  answer: string;
};

export type QuestionAnswerItemsDocument = {
  version: 1;
  rows: QuestionAnswerRow[];
};

export type SubstitutionColumn = {
  id: string;
  label: string;
  sortOrder: number;
};

export type SubstitutionCell = {
  id: string;
  columnId: string;
  text: string;
};

export type SubstitutionRow = {
  id: string;
  sortOrder: number;
  cells: SubstitutionCell[];
};

export type SubstitutionSelection = {
  columnId: string;
  cellId: string;
};

export type SubstitutionAnswer = {
  id: string;
  sortOrder: number;
  selections: SubstitutionSelection[];
  sentence: string;
};

export type SubstitutionTableDocument = {
  version: 1;
  columns: SubstitutionColumn[];
  rows: SubstitutionRow[];
  answers: SubstitutionAnswer[];
};

export type SuffixPrefixItem = {
  id: string;
  sortOrder: number;
  word: string;
  answer: string;
};

export type SuffixPrefixDocument = {
  version: 1;
  question: string;
  items: SuffixPrefixItem[];
};

export type TagQuestionDocument = {
  version: 1;
  mode: "items" | "paragraph";
  question: string;
  blanks: BlankAnswer[];
  rows: QuestionAnswerRow[];
};

export type EnglishSecondPaperDocument =
  | BlankExerciseDocument
  | SimpleQuestionAnswerDocument
  | QuestionAnswerItemsDocument
  | SubstitutionTableDocument
  | SuffixPrefixDocument
  | TagQuestionDocument;

export type EnglishSecondPaperValidationErrors = Record<string, string>;

export type EnglishSecondPaperDraft = {
  title: string;
  instruction: string;
  details: string;
  document: EnglishSecondPaperDocument;
};

export const ENGLISH_SECOND_PAPER_KINDS: EnglishSecondPaperKind[] = [
  "gap-filling",
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

export const ENGLISH_SECOND_PAPER_META: Record<
  EnglishSecondPaperKind,
  { title: string; singular: string; description: string; blockKind: string }
> = {
  "gap-filling": {
    title: "Gap Filling",
    singular: "Gap Filling block",
    description: "Create second-paper gap-filling exercises with inline blanks and matching answers.",
    blockKind: "gap-fill-second-paper",
  },
  "substitution-table": {
    title: "Substitution Table",
    singular: "Substitution Table block",
    description: "Build sentence-part columns and save valid sentence combinations.",
    blockKind: "substitution-table",
  },
  "right-form-of-verb": {
    title: "Right Form of Verb",
    singular: "Right Form of Verb block",
    description: "Create verb exercises with inline blanks and matching answers.",
    blockKind: "right-form-of-verb",
  },
  narration: {
    title: "Narration",
    singular: "Narration block",
    description: "Create narration questions with answers and explanations.",
    blockKind: "narration",
  },
  "changing-sentence": {
    title: "Changing Sentence",
    singular: "Changing Sentence block",
    description: "Add each sentence transformation as its own question-and-answer item.",
    blockKind: "changing-sentence",
  },
  "punctuation-and-capitalization": {
    title: "Punctuation and Capitalization",
    singular: "Punctuation and Capitalization block",
    description: "Create punctuation and capitalization questions with corrected answers.",
    blockKind: "punctuation-and-capitalization",
  },
  preposition: {
    title: "Preposition",
    singular: "Preposition block",
    description: "Create preposition exercises with inline blanks and matching answers.",
    blockKind: "preposition",
  },
  "suffix-and-prefix": {
    title: "Suffix and Prefix",
    singular: "Suffix and Prefix block",
    description: "Mark root words in the question and save each completed-word answer.",
    blockKind: "suffix-and-prefix",
  },
  "tag-question": {
    title: "Tag Question",
    singular: "Tag Question block",
    description: "Create tag questions as separate items or as a paragraph with inline blanks.",
    blockKind: "tag-question",
  },
  connector: {
    title: "Connector",
    singular: "Connector block",
    description: "Create connector exercises with inline blanks and matching answers.",
    blockKind: "connector",
  },
};

export function isEnglishSecondPaperKind(value: string): value is EnglishSecondPaperKind {
  return ENGLISH_SECOND_PAPER_KINDS.includes(value as EnglishSecondPaperKind);
}

function newId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.();
  return random || `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function htmlToPlainText(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function richTextHasContent(value: string) {
  if (!value) return false;
  if (/<(?:img|video|audio|iframe)\b/i.test(value)) return true;
  return htmlToPlainText(value).trim().length > 0;
}

export function countBlankMarkers(question: string) {
  return htmlToPlainText(question).match(/_{2,}/g)?.length ?? 0;
}

export function extractSuffixPrefixWords(question: string) {
  return Array.from(question.matchAll(/<u(?:\s[^>]*)?>([\s\S]*?)<\/u>/gi))
    .map((match) => htmlToPlainText(match[1] || ""))
    .filter(Boolean);
}

function normalizeBlankDocument(value: unknown, recordId: string): BlankExerciseDocument {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<BlankExerciseDocument>;
  const question = typeof parsed.question === "string" ? parsed.question : "";
  const blankCount = countBlankMarkers(question);
  const source = Array.isArray(parsed.blanks) ? parsed.blanks : [];
  return {
    version: 1,
    question,
    blanks: Array.from({ length: blankCount }, (_, index) => ({
      id: source[index]?.id || `${recordId}-blank-${index + 1}`,
      sortOrder: index,
      answer: source[index]?.answer || "",
    })),
  };
}

function normalizeSimpleDocument(value: unknown): SimpleQuestionAnswerDocument {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<SimpleQuestionAnswerDocument>;
  return {
    version: 1,
    question: typeof parsed.question === "string" ? parsed.question : "",
    answer: typeof parsed.answer === "string" ? parsed.answer : "",
  };
}

function normalizeItemsDocument(value: unknown, recordId: string): QuestionAnswerItemsDocument {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<QuestionAnswerItemsDocument>;
  const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
  return {
    version: 1,
    rows: rows.map((row, index) => ({
      id: row?.id || `${recordId}-row-${index + 1}`,
      sortOrder: index,
      question: row?.question || "",
      answer: row?.answer || "",
    })),
  };
}

function substitutionColumnLabel(index: number) {
  return index < 26 ? `Column ${String.fromCharCode(65 + index)}` : `Column ${index + 1}`;
}

function normalizeSubstitutionDocument(value: unknown, recordId: string): SubstitutionTableDocument {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<SubstitutionTableDocument>;
  const sourceColumns = Array.isArray(parsed.columns) ? parsed.columns : [];
  const columns = (sourceColumns.length >= 2
    ? sourceColumns
    : Array.from({ length: 3 }, (_, index) => ({
        id: `${recordId}-column-${index + 1}`,
        label: substitutionColumnLabel(index),
        sortOrder: index,
      }))).map((column, index) => ({
    id: column?.id || `${recordId}-column-${index + 1}`,
    label: column?.label || substitutionColumnLabel(index),
    sortOrder: index,
  }));

  const sourceRows = Array.isArray(parsed.rows) ? parsed.rows : [];
  const rows = sourceRows.map((row, rowIndex) => ({
    id: row?.id || `${recordId}-row-${rowIndex + 1}`,
    sortOrder: rowIndex,
    cells: columns.map((column, columnIndex) => {
      const source = Array.isArray(row?.cells)
        ? row.cells.find((cell) => cell.columnId === column.id) || row.cells[columnIndex]
        : undefined;
      return {
        id: source?.id || `${recordId}-row-${rowIndex + 1}-cell-${columnIndex + 1}`,
        columnId: column.id,
        text: source?.text || "",
      };
    }),
  }));

  const sourceAnswers = Array.isArray(parsed.answers) ? parsed.answers : [];
  const answers = sourceAnswers.map((answer, answerIndex) => ({
    id: answer?.id || `${recordId}-answer-${answerIndex + 1}`,
    sortOrder: answerIndex,
    selections: columns.map((column) => {
      const source = answer?.selections?.find((selection) => selection.columnId === column.id);
      const isValid = rows.some((row) =>
        row.cells.some((cell) => cell.id === source?.cellId && cell.columnId === column.id && cell.text.trim()),
      );
      return { columnId: column.id, cellId: isValid ? source?.cellId || "" : "" };
    }),
    sentence: answer?.sentence || "",
  }));

  return { version: 1, columns, rows, answers };
}

function normalizeSuffixPrefixDocument(value: unknown, recordId: string): SuffixPrefixDocument {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<SuffixPrefixDocument>;
  const question = typeof parsed.question === "string" ? parsed.question : "";
  const words = extractSuffixPrefixWords(question);
  const sourceItems = Array.isArray(parsed.items) ? parsed.items : [];
  return {
    version: 1,
    question,
    items: words.map((word, index) => ({
      id: sourceItems[index]?.id || `${recordId}-suffix-${index + 1}`,
      sortOrder: index,
      word,
      answer: sourceItems[index]?.answer || "",
    })),
  };
}

function normalizeTagQuestionDocument(value: unknown, recordId: string): TagQuestionDocument {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<TagQuestionDocument>;
  const mode = parsed.mode === "paragraph" ? "paragraph" : "items";
  const question = typeof parsed.question === "string" ? parsed.question : "";
  const blankCount = countBlankMarkers(question);
  const sourceBlanks = Array.isArray(parsed.blanks) ? parsed.blanks : [];
  const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
  return {
    version: 1,
    mode,
    question,
    blanks: Array.from({ length: blankCount }, (_, index) => ({
      id: sourceBlanks[index]?.id || `${recordId}-tag-blank-${index + 1}`,
      sortOrder: index,
      answer: sourceBlanks[index]?.answer || "",
    })),
    rows: rows.map((row, index) => ({
      id: row?.id || `${recordId}-tag-row-${index + 1}`,
      sortOrder: index,
      question: row?.question || "",
      answer: row?.answer || "",
    })),
  };
}

export function parseEnglishSecondPaperDocument(
  kind: EnglishSecondPaperKind,
  value: string,
  recordId: string,
): EnglishSecondPaperDocument {
  const parsed = safeParse(value);
  switch (kind) {
    case "gap-filling":
    case "right-form-of-verb":
    case "preposition":
    case "connector":
      return normalizeBlankDocument(parsed, recordId);
    case "narration":
    case "punctuation-and-capitalization":
      return normalizeSimpleDocument(parsed);
    case "changing-sentence":
      return normalizeItemsDocument(parsed, recordId);
    case "substitution-table":
      return normalizeSubstitutionDocument(parsed, recordId);
    case "suffix-and-prefix":
      return normalizeSuffixPrefixDocument(parsed, recordId);
    case "tag-question":
      return normalizeTagQuestionDocument(parsed, recordId);
  }
}

export function createDefaultEnglishSecondPaperDocument(
  kind: EnglishSecondPaperKind,
): EnglishSecondPaperDocument {
  const id = `new-${kind}`;
  switch (kind) {
    case "gap-filling":
    case "right-form-of-verb":
    case "preposition":
    case "connector":
      return { version: 1, question: "", blanks: [] };
    case "narration":
    case "punctuation-and-capitalization":
      return { version: 1, question: "", answer: "" };
    case "changing-sentence":
      return { version: 1, rows: [] };
    case "substitution-table":
      return normalizeSubstitutionDocument({}, id);
    case "suffix-and-prefix":
      return { version: 1, question: "", items: [] };
    case "tag-question":
      return { version: 1, mode: "items", question: "", blanks: [], rows: [] };
  }
}

export function normalizeEnglishSecondPaperDocument(
  kind: EnglishSecondPaperKind,
  document: EnglishSecondPaperDocument,
  recordId = "draft",
) {
  return parseEnglishSecondPaperDocument(kind, JSON.stringify(document), recordId);
}

export function validateEnglishSecondPaperDraft(
  kind: EnglishSecondPaperKind,
  draft: EnglishSecondPaperDraft,
): EnglishSecondPaperValidationErrors {
  const errors: EnglishSecondPaperValidationErrors = {};
  if (!draft.title.trim()) errors.title = "Title is required.";

  switch (kind) {
    case "gap-filling":
    case "right-form-of-verb":
    case "preposition":
    case "connector": {
      const document = draft.document as BlankExerciseDocument;
      if (!richTextHasContent(document.question)) errors.question = "Question is required.";
      if (document.blanks.length === 0) errors.document = "Add at least one blank to the question.";
      document.blanks.forEach((blank, index) => {
        if (!blank.answer.trim()) errors[`blank:${blank.id}`] = `Answer for blank ${index + 1} is required.`;
      });
      break;
    }
    case "narration":
    case "punctuation-and-capitalization": {
      const document = draft.document as SimpleQuestionAnswerDocument;
      if (!richTextHasContent(document.question)) errors.question = "Question is required.";
      if (!richTextHasContent(document.answer)) errors.answer = "Answer is required.";
      break;
    }
    case "changing-sentence": {
      const document = draft.document as QuestionAnswerItemsDocument;
      if (document.rows.length === 0) errors.document = "Add at least one question-answer item.";
      document.rows.forEach((row, index) => {
        if (!richTextHasContent(row.question)) errors[`row:${row.id}:question`] = `Question ${index + 1} is required.`;
        if (!richTextHasContent(row.answer)) errors[`row:${row.id}:answer`] = `Answer ${index + 1} is required.`;
      });
      break;
    }
    case "substitution-table": {
      const document = draft.document as SubstitutionTableDocument;
      if (document.columns.length < 2) errors.document = "Add at least two columns.";
      const labels = new Set<string>();
      document.columns.forEach((column, index) => {
        const label = column.label.trim();
        if (!label) errors[`column:${column.id}`] = `Column ${index + 1} needs a label.`;
        else if (labels.has(label.toLocaleLowerCase())) errors[`column:${column.id}`] = "Column labels must be unique.";
        labels.add(label.toLocaleLowerCase());
      });
      if (document.rows.length === 0) errors.rows = "Add at least one substitution-table row.";
      if (document.answers.length === 0) errors.answers = "Add at least one valid sentence combination.";
      document.answers.forEach((answer, index) => {
        document.columns.forEach((column) => {
          const selected = answer.selections.find((item) => item.columnId === column.id)?.cellId || "";
          if (!selected) errors[`answer:${answer.id}:${column.id}`] = `Combination ${index + 1} needs a selection for ${column.label}.`;
        });
      });
      break;
    }
    case "suffix-and-prefix": {
      const document = draft.document as SuffixPrefixDocument;
      if (!richTextHasContent(document.question)) errors.question = "Question is required.";
      if (document.items.length === 0) errors.document = "Add at least one Suffix / Prefix root word.";
      document.items.forEach((item, index) => {
        if (!item.answer.trim()) errors[`suffix:${item.id}`] = `Answer ${index + 1} is required.`;
      });
      break;
    }
    case "tag-question": {
      const document = draft.document as TagQuestionDocument;
      if (document.mode === "paragraph") {
        if (!richTextHasContent(document.question)) errors.question = "Paragraph / passage is required.";
        if (document.blanks.length === 0) errors.document = "Add at least one tag-question blank.";
        document.blanks.forEach((blank, index) => {
          if (!blank.answer.trim()) errors[`blank:${blank.id}`] = `Answer for blank ${index + 1} is required.`;
        });
      } else {
        if (document.rows.length === 0) errors.document = "Add at least one Tag Question item.";
        document.rows.forEach((row, index) => {
          if (!richTextHasContent(row.question)) errors[`row:${row.id}:question`] = `Question ${index + 1} is required.`;
          if (countBlankMarkers(row.question) !== 1) errors[`row:${row.id}:blank`] = `Question ${index + 1} must contain exactly one blank.`;
          if (!row.answer.trim()) errors[`row:${row.id}:answer`] = `Answer ${index + 1} is required.`;
        });
      }
      break;
    }
  }

  return errors;
}

export function makeEmptyEnglishSecondPaperRecord(
  kind: EnglishSecondPaperKind,
  classId: string,
  subjectId: string,
): EnglishSecondPaperRecord {
  return {
    id: `new-${kind}`,
    classId,
    subjectId,
    kind,
    boardId: null,
    academicYearId: null,
    title: "",
    instruction: "",
    details: "",
    documentJson: JSON.stringify(createDefaultEnglishSecondPaperDocument(kind)),
    sortOrder: 0,
    updatedAt: new Date(0).toISOString(),
  };
}
