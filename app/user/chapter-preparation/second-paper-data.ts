import { prisma } from "@/lib/db";
import type { EnglishSecondPaperKind } from "@/app/admin/content/english-second-paper-blocks/types";

export const SECOND_PAPER_PAGE_SIZE = 10;

type Base = {
  organizationId: string;
  classId: string;
  subjectId: string;
  kind: EnglishSecondPaperKind;
};

export async function getSecondPaperPage(input: Base & { query: string; page: number }) {
  const page = Math.max(1, Math.floor(input.page) || 1);
  const where = {
    organizationId: input.organizationId,
    classId: input.classId,
    subjectId: input.subjectId,
    kind: input.kind,
    ...(input.query ? { title: { contains: input.query } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.subjectEnglishSecondPaperBlock.count({ where }),
    prisma.subjectEnglishSecondPaperBlock.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      skip: (page - 1) * SECOND_PAPER_PAGE_SIZE,
      take: SECOND_PAPER_PAGE_SIZE,
      select: { id: true, title: true, sortOrder: true },
    }),
  ]);
  return { total, rows, page, totalPages: Math.max(1, Math.ceil(total / SECOND_PAPER_PAGE_SIZE)) };
}

export async function getSecondPaperRecordAndNext(input: Base & { recordId: string; query: string }) {
  const where = {
    organizationId: input.organizationId,
    classId: input.classId,
    subjectId: input.subjectId,
    kind: input.kind,
  };
  const record = await prisma.subjectEnglishSecondPaperBlock.findFirst({
    where: { ...where, id: input.recordId },
    select: { id: true, title: true, instruction: true, details: true, documentJson: true, sortOrder: true },
  });
  if (!record) return null;
  const filter = input.query ? { title: { contains: input.query } } : {};
  const next = await prisma.subjectEnglishSecondPaperBlock.findFirst({
    where: {
      ...where,
      ...filter,
      OR: [
        { sortOrder: { gt: record.sortOrder } },
        { sortOrder: record.sortOrder, id: { gt: record.id } },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, sortOrder: true },
  });
  let nextPage: number | null = null;
  if (next) {
    const preceding = await prisma.subjectEnglishSecondPaperBlock.count({
      where: {
        ...where,
        ...filter,
        OR: [
          { sortOrder: { lt: next.sortOrder } },
          { sortOrder: next.sortOrder, id: { lt: next.id } },
        ],
      },
    });
    nextPage = Math.floor(preceding / SECOND_PAPER_PAGE_SIZE) + 1;
  }
  return { record, nextId: next?.id || null, nextPage };
}
