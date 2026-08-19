import { notFound } from "next/navigation";

import { ContentBlocksEditorClient } from "@/app/admin/content/[contentId]/ContentBlocksEditorClient";
import type { ContentRecordWithBlocks, QuestionAnswerExerciseLayoutKind } from "@/app/admin/content/content-types";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseQuestionAnswerDocument(documentJson: string) {
  return safeParseJson<{ rows?: Array<{ id: string; sortOrder: number; question?: string; answer?: string }> }>(
    documentJson,
    { rows: [] },
  );
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
}: {
  params: Promise<{ contentId: string }>;
}) {
  const user = await requireAdmin();
  const { contentId } = await params;

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
              layoutKind: true,
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
      mcqSection: block.mcqSection
        ? {
            ...block.mcqSection,
            questions: (parseMcqDocument(block.mcqSection.documentJson).questions || []).map((question) => ({
              ...question,
              options: question.options || [],
            })),
          }
        : null,
      questionAnswerExercise: block.questionAnswerExercise
        ? {
            ...block.questionAnswerExercise,
            layoutKind: block.questionAnswerExercise.layoutKind as QuestionAnswerExerciseLayoutKind,
            rows: (parseQuestionAnswerDocument(block.questionAnswerExercise.documentJson).rows || []).map((row) => ({
              id: row.id,
              sortOrder: row.sortOrder,
              question: row.question || "",
              answer: row.answer || "",
            })),
          }
        : null,
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
      gapFill: block.gapFillExercise,
      gapFillFirstPaper: block.gapFillFirstPaper,
      gapFillSecondPaper: block.gapFillSecondPaper,
    })),
  };

  return <ContentBlocksEditorClient content={typedContent} />;
}
