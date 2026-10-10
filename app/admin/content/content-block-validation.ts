export type CrudValidationErrors = Record<string, string>;

export function richTextHasContent(value: string) {
  if (!value) return false;
  if (/<(?:img|video|audio|iframe)\b/i.test(value)) return true;
  return value
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim().length > 0;
}

export function countBlankMarkers(value: string) {
  const text = value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  return text.match(/_{2,}/g)?.length ?? 0;
}

export function firstCrudValidationError(errors: CrudValidationErrors) {
  return Object.values(errors)[0] ?? null;
}

export function crudValidationErrorCount(errors: CrudValidationErrors) {
  return Object.keys(errors).length;
}

export function crudValidationWouldRegress(
  previousErrors: CrudValidationErrors,
  nextErrors: CrudValidationErrors,
) {
  const previousCount = crudValidationErrorCount(previousErrors);
  const nextCount = crudValidationErrorCount(nextErrors);
  if (nextCount === 0) return false;
  if (previousCount === 0) return true;
  if (nextCount > previousCount) return true;
  if (nextCount < previousCount) return false;

  // Legacy records can contain incomplete placeholder rows from older builds.
  // Keeping the exact same legacy validation errors while editing unrelated
  // fields or appending a new valid row is not a regression. Introducing a new
  // error key at the same error count is a regression and is rejected.
  return Object.keys(nextErrors).some((key) => !(key in previousErrors));
}

export function validateVocabularyEntryDraft(draft: { word: string; meaning: string }) {
  const errors: CrudValidationErrors = {};
  if (!draft.word.trim()) errors.word = "Word is required.";
  if (!draft.meaning.trim()) errors.meaning = "Meaning is required.";
  return errors;
}

export function validateSynonymsAntonymsEntryDraft(draft: { word: string; meanings: string }) {
  const errors: CrudValidationErrors = {};
  if (!draft.word.trim()) errors.word = "Word is required.";
  if (!draft.meanings.trim()) errors.meanings = "Meaning is required.";
  return errors;
}

export function validateQuestionAnswerRowDraft(
  draft: { question: string; answer: string },
  options?: { answerRequired?: boolean; questionLabel?: string; answerLabel?: string },
) {
  const errors: CrudValidationErrors = {};
  const questionLabel = options?.questionLabel ?? "Question";
  const answerLabel = options?.answerLabel ?? "Answer";
  if (!richTextHasContent(draft.question)) errors.question = `${questionLabel} is required.`;
  if (options?.answerRequired !== false && !richTextHasContent(draft.answer)) {
    errors.answer = `${answerLabel} is required.`;
  }
  return errors;
}

export function validateTagQuestionItemDraft(draft: { question: string; answer: string }) {
  const errors = validateQuestionAnswerRowDraft(draft);
  if (richTextHasContent(draft.question) && countBlankMarkers(draft.question) !== 1) {
    errors.question = "Tag Question must contain exactly one blank.";
  }
  return errors;
}

export function validateSentenceOrderingDraft(draft: { sentence: string }) {
  const errors: CrudValidationErrors = {};
  if (!richTextHasContent(draft.sentence)) errors.sentence = "Sentence is required.";
  return errors;
}

export function validateInformationTransferRowDraft(draft: { term: string; answer: string }) {
  const errors: CrudValidationErrors = {};
  if (!richTextHasContent(draft.term)) errors.term = "Term / item is required.";
  if (!richTextHasContent(draft.answer)) errors.answer = "Answer is required.";
  return errors;
}

export function validateTrueFalseRowDraft(draft: {
  statement: string;
  expectedAnswer: boolean;
  correction: string;
}) {
  const errors: CrudValidationErrors = {};
  if (!richTextHasContent(draft.statement)) errors.statement = "Statement is required.";
  if (!draft.expectedAnswer && !richTextHasContent(draft.correction)) {
    errors.correction = "Correction is required when the answer is False.";
  }
  return errors;
}

type McqOptionLike = { text: string; isCorrect: boolean };

