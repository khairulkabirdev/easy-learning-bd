export type SubjectSectionKind =
  | "matching-sentences"
  | "rearrange-sentence"
  | "question-from-poems"
  | "question-from-story";

export type QuestionAnswerRow = {
  id: string;
  sortOrder: number;
  question: string;
  answer: string;
};

export type QuestionAnswerDocument = {
  version: 1;
  rows: QuestionAnswerRow[];
};

export type MatchingColumn = {
  id: string;
  label: string;
  sortOrder: number;
};

export type MatchingCell = {
  id: string;
  columnId: string;
  text: string;
};

export type MatchingRow = {
  id: string;
  sortOrder: number;
  cells: MatchingCell[];
};

export type MatchingSelection = {
  columnId: string;
  cellId: string;
};

export type MatchingAnswer = {
  id: string;
  sortOrder: number;
  selections: MatchingSelection[];
};

export type MatchingDocument = {
  version: 2;
  columns: MatchingColumn[];
  rows: MatchingRow[];
  answers: MatchingAnswer[];
};

export type SubjectSectionRecord = {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  instruction: string;
  details: string;
  documentJson: string;
  sortOrder: number;
  updatedAt: string;
};

export const SUBJECT_SECTION_META: Record<
  SubjectSectionKind,
  { title: string; singular: string; description: string }
> = {
  "matching-sentences": {
    title: "Matching Sentences",
    singular: "Matching Sentences block",
    description: "Create matching-column blocks directly for this subject. No Unit, Lesson, or Topic assignment is required.",
  },
  "rearrange-sentence": {
    title: "Rearrange Sentence",
    singular: "Rearrange Sentence block",
    description: "Create rearrange-sentence blocks directly for this subject. No Unit, Lesson, or Topic assignment is required.",
  },
  "question-from-poems": {
    title: "Question from Poems",
    singular: "Question from Poems block",
    description: "Create poem question-answer blocks directly for this subject. No Passage, Unit, Lesson, or Topic assignment is required.",
  },
  "question-from-story": {
    title: "Question from Story",
    singular: "Question from Story block",
    description: "Create story question-answer blocks directly for this subject. No Passage, Unit, Lesson, or Topic assignment is required.",
  },
};

export function createDefaultMatchingDocument(): MatchingDocument {
  const columnA = crypto.randomUUID();
  const columnB = crypto.randomUUID();
  return {
    version: 2,
    columns: [
      { id: columnA, label: "Column A", sortOrder: 0 },
      { id: columnB, label: "Column B", sortOrder: 1 },
    ],
    rows: [],
    answers: [],
  };
}

