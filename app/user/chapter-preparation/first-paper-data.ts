import { prisma } from "@/lib/db";

export const FIRST_PAPER_SECTION_SLUGS = [
  "seen-composition",
  "unseen-composition",
  "matching-sentences",
  "rearrange-sentence",
  "question-from-poems",
  "question-from-story",
] as const;

export type FirstPaperSectionSlug = (typeof FIRST_PAPER_SECTION_SLUGS)[number];

export function isFirstPaperSectionSlug(value: string): value is FirstPaperSectionSlug {
  return FIRST_PAPER_SECTION_SLUGS.includes(value as FirstPaperSectionSlug);
}

export async function getPublishedSubjectMeta(
  organizationId: string,
  classId: string,
  subjectId: string,
) {
  return prisma.subject.findFirst({
    where: {
      id: subjectId,
      classId,
      organizationId,
      status: "published",
    },
    select: {
      id: true,
      classId: true,
      name: true,
      slug: true,
      code: true,
      class: { select: { id: true, name: true } },
    },
  });
}

export const SEEN_PASSAGE_KINDS = ["seen-passage-one", "seen-passage-two"] as const;

export type SeenPassageKind = (typeof SEEN_PASSAGE_KINDS)[number];

export function seenPassageKindFromParam(value: string): SeenPassageKind | null {
  if (value === "1") return "seen-passage-one";
  if (value === "2") return "seen-passage-two";
  return null;
}

export function seenPassageParamFromKind(kind: SeenPassageKind): "1" | "2" {
  return kind === "seen-passage-one" ? "1" : "2";
}

