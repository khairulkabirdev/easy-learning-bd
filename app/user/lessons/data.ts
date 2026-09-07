import type { QuestionAnswerExerciseLayoutKind } from "@/app/admin/content/content-types";
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

const contentSelect = {
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
      paragraph: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, body: true } },
      vocabulary: {
        select: {
          id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true,
          entries: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, vocabularyId: true, word: true, meaning: true, sortOrder: true } },
        },
      },
      synonymsAntonyms: {
        select: {
          id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true,
          entries: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { id: true, synonymsAntonymsId: true, word: true, meanings: true, synonyms: true, antonyms: true, details: true, sortOrder: true },
          },
        },
      },
      gapFillExercise: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      gapFillFirstPaper: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      gapFillSecondPaper: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      mcqSection: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, title: true, description: true, documentJson: true } },
      questionAnswerExercise: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, title: true, instruction: true, question: true, answer: true, details: true, layoutKind: true, documentJson: true } },
      trueFalseExercise: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, title: true, instruction: true, passage: true, documentJson: true } },
      informationTransfer: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      substitutionTable: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      rightFormOfVerb: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      narration: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      changingSentence: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      punctuationAndCapitalization: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      preposition: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      suffixAndPrefix: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      tagQuestion: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
      connector: { select: { id: true, contentBlockId: true, contentId: true, classId: true, subjectId: true, unitId: true, lessonId: true, topicId: true, question: true, answer: true, details: true } },
    },
  },
};

function serializeContents(contents: Array<any>) {
  return contents.map((content) => ({
    ...content,
    createdAt: content.createdAt.toISOString(),
    blocks: content.blocks.map((block: any) => ({
      ...block,
      mcqSection: block.mcqSection
        ? { ...block.mcqSection, questions: (parseMcqDocument(block.mcqSection.documentJson).questions || []).map((question) => ({ ...question, options: question.options || [] })) }
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
      gapFill: block.gapFillExercise ?? block.gapFill,
      gapFillFirstPaper: block.gapFillFirstPaper,
      gapFillSecondPaper: block.gapFillSecondPaper,
    })),
  }));
}

export async function getPublishedSubjectCards(organizationId: string) {
  return prisma.subject.findMany({
    where: { organizationId, status: "published" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      classId: true,
      name: true,
      iconType: true,
      iconLibrary: true,
      iconName: true,
      iconColor: true,
      imagePath: true,
      class: { select: { id: true, name: true } },
      _count: { select: { units: true } },
    },
  });
}

export async function getPublishedClassCards(organizationId: string) {
  return prisma.class.findMany({
    where: { organizationId, status: "published" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      iconType: true,
      iconLibrary: true,
      iconName: true,
      iconColor: true,
      imagePath: true,
      _count: { select: { subjects: true } },
    },
  });
}

export async function getPublishedClassSubjects(organizationId: string, classId: string) {
  const classItem = await prisma.class.findFirst({
    where: { id: classId, organizationId, status: "published" },
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      iconType: true,
      iconLibrary: true,
      iconName: true,
      iconColor: true,
      imagePath: true,
    },
  });

  if (!classItem) return null;

  const subjects = await prisma.subject.findMany({
    where: { organizationId, classId, status: "published" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      classId: true,
      name: true,
      iconType: true,
      iconLibrary: true,
      iconName: true,
      iconColor: true,
      imagePath: true,
      _count: { select: { units: true } },
    },
  });

  return { classItem, subjects };
}

export async function getPublishedSubjectDetail(organizationId: string, classId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, classId, organizationId, status: "published" },
    select: {
      id: true,
      classId: true,
      name: true,
      iconType: true,
      iconLibrary: true,
      iconName: true,
      iconColor: true,
      imagePath: true,
      class: { select: { id: true, name: true } },
    },
  });

  if (!subject) return null;

  const units = await prisma.unit.findMany({
    where: { organizationId, subjectId, status: "published" },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      classId: true,
      subjectId: true,
      title: true,
      unitNumber: true,
      iconType: true,
      iconLibrary: true,
      iconName: true,
      iconColor: true,
      imagePath: true,
    },
  });

  const lessons = await prisma.lesson.findMany({
    where: { organizationId, unitId: { in: units.map((unit) => unit.id) }, status: "published" },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, unitId: true, title: true, lessonNumber: true },
  });

  const topics = await prisma.topic.findMany({
    where: { organizationId, lessonId: { in: lessons.map((lesson) => lesson.id) }, status: "published" },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      lessonId: true,
      title: true,
      topicNumber: true,
      iconType: true,
      iconLibrary: true,
      iconName: true,
      iconColor: true,
      imagePath: true,
    },
  });

  const contents = await prisma.content.findMany({
    where: {
      organizationId,
      subjectId,
      unitId: { in: units.map((unit) => unit.id) },
      lessonId: { in: lessons.map((lesson) => lesson.id) },
    },
    orderBy: [{ createdAt: "desc" }],
    select: contentSelect as any,
  });

  const publishedLessonIds = new Set(lessons.map((lesson) => lesson.id));
  const publishedTopicIds = new Set(topics.map((topic) => topic.id));
  const filteredContents = contents.filter(
    (content: any) => publishedLessonIds.has(content.lessonId) && (!content.topicId || publishedTopicIds.has(content.topicId)),
  );

  return { subject, units, lessons, topics, contents: serializeContents(filteredContents) };
}

export async function getPublishedContentById(organizationId: string, contentId: string) {
  const content = await prisma.content.findFirst({
    where: {
      id: contentId,
      organizationId,
      blocks: { some: { kind: "mcq" } },
    },
    select: contentSelect as any,
  });

  if (!content) return null;

  return serializeContents([content])[0] ?? null;
}
