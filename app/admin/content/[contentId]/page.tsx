import { notFound } from "next/navigation";

import { ContentBlocksEditorClient } from "@/app/admin/content/[contentId]/ContentBlocksEditorClient";
import type { ContentBlockKind, ContentRecordWithBlocks } from "@/app/admin/content/content-types";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function htmlToPlainText(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countFillBlankMarkers(question: string) {
  return htmlToPlainText(question).match(/_{2,}/g)?.length ?? 0;
}

function parseFillBlankAnswers(answer: string, question: string, recordId: string) {
  const parsed = safeParseJson<
    { blanks?: Array<{ id?: string; sortOrder?: number; answer?: string }> } | null
  >(answer, null);
  const blankCount = countFillBlankMarkers(question);

  let values = Array.isArray(parsed?.blanks)
    ? parsed!.blanks!.map((blank, index) => ({
        id: blank.id || `${recordId}-blank-${index + 1}`,
        sortOrder: index,
        answer: blank.answer || "",
      }))
    : [];

  if (values.length === 0 && answer.trim() && !parsed) {
    const listAnswers = Array.from(answer.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
      .map((match) => htmlToPlainText(match[1] || ""))
      .filter(Boolean);
    const legacyAnswers = listAnswers.length > 0 ? listAnswers : [htmlToPlainText(answer)].filter(Boolean);
    values = legacyAnswers.map((legacyAnswer, index) => ({
      id: `${recordId}-legacy-blank-${index + 1}`,
      sortOrder: index,
      answer: legacyAnswer,
    }));
  }

  return Array.from({ length: blankCount }, (_, index) =>
    values[index] || {
      id: `${recordId}-blank-${index + 1}`,
      sortOrder: index,
      answer: "",
    },
  );
}

function extractSuffixPrefixWords(question: string) {
  return Array.from(question.matchAll(/<u(?:\s[^>]*)?>([\s\S]*?)<\/u>/gi))
    .map((match) => htmlToPlainText(match[1] || ""))
    .filter(Boolean);
}

function parseSuffixPrefixItems(answer: string, question: string, recordId: string) {
  const parsed = safeParseJson<{
    version?: number;
    items?: Array<{ id?: string; sortOrder?: number; word?: string; answer?: string }>;
  } | null>(answer, null);
  const words = extractSuffixPrefixWords(question);
  const structuredItems = Array.isArray(parsed?.items) ? parsed!.items! : [];
  const legacyAnswer = answer.trim() && !parsed ? htmlToPlainText(answer) : "";

  return words.map((word, index) => ({
    id: structuredItems[index]?.id || `${recordId}-suffix-prefix-${index + 1}`,
    sortOrder: index,
    word,
    answer: structuredItems[index]?.answer || (index === 0 ? legacyAnswer : ""),
  }));
}

function parseQuestionAnswerDocument(documentJson: string) {
  return safeParseJson<{
    version?: number;
    passageSource?: "manual" | "paragraph";
    paragraphBlockId?: string | null;
    rows?: Array<{ id: string; sortOrder: number; question?: string; answer?: string }>;
  }>(documentJson, {
    version: 2,
    passageSource: "manual",
    paragraphBlockId: null,
    rows: [],
  });
}

function parseChangingSentenceRows(answer: string, question: string, recordId: string) {
  const parsed = safeParseJson<{
    version?: number;
    rows?: Array<{ id?: string; sortOrder?: number; question?: string; answer?: string }>;
  } | null>(answer, null);

  const rows = Array.isArray(parsed?.rows)
    ? parsed!.rows!.map((row, index) => ({
        id: row.id || `${recordId}-row-${index + 1}`,
        sortOrder: index,
        question: row.question || "",
        answer: row.answer || "",
      }))
    : [];

  if (rows.length > 0) return rows;

  // Backward compatibility for the old combined Question + Answer fields.
  if (question.trim() || (answer.trim() && !parsed)) {
    return [{
      id: `${recordId}-legacy-row-1`,
      sortOrder: 0,
      question,
      answer: parsed ? "" : answer,
    }];
  }

  return [];
}

function parseTagQuestionData(answer: string, question: string, recordId: string) {
  const parsed = safeParseJson<{
    version?: number;
    mode?: "items" | "paragraph";
    rows?: Array<{ id?: string; sortOrder?: number; question?: string; answer?: string }>;
    blanks?: Array<{ id?: string; sortOrder?: number; answer?: string }>;
  } | null>(answer, null);

  const isStructured = Boolean(
    parsed &&
      (parsed.mode === "items" ||
        parsed.mode === "paragraph" ||
        Array.isArray(parsed.rows) ||
        Array.isArray(parsed.blanks)),
  );

  let rows = Array.isArray(parsed?.rows)
    ? parsed!.rows!.map((row, index) => ({
        id: row.id || `${recordId}-row-${index + 1}`,
        sortOrder: index,
        question: row.question || "",
        answer: row.answer || "",
      }))
    : [];

  // Backward compatibility: old Tag Question records used one combined
  // question + answer pair. Treat it as the first per-item row.
  if (rows.length === 0 && !isStructured && (question.trim() || answer.trim())) {
    rows = [{
      id: `${recordId}-legacy-row-1`,
      sortOrder: 0,
      question,
      answer,
    }];
  }

  return {
    mode: parsed?.mode === "paragraph" ? "paragraph" as const : "items" as const,
    rows,
    blanks: parseFillBlankAnswers(answer, question, recordId),
  };
}

function parseTableCompletionDocument(documentJson: string, recordId: string) {
  const parsed = safeParseJson<{
    version?: number;
    columns?: Array<{ id?: string; label?: string; sortOrder?: number }>;
    rows?: Array<{
      id?: string;
      sortOrder?: number;
      cells?: Array<{
        id?: string;
        columnId?: string;
        mode?: "text" | "answer";
        text?: string;
        answer?: string;
      }>;
    }>;
    answers?: Array<{
      id?: string;
      sortOrder?: number;
      selections?: Array<{ columnId?: string; cellId?: string }>;
    }>;
  }>(documentJson, {});

  const sourceColumns = Array.isArray(parsed.columns) ? parsed.columns : [];
  const columns = (sourceColumns.length >= 2 ? sourceColumns : [
    { id: `${recordId}-column-1`, label: "Column 1", sortOrder: 0 },
    { id: `${recordId}-column-2`, label: "Column 2", sortOrder: 1 },
  ]).map((column, index) => ({
    id: column.id || `${recordId}-column-${index + 1}`,
    label: column.label || `Column ${index + 1}`,
    sortOrder: index,
  }));

  const rows = (Array.isArray(parsed.rows) ? parsed.rows : [])
    .filter((row) => Array.isArray(row.cells))
    .map((row, rowIndex) => ({
      id: row.id || `${recordId}-row-${rowIndex + 1}`,
      sortOrder: rowIndex,
      cells: columns.map((column, columnIndex) => {
        const source = row.cells?.find((cell) => cell.columnId === column.id) || row.cells?.[columnIndex];
        return {
          id: source?.id || `${recordId}-row-${rowIndex + 1}-cell-${columnIndex + 1}`,
          columnId: column.id,
          mode: source?.mode === "answer" ? "answer" as const : "text" as const,
          text: source?.text || "",
          answer: source?.answer || "",
        };
      }),
    }));

  const sourceAnswers = Array.isArray(parsed.answers) ? parsed.answers : [];
  const answers = sourceAnswers.map((answer, answerIndex) => ({
    id: answer.id || `${recordId}-answer-${answerIndex + 1}`,
    sortOrder: answerIndex,
    selections: columns.map((column) => {
      const selection = answer.selections?.find((item) => item.columnId === column.id);
      const selectedCellExists = rows.some((row) =>
        row.cells.some((cell) => cell.id === selection?.cellId && cell.columnId === column.id),
      );
      return {
        columnId: column.id,
        cellId: selectedCellExists ? selection?.cellId || "" : "",
      };
    }),
  }));

  const adminAnswers = rows.map((_, answerIndex) =>
    answers[answerIndex] || {
      id: `${recordId}-answer-${answerIndex + 1}`,
      sortOrder: answerIndex,
      selections: columns.map((column) => ({ columnId: column.id, cellId: "" })),
    },
  );

  return {
    version: 2 as const,
    columns,
    rows,
    answers: adminAnswers,
  };
}

function substitutionColumnLabel(index: number) {
  return index < 26 ? `Column ${String.fromCharCode(65 + index)}` : `Column ${index + 1}`;
}

function parseSubstitutionTableDocument(answer: string, recordId: string) {
  const parsed = safeParseJson<{
    version?: number;
    columns?: Array<{ id?: string; label?: string; sortOrder?: number }>;
    rows?: Array<{
      id?: string;
      sortOrder?: number;
      cells?: Array<{ id?: string; columnId?: string; text?: string }>;
    }>;
    answers?: Array<{
      id?: string;
      sortOrder?: number;
      selections?: Array<{ columnId?: string; cellId?: string }>;
      sentence?: string;
    }>;
  } | null>(answer, null);

  const sourceColumns = Array.isArray(parsed?.columns) ? parsed!.columns! : [];
  const columns = (sourceColumns.length >= 2
    ? sourceColumns
    : Array.from({ length: 3 }, (_, index) => ({
        id: `${recordId}-column-${index + 1}`,
        label: substitutionColumnLabel(index),
        sortOrder: index,
      }))).map((column, index) => ({
    id: column.id || `${recordId}-column-${index + 1}`,
    label: column.label || substitutionColumnLabel(index),
    sortOrder: index,
  }));

  const rows = (Array.isArray(parsed?.rows) ? parsed!.rows! : []).map((row, rowIndex) => ({
    id: row.id || `${recordId}-row-${rowIndex + 1}`,
    sortOrder: rowIndex,
    cells: columns.map((column, columnIndex) => {
      const source = row.cells?.find((cell) => cell.columnId === column.id) || row.cells?.[columnIndex];
      return {
        id: source?.id || `${recordId}-row-${rowIndex + 1}-cell-${columnIndex + 1}`,
        columnId: column.id,
        text: source?.text || "",
      };
    }),
  }));

  const answers = (Array.isArray(parsed?.answers) ? parsed!.answers! : []).map((answerItem, answerIndex) => ({
    id: answerItem.id || `${recordId}-answer-${answerIndex + 1}`,
    sortOrder: answerIndex,
    selections: columns.map((column) => {
      const selection = answerItem.selections?.find((item) => item.columnId === column.id);
      const selectedCellExists = rows.some((row) =>
        row.cells.some((cell) => cell.id === selection?.cellId && cell.columnId === column.id && cell.text.trim()),
      );
      return {
        columnId: column.id,
        cellId: selectedCellExists ? selection?.cellId || "" : "",
      };
    }),
    sentence: answerItem.sentence || "",
  }));

  return {
    version: 1 as const,
    columns,
    rows,
    answers,
  };
}

function parseInformationTransferDocument(documentJson: string) {
  return safeParseJson<{
    version?: number;
    blanks?: Array<{ id?: string; sortOrder?: number; answer?: string }>;
    rows?: Array<{ id: string; sortOrder: number; term?: string; answer?: string }>;
  }>(documentJson, { blanks: [], rows: [] });
}

function buildInformationTransferLegacyQuestion(
  rows: Array<{ term?: string }>,
) {
  return rows
    .map((row, index) => {
      const term = row.term?.trim() || `Item ${index + 1}`;
      return `<div>${term} ${"____"}</div>`;
    })
    .join("");
}

function normalizeInformationTransferRecord(record: {
  id: string;
  question: string;
  answer: string;
  documentJson: string;
}) {
  const parsed = parseInformationTransferDocument(record.documentJson);
  const legacyRows = Array.isArray(parsed.rows) ? parsed.rows : [];
  let question = record.question || "";

  let sourceBlanks = Array.isArray(parsed.blanks)
    ? parsed.blanks.map((blank, index) => ({
        id: blank.id || `${record.id}-blank-${index + 1}`,
        sortOrder: index,
        answer: blank.answer || "",
      }))
    : [];

  // Backward compatibility for the earlier item-based Information Transfer editor.
  // The old term/answer pairs become one visual blank per term without deleting data.
  if (sourceBlanks.length === 0 && legacyRows.length > 0) {
    if (countFillBlankMarkers(question) === 0) {
      question = buildInformationTransferLegacyQuestion(legacyRows);
    }
    sourceBlanks = legacyRows.map((row, index) => ({
      id: row.id || `${record.id}-legacy-blank-${index + 1}`,
      sortOrder: index,
      answer: htmlToPlainText(row.answer || ""),
    }));
  }

  // Older three-field data is also preserved as the first blank.
  if (sourceBlanks.length === 0 && (question.trim() || record.answer.trim())) {
    if (countFillBlankMarkers(question) === 0) {
      question = `${question}<p>____</p>`;
    }
    sourceBlanks = [{
      id: `${record.id}-legacy-blank-1`,
      sortOrder: 0,
      answer: htmlToPlainText(record.answer),
    }];
  }

  let blankCount = countFillBlankMarkers(question);
  if (blankCount === 0 && sourceBlanks.length > 0) {
    question = `${question}${sourceBlanks.map(() => "<p>____</p>").join("")}`;
    blankCount = sourceBlanks.length;
  }

  const blanks = Array.from({ length: blankCount }, (_, index) =>
    sourceBlanks[index] || {
      id: `${record.id}-blank-${index + 1}`,
      sortOrder: index,
      answer: "",
    },
  ).map((blank, index) => ({ ...blank, sortOrder: index }));

  return {
    question,
    blanks,
    rows: legacyRows.map((row, index) => ({
      id: row.id,
      sortOrder: index,
      term: row.term || "",
      answer: row.answer || "",
    })),
  };
}

function parseTrueFalseDocument(documentJson: string) {
  return safeParseJson<
    {
      rows?: Array<{
        id: string;
        sortOrder: number;
        statement?: string;
        expectedAnswer?: boolean;
        correction?: string;
      }>;
    }
  >(documentJson, { rows: [] });
}

function parseMcqDocument(documentJson: string) {
  return safeParseJson<
    {
      questions?: Array<{
        id: string;
        prompt: string;
        answerMode: "single" | "multiple";
        sortOrder: number;
        options?: Array<{
          id: string;
          label: string;
          text: string;
          isCorrect: boolean;
          sortOrder: number;
        }>;
      }>;
    }
  >(documentJson, { questions: [] });
}

export default async function AdminContentBlocksPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string }>;
  searchParams: Promise<{ editorMode?: string }>;
}) {
  const user = await requireAdmin();
  const { contentId } = await params;
  const { editorMode } = await searchParams;

  const content = await prisma.content.findFirst({
    where: {
      id: contentId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      classId: true,
      subjectId: true,
      unitId: true,
      lessonId: true,
      topicId: true,
      createdAt: true,
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      unit: { select: { id: true, title: true } },
      lesson: { select: { id: true, title: true } },
      topic: { select: { id: true, title: true } },
      blocks: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          contentId: true,
          kind: true,
          sortOrder: true,
          paragraph: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              body: true,
            },
          },
          vocabulary: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              passage: true,
              passageSource: true,
              paragraphBlockId: true,
              entries: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                select: {
                  id: true,
                  vocabularyId: true,
                  word: true,
                  meaning: true,
                  sortOrder: true,
                },
              },
            },
          },
          synonymsAntonyms: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              passage: true,
              passageSource: true,
              paragraphBlockId: true,
              entries: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                select: {
                  id: true,
                  synonymsAntonymsId: true,
                  word: true,
                  meanings: true,
                  synonyms: true,
                  antonyms: true,
                  details: true,
                  sortOrder: true,
                },
              },
            },
          },
          gapFillExercise: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              passage: true,
              passageSource: true,
              paragraphBlockId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
          gapFillFirstPaper: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              passage: true,
              passageSource: true,
              paragraphBlockId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
          gapFillSecondPaper: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
          mcqSection: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              passage: true,
              passageSource: true,
              paragraphBlockId: true,
              title: true,
              description: true,
              documentJson: true,
            },
          },
          questionAnswerExercise: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              title: true,
              instruction: true,
              question: true,
              answer: true,
              details: true,
              documentJson: true,
            },
          },
          tableCompletionExercise: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              title: true,
              instruction: true,
              question: true,
              answer: true,
              details: true,
              documentJson: true,
            },
          },
          columnMatchingExercise: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              title: true,
              instruction: true,
              question: true,
              answer: true,
              details: true,
              documentJson: true,
            },
          },
          sentenceOrderingExercise: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              title: true,
              instruction: true,
              question: true,
              answer: true,
              details: true,
              documentJson: true,
            },
          },
          trueFalseExercise: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              title: true,
              instruction: true,
              passage: true,
              documentJson: true,
            },
          },
          informationTransfer: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              question: true,
              answer: true,
              details: true,
              documentJson: true,
            },
          },
          substitutionTable: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
          rightFormOfVerb: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
          narration: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
          changingSentence: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
          punctuationAndCapitalization: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
          preposition: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
          suffixAndPrefix: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
          tagQuestion: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
          connector: {
            select: {
              id: true,
              contentBlockId: true,
              contentId: true,
              classId: true,
              subjectId: true,
              unitId: true,
              lessonId: true,
              topicId: true,
              question: true,
              answer: true,
              details: true,
            },
          },
        },
      },
    },
  });

  if (!content) {
    notFound();
  }

  const typedContent: ContentRecordWithBlocks = {
    ...content,
    blocks: content.blocks.map((block) => ({
      ...block,
      kind: block.kind as ContentRecordWithBlocks["blocks"][number]["kind"],
      vocabulary: block.vocabulary
        ? {
            ...block.vocabulary,
            passageSource: block.vocabulary.passageSource === "paragraph" ? "paragraph" as const : "manual" as const,
            paragraphBlockId: block.vocabulary.paragraphBlockId || null,
          }
        : null,
      synonymsAntonyms: block.synonymsAntonyms
        ? {
            ...block.synonymsAntonyms,
            passageSource: block.synonymsAntonyms.passageSource === "paragraph" ? "paragraph" as const : "manual" as const,
            paragraphBlockId: block.synonymsAntonyms.paragraphBlockId || null,
          }
        : null,
      mcqSection: block.mcqSection
        ? {
            ...block.mcqSection,
            passageSource: block.mcqSection.passageSource === "paragraph" ? "paragraph" as const : "manual" as const,
            paragraphBlockId: block.mcqSection.paragraphBlockId || null,
            questions: (parseMcqDocument(block.mcqSection.documentJson).questions || []).map((question) => ({
              ...question,
              options: question.options || [],
            })),
          }
        : null,
      questionAnswerExercise: (() => {
        const exercise =
          block.kind === "question-answer"
            ? block.questionAnswerExercise
            : block.kind === "table-completion"
              ? block.tableCompletionExercise
              : block.kind === "column-matching"
                ? block.columnMatchingExercise
                : block.kind === "sentence-ordering"
                  ? block.sentenceOrderingExercise
                  : null;

        if (!exercise) return null;

        const questionAnswerDocument = parseQuestionAnswerDocument(exercise.documentJson);
        const rows = block.kind === "table-completion"
          ? []
          : (questionAnswerDocument.rows || []).map((row) => ({
              id: row.id,
              sortOrder: row.sortOrder,
              question: row.question || "",
              answer: row.answer || "",
            }));

        if (
          rows.length === 0 &&
          (block.kind === "question-answer" || block.kind === "sentence-ordering") &&
          (exercise.question.trim() || exercise.answer.trim())
        ) {
          rows.push({
            id: `legacy-${exercise.id}`,
            sortOrder: 0,
            question: exercise.question,
            answer: exercise.answer,
          });
        }

        return {
          ...exercise,
          passageSource:
            block.kind === "question-answer" && questionAnswerDocument.passageSource === "paragraph"
              ? "paragraph" as const
              : "manual" as const,
          paragraphBlockId:
            block.kind === "question-answer" && typeof questionAnswerDocument.paragraphBlockId === "string"
              ? questionAnswerDocument.paragraphBlockId
              : null,
          rows,
          table: block.kind === "table-completion"
            ? parseTableCompletionDocument(exercise.documentJson, exercise.id)
            : undefined,
        };
      })(),
      trueFalseExercise: block.trueFalseExercise
        ? {
            ...block.trueFalseExercise,
            rows: (parseTrueFalseDocument(block.trueFalseExercise.documentJson).rows || []).map((row) => ({
              id: row.id,
              sortOrder: row.sortOrder,
              statement: row.statement || "",
              expectedAnswer: Boolean(row.expectedAnswer),
              correction: row.correction || "",
            })),
          }
        : null,
      informationTransfer: block.informationTransfer
        ? (() => {
            const normalized = normalizeInformationTransferRecord(block.informationTransfer);
            return {
              ...block.informationTransfer,
              question: normalized.question,
              rows: normalized.rows,
              blanks: normalized.blanks,
            };
          })()
        : null,
      substitutionTable: block.substitutionTable
        ? {
            ...block.substitutionTable,
            table: parseSubstitutionTableDocument(block.substitutionTable.answer, block.substitutionTable.id),
          }
        : null,
      gapFill: block.gapFillExercise
        ? {
            ...block.gapFillExercise,
            passageSource: block.gapFillExercise.passageSource === "paragraph" ? "paragraph" as const : "manual" as const,
            paragraphBlockId: block.gapFillExercise.paragraphBlockId || null,
          }
        : null,
      gapFillFirstPaper: block.gapFillFirstPaper
        ? {
            ...block.gapFillFirstPaper,
            passageSource: block.gapFillFirstPaper.passageSource === "paragraph" ? "paragraph" as const : "manual" as const,
            paragraphBlockId: block.gapFillFirstPaper.paragraphBlockId || null,
            blanks: parseFillBlankAnswers(
              block.gapFillFirstPaper.answer,
              block.gapFillFirstPaper.question,
              block.gapFillFirstPaper.id,
            ),
          }
        : null,
      gapFillSecondPaper: block.gapFillSecondPaper
        ? {
            ...block.gapFillSecondPaper,
            blanks: parseFillBlankAnswers(
              block.gapFillSecondPaper.answer,
              block.gapFillSecondPaper.question,
              block.gapFillSecondPaper.id,
            ),
          }
        : null,
      rightFormOfVerb: block.rightFormOfVerb
        ? {
            ...block.rightFormOfVerb,
            blanks: parseFillBlankAnswers(
              block.rightFormOfVerb.answer,
              block.rightFormOfVerb.question,
              block.rightFormOfVerb.id,
            ),
          }
        : null,
      changingSentence: block.changingSentence
        ? {
            ...block.changingSentence,
            rows: parseChangingSentenceRows(
              block.changingSentence.answer,
              block.changingSentence.question,
              block.changingSentence.id,
            ),
          }
        : null,
      preposition: block.preposition
        ? {
            ...block.preposition,
            blanks: parseFillBlankAnswers(
              block.preposition.answer,
              block.preposition.question,
              block.preposition.id,
            ),
          }
        : null,
      suffixAndPrefix: block.suffixAndPrefix
        ? {
            ...block.suffixAndPrefix,
            items: parseSuffixPrefixItems(
              block.suffixAndPrefix.answer,
              block.suffixAndPrefix.question,
              block.suffixAndPrefix.id,
            ),
          }
        : null,
      tagQuestion: block.tagQuestion
        ? (() => {
            const parsed = parseTagQuestionData(
              block.tagQuestion.answer,
              block.tagQuestion.question,
              block.tagQuestion.id,
            );
            return {
              ...block.tagQuestion,
              mode: parsed.mode,
              rows: parsed.rows,
              blanks: parsed.blanks,
            };
          })()
        : null,
      connector: block.connector
        ? {
            ...block.connector,
            blanks: parseFillBlankAnswers(
              block.connector.answer,
              block.connector.question,
              block.connector.id,
            ),
          }
        : null,
    })),
  };

  const allowedBlockKinds: ContentBlockKind[] | undefined =
    editorMode === "seen-composition"
      ? [
          "paragraph",
          "mcq",
          "question-answer",
          "gap-fill-first-paper",
          "vocabulary",
          "synonyms-antonyms",
        ]
      : undefined;

  return (
    <ContentBlocksEditorClient
      content={typedContent}
      allowedBlockKindsOverride={allowedBlockKinds}
      blockTitleOverrides={editorMode === "seen-composition" ? { paragraph: "Passage" } : undefined}
    />
  );
}