export function createDefaultQuestionAnswerDocument(): QuestionAnswerDocument {
  return { version: 1, rows: [] };
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function parseMatchingDocument(value: string, recordId: string): MatchingDocument {
  const parsed = safeParse(value) as Partial<MatchingDocument> | null;
  const sourceColumns = Array.isArray(parsed?.columns) ? parsed!.columns! : [];
  const columns: MatchingColumn[] = (sourceColumns.length >= 2
    ? sourceColumns
    : [
        { id: `${recordId}-column-a`, label: "Column A", sortOrder: 0 },
        { id: `${recordId}-column-b`, label: "Column B", sortOrder: 1 },
      ]
  ).map((column, index) => ({
    id: column.id || `${recordId}-column-${index + 1}`,
    label: column.label || `Column ${String.fromCharCode(65 + index)}`,
    sortOrder: index,
  }));

  const rows: MatchingRow[] = (Array.isArray(parsed?.rows) ? parsed!.rows! : []).map((row, rowIndex) => ({
    id: row.id || `${recordId}-row-${rowIndex + 1}`,
    sortOrder: rowIndex,
    cells: columns.map((column, columnIndex) => {
      const source = Array.isArray(row.cells)
        ? row.cells.find((cell) => cell.columnId === column.id) || row.cells[columnIndex]
        : undefined;
      return {
        id: source?.id || `${recordId}-row-${rowIndex + 1}-cell-${columnIndex + 1}`,
        columnId: column.id,
        text: source?.text || "",
      };
    }),
  }));

  const sourceAnswers = Array.isArray(parsed?.answers) ? parsed!.answers! : [];
  const answers: MatchingAnswer[] = rows.map((_, answerIndex) => {
    const source = sourceAnswers[answerIndex];
    return {
      id: source?.id || `${recordId}-answer-${answerIndex + 1}`,
      sortOrder: answerIndex,
      selections: columns.map((column) => {
        const selected = source?.selections?.find((item) => item.columnId === column.id)?.cellId || "";
        const valid = rows.some((row) => row.cells.some((cell) => cell.id === selected && cell.columnId === column.id));
        return { columnId: column.id, cellId: valid ? selected : "" };
      }),
    };
  });

  return { version: 2, columns, rows, answers };
}

export function parseQuestionAnswerDocument(value: string, recordId: string): QuestionAnswerDocument {
  const parsed = safeParse(value) as { rows?: Array<Partial<QuestionAnswerRow>> } | null;
  const rows = Array.isArray(parsed?.rows) ? parsed!.rows! : [];
  return {
    version: 1,
    rows: rows.map((row, index) => ({
      id: row.id || `${recordId}-row-${index + 1}`,
      sortOrder: index,
      question: row.question || "",
      answer: row.answer || "",
    })),
  };
}


export type SubjectSectionValidationErrors = Record<string, string>;

export type SubjectSectionDraft = {
  title: string;
  instruction: string;
  details: string;
  document: MatchingDocument | QuestionAnswerDocument;
};

export function createDefaultDocumentForKind(
  kind: SubjectSectionKind,
): MatchingDocument | QuestionAnswerDocument {
  return kind === "matching-sentences"
    ? createDefaultMatchingDocument()
    : createDefaultQuestionAnswerDocument();
}

function richTextHasContent(value: string) {
  if (!value) return false;
  if (/<(?:img|video|audio|iframe)\b/i.test(value)) return true;
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim().length > 0;
}

export function validateSubjectSectionDraft(
  kind: SubjectSectionKind,
  draft: SubjectSectionDraft,
): SubjectSectionValidationErrors {
  const errors: SubjectSectionValidationErrors = {};

  if (!draft.title.trim()) {
    errors.title = "Title is required.";
  }

  if (kind === "matching-sentences") {
    const document = draft.document as MatchingDocument;
    if (!Array.isArray(document.columns) || document.columns.length < 2) {
      errors.document = "Matching Sentences requires at least Column A and Column B.";
      return errors;
    }

    const seenLabels = new Set<string>();
    document.columns.forEach((column, index) => {
      const label = column.label.trim();
      if (!label) {
        errors[`column:${column.id}`] = `Column ${String.fromCharCode(65 + index)} needs a label.`;
      } else {
        const key = label.toLocaleLowerCase();
        if (seenLabels.has(key)) {
          errors[`column:${column.id}`] = "Column labels must be unique.";
        }
        seenLabels.add(key);
      }
    });

    if (!Array.isArray(document.rows) || document.rows.length === 0) {
      errors.document = "Add at least one matching row.";
      return errors;
    }

    document.rows.forEach((row, rowIndex) => {
      document.columns.forEach((column, columnIndex) => {
        const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
        if (!cell?.text?.trim()) {
          errors[`cell:${cell?.id || `${row.id}:${column.id}`}`] =
            `Row ${rowIndex + 1}, ${column.label || `Column ${String.fromCharCode(65 + columnIndex)}`} is required.`;
        }
      });
    });

    if (!Array.isArray(document.answers) || document.answers.length !== document.rows.length) {
      errors.answers = "Every matching row needs one answer mapping.";
    } else {
      const usedPerColumn = new Map<string, Set<string>>();
      document.answers.forEach((answer, answerIndex) => {
        document.columns.forEach((column) => {
          const selection = answer.selections.find((item) => item.columnId === column.id);
          if (!selection?.cellId) {
            errors[`answer:${answer.id}:${column.id}`] =
              `Answer ${answerIndex + 1}: choose a value for ${column.label || "this column"}.`;
            return;
          }
          const validCell = document.rows.some((row) =>
            row.cells.some((cell) => cell.columnId === column.id && cell.id === selection.cellId),
          );
          if (!validCell) {
            errors[`answer:${answer.id}:${column.id}`] =
              `Answer ${answerIndex + 1}: the selected value is no longer valid.`;
            return;
          }
          const used = usedPerColumn.get(column.id) ?? new Set<string>();
          if (used.has(selection.cellId)) {
            errors[`answer:${answer.id}:${column.id}`] =
              `${column.label || "Column"} cannot reuse the same row in multiple answers.`;
          }
          used.add(selection.cellId);
          usedPerColumn.set(column.id, used);
        });
      });
    }

    return errors;
  }

  const document = draft.document as QuestionAnswerDocument;
  if (!Array.isArray(document.rows)) {
    errors.document = "Exercise items are invalid.";
    return errors;
  }

  if (kind === "rearrange-sentence") {
    if (document.rows.length < 2) {
      errors.document = "Add at least two sentences for a rearrange exercise.";
    }
    document.rows.forEach((row, index) => {
      if (!richTextHasContent(row.question)) {
        errors[`row:${row.id}:question`] = `Sentence ${index + 1} is required.`;
      }
    });
    return errors;
  }

  if (document.rows.length === 0) {
    errors.document = "Add at least one question and answer item.";
  }
  document.rows.forEach((row, index) => {
    if (!richTextHasContent(row.question)) {
      errors[`row:${row.id}:question`] = `Question ${index + 1} is required.`;
    }
    if (!richTextHasContent(row.answer)) {
      errors[`row:${row.id}:answer`] = `Answer ${index + 1} is required.`;
    }
  });

  return errors;
}