export function validateMcqQuestionDraft(draft: {
  prompt: string;
  answerMode: "single" | "multiple";
  options: McqOptionLike[];
}) {
  const errors: CrudValidationErrors = {};
  if (!richTextHasContent(draft.prompt)) errors.prompt = "Question prompt is required.";
  if (!Array.isArray(draft.options) || draft.options.length < 2) {
    errors.options = "Add at least two answer options.";
    return errors;
  }
  draft.options.forEach((option, index) => {
    if (!richTextHasContent(option.text)) {
      errors[`option:${index}`] = `Option ${index + 1} is required.`;
    }
  });
  const correctCount = draft.options.filter((option) => option.isCorrect).length;
  if (draft.answerMode === "single" && correctCount !== 1) {
    errors.correct = "Single-correct MCQ must have exactly one correct option.";
  } else if (draft.answerMode === "multiple" && correctCount < 1) {
    errors.correct = "Select at least one correct option.";
  }
  return errors;
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function objectRows(document: Record<string, unknown>) {
  return Array.isArray(document.rows)
    ? document.rows.filter(
        (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row),
      )
    : [];
}

function stringField(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" ? (record[key] as string) : "";
}

export function validateQuestionAnswerDocumentJson(
  kind: string,
  documentJson: string,
): CrudValidationErrors {
  const document = parseJsonObject(documentJson);
  if (!document) return { document: "Exercise data is invalid." };
  const rows = objectRows(document);
  const errors: CrudValidationErrors = {};

  rows.forEach((row, index) => {
    const question = stringField(row, "question");
    const answer = stringField(row, "answer");
    const answerRequired = kind !== "rearrange-sentence";
    const rowErrors = validateQuestionAnswerRowDraft(
      { question, answer },
      { answerRequired, questionLabel: kind === "rearrange-sentence" ? "Sentence" : "Question" },
    );
    if (rowErrors.question) errors[`row:${index}:question`] = `Item ${index + 1}: ${rowErrors.question}`;
    if (rowErrors.answer) errors[`row:${index}:answer`] = `Item ${index + 1}: ${rowErrors.answer}`;
  });

  return errors;
}

export function validateMcqDocumentJson(documentJson: string): CrudValidationErrors {
  const document = parseJsonObject(documentJson);
  if (!document) return { document: "MCQ data is invalid." };
  const questions = Array.isArray(document.questions)
    ? document.questions.filter(
        (question): question is Record<string, unknown> =>
          Boolean(question) && typeof question === "object" && !Array.isArray(question),
      )
    : [];
  const errors: CrudValidationErrors = {};

  questions.forEach((question, questionIndex) => {
    const rawOptions = Array.isArray(question.options)
      ? question.options.filter(
          (option): option is Record<string, unknown> =>
            Boolean(option) && typeof option === "object" && !Array.isArray(option),
        )
      : [];
    const answerMode = question.answerMode === "multiple" ? "multiple" : "single";
    const questionErrors = validateMcqQuestionDraft({
      prompt: stringField(question, "prompt"),
      answerMode,
      options: rawOptions.map((option) => ({
        text: stringField(option, "text"),
        isCorrect: option.isCorrect === true,
      })),
    });
    for (const [key, message] of Object.entries(questionErrors)) {
      errors[`question:${questionIndex}:${key}`] = `Question ${questionIndex + 1}: ${message}`;
    }
  });

  return errors;
}

export function validateTrueFalseDocumentJson(documentJson: string): CrudValidationErrors {
  const document = parseJsonObject(documentJson);
  if (!document) return { document: "True / False data is invalid." };
  const rows = objectRows(document);
  const errors: CrudValidationErrors = {};

  rows.forEach((row, index) => {
    const rowErrors = validateTrueFalseRowDraft({
      statement: stringField(row, "statement"),
      expectedAnswer: row.expectedAnswer !== false,
      correction: stringField(row, "correction"),
    });
    for (const [key, message] of Object.entries(rowErrors)) {
      errors[`row:${index}:${key}`] = `Statement ${index + 1}: ${message}`;
    }
  });

  return errors;
}

export function validateInformationTransferDocumentJson(documentJson: string): CrudValidationErrors {
  const document = parseJsonObject(documentJson);
  if (!document) return { document: "Information Transfer data is invalid." };
  if (!Array.isArray(document.rows)) return {};
  const rows = objectRows(document);
  const errors: CrudValidationErrors = {};
  rows.forEach((row, index) => {
    const rowErrors = validateInformationTransferRowDraft({
      term: stringField(row, "term"),
      answer: stringField(row, "answer"),
    });
    for (const [key, message] of Object.entries(rowErrors)) {
      errors[`row:${index}:${key}`] = `Item ${index + 1}: ${message}`;
    }
  });
  return errors;
}

export function validateChangingSentenceAnswerJson(answer: string): CrudValidationErrors {
  const document = parseJsonObject(answer);
  if (!document || !Array.isArray(document.rows)) return {};
  const rows = objectRows(document);
  const errors: CrudValidationErrors = {};
  rows.forEach((row, index) => {
    const rowErrors = validateQuestionAnswerRowDraft({
      question: stringField(row, "question"),
      answer: stringField(row, "answer"),
    });
    for (const [key, message] of Object.entries(rowErrors)) {
      errors[`row:${index}:${key}`] = `Item ${index + 1}: ${message}`;
    }
  });
  return errors;
}

export function validateTagQuestionAnswerJson(answer: string): CrudValidationErrors {
  const document = parseJsonObject(answer);
  if (!document || document.mode !== "items" || !Array.isArray(document.rows)) return {};
  const rows = objectRows(document);
  const errors: CrudValidationErrors = {};
  rows.forEach((row, index) => {
    const rowErrors = validateTagQuestionItemDraft({
      question: stringField(row, "question"),
      answer: stringField(row, "answer"),
    });
    for (const [key, message] of Object.entries(rowErrors)) {
      errors[`row:${index}:${key}`] = `Item ${index + 1}: ${message}`;
    }
  });
  return errors;
}