export async function getSeenCompositionUnits(
  organizationId: string,
  classId: string,
  subjectId: string,
  passageKind: SeenPassageKind,
) {
  return prisma.unit.findMany({
    where: {
      organizationId,
      classId,
      subjectId,
      status: "published",
      contents: {
        some: {
          organizationId,
          classId,
          subjectId,
          blocks: { some: { kind: passageKind } },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      unitNumber: true,
      iconType: true,
      iconName: true,
      iconColor: true,
      imagePath: true,
    },
  });
}

export async function getSeenCompositionLessons(
  organizationId: string,
  classId: string,
  subjectId: string,
  unitId: string,
  passageKind: SeenPassageKind,
) {
  return prisma.lesson.findMany({
    where: {
      organizationId,
      unitId,
      status: "published",
      contents: {
        some: {
          organizationId,
          classId,
          subjectId,
          unitId,
          blocks: { some: { kind: passageKind } },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, unitId: true, title: true, lessonNumber: true },
  });
}

type SeenListInput = {
  organizationId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  passageKind: SeenPassageKind;
  query?: string;
  page?: number;
  pageSize?: number;
};

export async function getSeenCompositionPage(input: SeenListInput) {
  const pageSize = Math.min(Math.max(input.pageSize ?? 10, 1), 50);
  const page = Math.max(input.page ?? 1, 1);
  const where = {
    organizationId: input.organizationId,
    classId: input.classId,
    subjectId: input.subjectId,
    unitId: input.unitId,
    lessonId: input.lessonId,
    ...(input.query?.trim() ? { title: { contains: input.query.trim() } } : {}),
    blocks: {
      some: {
        kind: input.passageKind,
      },
    },
  };

  const [total, rows] = await Promise.all([
    prisma.content.count({ where }),
    prisma.content.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        createdAt: true,
        unit: { select: { id: true, title: true } },
        lesson: { select: { id: true, title: true } },
        topic: { select: { id: true, title: true } },
        _count: { select: { blocks: true } },
      },
    }),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      unit: row.unit,
      lesson: row.lesson,
      topic: row.topic,
      blocksCount: row._count.blocks,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type SeenCompositionNextStep =
  | { type: "content"; contentId: string }
  | { type: "lesson"; lessonId: string; lessonTitle: string }
  | { type: "end" };

export async function getSeenCompositionNextStep(input: {
  organizationId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  passageKind: SeenPassageKind;
  currentContentId: string;
}): Promise<SeenCompositionNextStep> {
  const current = await prisma.content.findFirst({
    where: {
      id: input.currentContentId,
      organizationId: input.organizationId,
      classId: input.classId,
      subjectId: input.subjectId,
      unitId: input.unitId,
      lessonId: input.lessonId,
      blocks: { some: { kind: input.passageKind } },
    },
    select: { id: true, createdAt: true },
  });

  if (!current) return { type: "end" };

  const nextContent = await prisma.content.findFirst({
    where: {
      organizationId: input.organizationId,
      classId: input.classId,
      subjectId: input.subjectId,
      unitId: input.unitId,
      lessonId: input.lessonId,
      blocks: { some: { kind: input.passageKind } },
      OR: [
        { createdAt: { lt: current.createdAt } },
        { createdAt: current.createdAt, id: { lt: current.id } },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });

  if (nextContent) {
    return { type: "content", contentId: nextContent.id };
  }

  const lessons = await getSeenCompositionLessons(
    input.organizationId,
    input.classId,
    input.subjectId,
    input.unitId,
    input.passageKind,
  );
  const currentLessonIndex = lessons.findIndex((lesson) => lesson.id === input.lessonId);
  const nextLesson = currentLessonIndex >= 0 ? lessons[currentLessonIndex + 1] : undefined;

  if (nextLesson) {
    return { type: "lesson", lessonId: nextLesson.id, lessonTitle: nextLesson.title };
  }

  return { type: "end" };
}

export type SubjectPracticeListItem = {
  id: string;
  title: string;
  sortOrder: number;
  updatedAt: string;
};

type SubjectPracticePageInput = {
  kind: Exclude<FirstPaperSectionSlug, "seen-composition">;
  organizationId: string;
  classId: string;
  subjectId: string;
  query?: string;
  page?: number;
  pageSize?: number;
};

export async function getSubjectPracticePage(input: SubjectPracticePageInput) {
  const pageSize = Math.min(Math.max(input.pageSize ?? 10, 1), 50);
  const page = Math.max(input.page ?? 1, 1);
  const commonWhere = {
    organizationId: input.organizationId,
    classId: input.classId,
    subjectId: input.subjectId,
    ...(input.query?.trim() ? { title: { contains: input.query.trim() } } : {}),
  };

  let total = 0;
  let rows: SubjectPracticeListItem[] = [];

  if (input.kind === "unseen-composition") {
    const [count, records] = await Promise.all([
      prisma.unseenComposition.count({ where: commonWhere }),
      prisma.unseenComposition.findMany({
        where: commonWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, title: true, updatedAt: true },
      }),
    ]);
    total = count;
    rows = records.map((record, index) => ({
      id: record.id,
      title: record.title,
      sortOrder: (page - 1) * pageSize + index,
      updatedAt: record.updatedAt.toISOString(),
    }));
  } else {
    const args = {
      where: commonWhere,
      orderBy: [{ sortOrder: "asc" as const }, { updatedAt: "desc" as const }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, title: true, sortOrder: true, updatedAt: true },
    };

    if (input.kind === "matching-sentences") {
      const [count, records] = await Promise.all([
        prisma.subjectMatchingSentencesBlock.count({ where: commonWhere }),
        prisma.subjectMatchingSentencesBlock.findMany({
          ...args,
          // A stable tie-breaker keeps "Next" in exactly the list's order.
          orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
        }),
      ]);
      total = count;
      rows = records.map((record) => ({ ...record, updatedAt: record.updatedAt.toISOString() }));
    } else if (input.kind === "rearrange-sentence") {
      const [count, records] = await Promise.all([
        prisma.subjectRearrangeSentenceBlock.count({ where: commonWhere }),
        prisma.subjectRearrangeSentenceBlock.findMany({
          ...args,
          orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
        }),
      ]);
      total = count;
      rows = records.map((record) => ({ ...record, updatedAt: record.updatedAt.toISOString() }));
    } else if (input.kind === "question-from-poems") {
      const [count, records] = await Promise.all([
        prisma.subjectQuestionFromPoemsBlock.count({ where: commonWhere }),
        prisma.subjectQuestionFromPoemsBlock.findMany({
          ...args,
          orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
        }),
      ]);
      total = count;
      rows = records.map((record) => ({ ...record, updatedAt: record.updatedAt.toISOString() }));
    } else {
      const [count, records] = await Promise.all([
        prisma.subjectQuestionFromStoryBlock.count({ where: commonWhere }),
        prisma.subjectQuestionFromStoryBlock.findMany({
          ...args,
          orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
        }),
      ]);
      total = count;
      rows = records.map((record) => ({ ...record, updatedAt: record.updatedAt.toISOString() }));
    }
  }

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getSubjectPracticeRecord(
  kind: Exclude<FirstPaperSectionSlug, "seen-composition">,
  organizationId: string,
  classId: string,
  subjectId: string,
  recordId: string,
) {
  const where = { id: recordId, organizationId, classId, subjectId };

  if (kind === "unseen-composition") {
    return prisma.unseenComposition.findFirst({ where });
  }
  if (kind === "matching-sentences") {
    return prisma.subjectMatchingSentencesBlock.findFirst({ where });
  }
  if (kind === "rearrange-sentence") {
    return prisma.subjectRearrangeSentenceBlock.findFirst({ where });
  }
  if (kind === "question-from-poems") {
    return prisma.subjectQuestionFromPoemsBlock.findFirst({ where });
  }
  return prisma.subjectQuestionFromStoryBlock.findFirst({ where });
}

/** Return the next Matching Sentences record in the same order as the student list. */
export async function getMatchingSentencesNextStep(input: {
  organizationId: string;
  classId: string;
  subjectId: string;
  currentRecordId: string;
  query?: string;
  pageSize?: number;
}): Promise<{ type: "record"; recordId: string; page: number } | { type: "end" }> {
  const search = input.query?.trim();
  const scope = {
    organizationId: input.organizationId,
    classId: input.classId,
    subjectId: input.subjectId,
    ...(search ? { title: { contains: search } } : {}),
  };

  const current = await prisma.subjectMatchingSentencesBlock.findFirst({
    where: { ...scope, id: input.currentRecordId },
    select: { id: true, sortOrder: true, updatedAt: true },
  });
  if (!current) return { type: "end" };

  // List order: sortOrder ASC, updatedAt DESC, id ASC.
  const next = await prisma.subjectMatchingSentencesBlock.findFirst({
    where: {
      ...scope,
      OR: [
        { sortOrder: { gt: current.sortOrder } },
        { sortOrder: current.sortOrder, updatedAt: { lt: current.updatedAt } },
        {
          sortOrder: current.sortOrder,
          updatedAt: current.updatedAt,
          id: { gt: current.id },
        },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
    select: { id: true, sortOrder: true, updatedAt: true },
  });

  if (!next) return { type: "end" };

  // Update ?page= when Next crosses the boundary between list pages.
  const beforeNext = await prisma.subjectMatchingSentencesBlock.count({
    where: {
      ...scope,
      OR: [
        { sortOrder: { lt: next.sortOrder } },
        { sortOrder: next.sortOrder, updatedAt: { gt: next.updatedAt } },
        { sortOrder: next.sortOrder, updatedAt: next.updatedAt, id: { lt: next.id } },
      ],
    },
  });
  const pageSize = Math.min(Math.max(input.pageSize ?? 10, 1), 50);
  return { type: "record", recordId: next.id, page: Math.floor(beforeNext / pageSize) + 1 };
}


/** Next Rearrange Sentence follows the same stable order as its student list. */
export async function getRearrangeSentenceNextStep(input: {
  organizationId: string;
  classId: string;
  subjectId: string;
  currentRecordId: string;
  query?: string;
  pageSize?: number;
}): Promise<{ type: "record"; recordId: string; page: number } | { type: "end" }> {
  const search = input.query?.trim();
  const scope = {
    organizationId: input.organizationId,
    classId: input.classId,
    subjectId: input.subjectId,
    ...(search ? { title: { contains: search } } : {}),
  };

  const current = await prisma.subjectRearrangeSentenceBlock.findFirst({
    where: { ...scope, id: input.currentRecordId },
    select: { id: true, sortOrder: true, updatedAt: true },
  });
  if (!current) return { type: "end" };

  const next = await prisma.subjectRearrangeSentenceBlock.findFirst({
    where: {
      ...scope,
      OR: [
        { sortOrder: { gt: current.sortOrder } },
        { sortOrder: current.sortOrder, updatedAt: { lt: current.updatedAt } },
        { sortOrder: current.sortOrder, updatedAt: current.updatedAt, id: { gt: current.id } },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
    select: { id: true, sortOrder: true, updatedAt: true },
  });
  if (!next) return { type: "end" };

  const beforeNext = await prisma.subjectRearrangeSentenceBlock.count({
    where: {
      ...scope,
      OR: [
        { sortOrder: { lt: next.sortOrder } },
        { sortOrder: next.sortOrder, updatedAt: { gt: next.updatedAt } },
        { sortOrder: next.sortOrder, updatedAt: next.updatedAt, id: { lt: next.id } },
      ],
    },
  });
  const pageSize = Math.min(Math.max(input.pageSize ?? 10, 1), 50);
  return { type: "record", recordId: next.id, page: Math.floor(beforeNext / pageSize) + 1 };
}

/**
 * Next published poem practice record, following the same stable ordering as
 * the student list. We fetch only the next row and count its position.
 */
export async function getPoemQuestionsNextStep(input: {
  organizationId: string;
  classId: string;
  subjectId: string;
  currentRecordId: string;
  query?: string;
  pageSize?: number;
}): Promise<{ type: "record"; recordId: string; page: number } | { type: "end" }> {
  const search = input.query?.trim();
  const scope = {
    organizationId: input.organizationId,
    classId: input.classId,
    subjectId: input.subjectId,
    ...(search ? { title: { contains: search } } : {}),
  };
  const model = prisma.subjectQuestionFromPoemsBlock;
  const current = await model.findFirst({
    where: { ...scope, id: input.currentRecordId },
    select: { sortOrder: true, updatedAt: true, id: true },
  });
  if (!current) return { type: "end" };

  const next = await model.findFirst({
    where: {
      ...scope,
      OR: [
        { sortOrder: { gt: current.sortOrder } },
        { sortOrder: current.sortOrder, updatedAt: { lt: current.updatedAt } },
        { sortOrder: current.sortOrder, updatedAt: current.updatedAt, id: { gt: current.id } },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
    select: { id: true, sortOrder: true, updatedAt: true },
  });
  if (!next) return { type: "end" };

  const beforeNext = await model.count({
    where: {
      ...scope,
      OR: [
        { sortOrder: { lt: next.sortOrder } },
        { sortOrder: next.sortOrder, updatedAt: { gt: next.updatedAt } },
        { sortOrder: next.sortOrder, updatedAt: next.updatedAt, id: { lt: next.id } },
      ],
    },
  });
  const pageSize = Math.min(Math.max(input.pageSize ?? 10, 1), 50);
  return { type: "record", recordId: next.id, page: Math.floor(beforeNext / pageSize) + 1 };
}

/**
 * Navigate to the next story-question set using the same stable sorting and
 * search filters as the student list. Only the next record and its position
 * are queried; the entire set is never loaded into the browser.
 */
export async function getStoryQuestionsNextStep(input: {
  organizationId: string;
  classId: string;
  subjectId: string;
  currentRecordId: string;
  query?: string;
  pageSize?: number;
}): Promise<{ type: "record"; recordId: string; page: number } | { type: "end" }> {
  const search = input.query?.trim();
  const scope = {
    organizationId: input.organizationId,
    classId: input.classId,
    subjectId: input.subjectId,
    ...(search ? { title: { contains: search } } : {}),
  };
  const model = prisma.subjectQuestionFromStoryBlock;
  const current = await model.findFirst({
    where: { ...scope, id: input.currentRecordId },
    select: { sortOrder: true, updatedAt: true, id: true },
  });
  if (!current) return { type: "end" };

  const next = await model.findFirst({
    where: {
      ...scope,
      OR: [
        { sortOrder: { gt: current.sortOrder } },
        { sortOrder: current.sortOrder, updatedAt: { lt: current.updatedAt } },
        { sortOrder: current.sortOrder, updatedAt: current.updatedAt, id: { gt: current.id } },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
    select: { id: true, sortOrder: true, updatedAt: true },
  });
  if (!next) return { type: "end" };

  const beforeNext = await model.count({
    where: {
      ...scope,
      OR: [
        { sortOrder: { lt: next.sortOrder } },
        { sortOrder: next.sortOrder, updatedAt: { gt: next.updatedAt } },
        { sortOrder: next.sortOrder, updatedAt: next.updatedAt, id: { lt: next.id } },
      ],
    },
  });
  const pageSize = Math.min(Math.max(input.pageSize ?? 10, 1), 50);
  return { type: "record", recordId: next.id, page: Math.floor(beforeNext / pageSize) + 1 };
}
