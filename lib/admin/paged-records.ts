import "server-only";

import { prisma } from "@/lib/db";
import type {
  AdminPagedRequest,
  AdminPagedResult,
  AdminSortDirection,
} from "@/lib/admin/pagination-types";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function clean(value: string | undefined) {
  return (value || "").trim();
}

function normalizePage(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value || 1)) : 1;
}

function normalizePageSize(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value || DEFAULT_PAGE_SIZE)));
}

function normalizeDirection(value: AdminSortDirection | undefined): AdminSortDirection {
  return value === "asc" ? "asc" : "desc";
}

function pagination(input: AdminPagedRequest) {
  const page = normalizePage(input.page);
  const pageSize = normalizePageSize(input.pageSize);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function finish<T>(rows: T[], total: number, page: number, pageSize: number): AdminPagedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { rows, total, page: Math.min(page, totalPages), pageSize, totalPages };
}

function stringSearch(search: string, fields: string[]) {
  if (!search) return undefined;
  return fields.map((field) => ({ [field]: { contains: search } }));
}

export async function getAdminPagedRecords(
  organizationId: string,
  input: AdminPagedRequest,
): Promise<AdminPagedResult<any>> {
  const { page, pageSize, skip } = pagination(input);
  const search = clean(input.search).slice(0, 200);
  const sort = clean(input.sort);
  const direction = normalizeDirection(input.direction);
  const filters = input.filters || {};

  switch (input.resource) {
    case "classes": {
      const where: any = {
        organizationId,
        ...(search
          ? {
              OR: stringSearch(search, ["name", "slug", "code", "description"]),
            }
          : {}),
      };
      const orderBy: any = sort === "name"
        ? [{ name: direction }, { sortOrder: "asc" as const }]
        : sort === "order"
          ? [{ sortOrder: direction }, { name: "asc" as const }]
          : [{ sortOrder: "asc" as const }, { name: "asc" as const }];
      const [total, rows] = await Promise.all([
        prisma.class.count({ where }),
        prisma.class.findMany({
          where,
          skip,
          take: pageSize,
          orderBy,
          select: {
            id: true,
            name: true,
            slug: true,
            code: true,
            description: true,
            sortOrder: true,
            iconType: true,
            iconLibrary: true,
            iconName: true,
            iconColor: true,
            imagePath: true,
            _count: { select: { subjects: true, units: true } },
          },
        }),
      ]);
      return finish(
        rows.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          code: item.code,
          description: item.description,
          sortOrder: item.sortOrder,
          iconType: item.iconType,
          iconLibrary: item.iconLibrary,
          iconName: item.iconName,
          iconColor: item.iconColor,
          imagePath: item.imagePath,
          subjectsCount: item._count.subjects,
          unitsCount: item._count.units,
        })),
        total,
        page,
        pageSize,
      );
    }

    case "subjects": {
      const classId = clean(filters.classId);
      const where: any = {
        organizationId,
        ...(classId ? { classId } : {}),
        ...(search
          ? {
              OR: [
                ...stringSearch(search, ["name", "slug", "code", "description"])!,
                { class: { name: { contains: search } } },
              ],
            }
          : {}),
      };
      const [total, rows] = await Promise.all([
        prisma.subject.count({ where }),
        prisma.subject.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [{ class: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            classId: true,
            name: true,
            slug: true,
            code: true,
            description: true,
            sortOrder: true,
            iconType: true,
            iconLibrary: true,
            iconName: true,
            iconColor: true,
            imagePath: true,
            class: { select: { name: true } },
            _count: { select: { units: true } },
          },
        }),
      ]);
      return finish(
        rows.map((item) => ({
          id: item.id,
          classId: item.classId,
          className: item.class.name,
          name: item.name,
          slug: item.slug,
          code: item.code,
          description: item.description,
          sortOrder: item.sortOrder,
          iconType: item.iconType,
          iconLibrary: item.iconLibrary,
          iconName: item.iconName,
          iconColor: item.iconColor,
          imagePath: item.imagePath,
          unitsCount: item._count.units,
        })),
        total,
        page,
        pageSize,
      );
    }

    case "units": {
      const classId = clean(filters.classId);
      const subjectId = clean(filters.subjectId);
      const where: any = {
        organizationId,
        ...(classId ? { classId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(search
          ? {
              OR: [
                ...stringSearch(search, ["title", "slug", "unitNumber", "description"])!,
                { class: { name: { contains: search } } },
                { subject: { name: { contains: search } } },
              ],
            }
          : {}),
      };
      const [total, rows] = await Promise.all([
        prisma.unit.count({ where }),
        prisma.unit.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [
            { class: { sortOrder: "asc" } },
            { subject: { sortOrder: "asc" } },
            { sortOrder: "asc" },
            { title: "asc" },
          ],
          select: {
            id: true,
            classId: true,
            subjectId: true,
            title: true,
            slug: true,
            unitNumber: true,
            description: true,
            sortOrder: true,
            iconType: true,
            iconLibrary: true,
            iconName: true,
            iconColor: true,
            imagePath: true,
            class: { select: { name: true } },
            subject: { select: { name: true } },
            _count: { select: { lessons: true } },
          },
        }),
      ]);
      return finish(
        rows.map((item) => ({
          id: item.id,
          classId: item.classId,
          className: item.class.name,
          subjectId: item.subjectId,
          subjectName: item.subject.name,
          title: item.title,
          slug: item.slug,
          unitNumber: item.unitNumber,
          description: item.description,
          sortOrder: item.sortOrder,
          iconType: item.iconType,
          iconLibrary: item.iconLibrary,
          iconName: item.iconName,
          iconColor: item.iconColor,
          imagePath: item.imagePath,
          lessonsCount: item._count.lessons,
        })),
        total,
        page,
        pageSize,
      );
    }

    case "lessons": {
      const classId = clean(filters.classId);
      const subjectId = clean(filters.subjectId);
      const unitId = clean(filters.unitId);
      const where: any = {
        organizationId,
        ...(unitId ? { unitId } : {}),
        ...(!unitId && (classId || subjectId)
          ? {
              unit: {
                ...(classId ? { classId } : {}),
                ...(subjectId ? { subjectId } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                ...stringSearch(search, ["title", "slug", "lessonNumber", "shortDescription"])!,
                { unit: { title: { contains: search } } },
                { unit: { class: { name: { contains: search } } } },
                { unit: { subject: { name: { contains: search } } } },
              ],
            }
          : {}),
      };
      const [total, rows] = await Promise.all([
        prisma.lesson.count({ where }),
        prisma.lesson.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [
            { unit: { class: { sortOrder: "asc" } } },
            { unit: { subject: { sortOrder: "asc" } } },
            { unit: { sortOrder: "asc" } },
            { sortOrder: "asc" },
            { title: "asc" },
          ],
          select: {
            id: true,
            title: true,
            slug: true,
            lessonNumber: true,
            shortDescription: true,
            sortOrder: true,
            unitId: true,
            iconType: true,
            iconLibrary: true,
            iconName: true,
            iconColor: true,
            imagePath: true,
            unit: {
              select: {
                title: true,
                classId: true,
                subjectId: true,
                class: { select: { name: true } },
                subject: { select: { name: true } },
              },
            },
            _count: { select: { topics: true } },
          },
        }),
      ]);
      return finish(
        rows.map((item) => ({
          id: item.id,
          classId: item.unit.classId,
          className: item.unit.class.name,
          subjectId: item.unit.subjectId,
          subjectName: item.unit.subject.name,
          unitId: item.unitId,
          unitTitle: item.unit.title,
          title: item.title,
          slug: item.slug,
          lessonNumber: item.lessonNumber,
          shortDescription: item.shortDescription,
          sortOrder: item.sortOrder,
          iconType: item.iconType,
          iconLibrary: item.iconLibrary,
          iconName: item.iconName,
          iconColor: item.iconColor,
          imagePath: item.imagePath,
          topicsCount: item._count.topics,
        })),
        total,
        page,
        pageSize,
      );
    }

    case "topics": {
      const classId = clean(filters.classId);
      const subjectId = clean(filters.subjectId);
      const unitId = clean(filters.unitId);
      const lessonId = clean(filters.lessonId);
      const where: any = {
        organizationId,
        ...(lessonId ? { lessonId } : {}),
        ...(!lessonId && (unitId || classId || subjectId)
          ? {
              lesson: {
                ...(unitId ? { unitId } : {}),
                ...(!unitId && (classId || subjectId)
                  ? {
                      unit: {
                        ...(classId ? { classId } : {}),
                        ...(subjectId ? { subjectId } : {}),
                      },
                    }
                  : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                ...stringSearch(search, ["title", "slug", "topicNumber", "shortDescription"])!,
                { lesson: { title: { contains: search } } },
                { lesson: { unit: { title: { contains: search } } } },
                { lesson: { unit: { class: { name: { contains: search } } } } },
                { lesson: { unit: { subject: { name: { contains: search } } } } },
              ],
            }
          : {}),
      };
      const [total, rows] = await Promise.all([
        prisma.topic.count({ where }),
        prisma.topic.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [
            { lesson: { unit: { class: { sortOrder: "asc" } } } },
            { lesson: { unit: { subject: { sortOrder: "asc" } } } },
            { lesson: { unit: { sortOrder: "asc" } } },
            { lesson: { sortOrder: "asc" } },
            { sortOrder: "asc" },
            { title: "asc" },
          ],
          select: {
            id: true,
            title: true,
            slug: true,
            topicNumber: true,
            shortDescription: true,
            sortOrder: true,
            lessonId: true,
            iconType: true,
            iconLibrary: true,
            iconName: true,
            iconColor: true,
            imagePath: true,
            lesson: {
              select: {
                title: true,
                unitId: true,
                unit: {
                  select: {
                    title: true,
                    classId: true,
                    subjectId: true,
                    class: { select: { name: true } },
                    subject: { select: { name: true } },
                  },
                },
              },
            },
            _count: { select: { contents: true } },
          },
        }),
      ]);
      return finish(
        rows.map((item) => ({
          id: item.id,
          classId: item.lesson.unit.classId,
          className: item.lesson.unit.class.name,
          subjectId: item.lesson.unit.subjectId,
          subjectName: item.lesson.unit.subject.name,
          unitId: item.lesson.unitId,
          unitTitle: item.lesson.unit.title,
          lessonId: item.lessonId,
          lessonTitle: item.lesson.title,
          title: item.title,
          slug: item.slug,
          topicNumber: item.topicNumber,
          shortDescription: item.shortDescription,
          sortOrder: item.sortOrder,
          iconType: item.iconType,
          iconLibrary: item.iconLibrary,
          iconName: item.iconName,
          iconColor: item.iconColor,
          imagePath: item.imagePath,
          contentsCount: item._count.contents,
        })),
        total,
        page,
        pageSize,
      );
    }

    case "content": {
      const classId = clean(filters.classId);
      const subjectId = clean(filters.subjectId);
      const unitId = clean(filters.unitId);
      const lessonId = clean(filters.lessonId);
      const topicId = clean(filters.topicId);
      const where: any = {
        organizationId,
        ...(classId ? { classId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(unitId ? { unitId } : {}),
        ...(lessonId ? { lessonId } : {}),
        ...(topicId ? { topicId } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { unit: { title: { contains: search } } },
                { lesson: { title: { contains: search } } },
                { topic: { title: { contains: search } } },
              ],
            }
          : {}),
      };
      const orderBy: any =
        sort === "title"
          ? [{ title: direction }, { createdAt: "desc" as const }]
          : sort === "unit"
            ? [{ unit: { title: direction } }, { createdAt: "desc" as const }]
            : sort === "lesson"
              ? [{ lesson: { title: direction } }, { createdAt: "desc" as const }]
              : sort === "topic"
                ? [{ topic: { title: direction } }, { createdAt: "desc" as const }]
                : sort === "blocks"
                  ? [{ blocks: { _count: direction } }, { createdAt: "desc" as const }]
                  : [{ createdAt: direction }, { id: "desc" as const }];
      const [total, rows] = await Promise.all([
        prisma.content.count({ where }),
        prisma.content.findMany({
          where,
          skip,
          take: pageSize,
          orderBy,
          select: {
            id: true,
            title: true,
            createdAt: true,
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            unit: { select: { id: true, title: true } },
            lesson: { select: { id: true, title: true } },
            topic: { select: { id: true, title: true } },
            _count: { select: { blocks: true } },
          },
        }),
      ]);
      return finish(
        rows.map((item) => ({
          id: item.id,
          title: item.title,
          createdAt: item.createdAt.toISOString(),
          class: item.class,
          subject: item.subject,
          unit: item.unit,
          lesson: item.lesson,
          topic: item.topic,
          blocksCount: item._count.blocks,
        })),
        total,
        page,
        pageSize,
      );
    }

    case "unseen-composition": {
      const classId = clean(filters.classId);
      const subjectId = clean(filters.subjectId);
      const where: any = {
        organizationId,
        ...(classId ? { classId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(search ? { title: { contains: search } } : {}),
      };
      const orderBy: any = sort === "title"
        ? [{ title: direction }, { updatedAt: "desc" as const }]
        : sort === "created"
          ? [{ createdAt: direction }, { id: "desc" as const }]
          : [{ updatedAt: direction }, { id: "desc" as const }];
      const [total, rows] = await Promise.all([
        prisma.unseenComposition.count({ where }),
        prisma.unseenComposition.findMany({
          where,
          skip,
          take: pageSize,
          orderBy,
          select: { id: true, title: true, createdAt: true, updatedAt: true },
        }),
      ]);
      return finish(
        rows.map((row) => ({
          id: row.id,
          title: row.title,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
        total,
        page,
        pageSize,
      );
    }

    case "subject-section": {
      const classId = clean(filters.classId);
      const subjectId = clean(filters.subjectId);
      const kind = clean(filters.kind);
      const where: any = {
        organizationId,
        ...(classId ? { classId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(search ? { title: { contains: search } } : {}),
      };
      const orderBy: any = sort === "title"
        ? [{ title: direction }, { sortOrder: "asc" as const }]
        : sort === "updated"
          ? [{ updatedAt: direction }, { sortOrder: "asc" as const }]
          : sort === "position"
            ? [{ sortOrder: direction }, { createdAt: "asc" as const }]
            : [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];
      const args: any = {
        where,
        skip,
        take: pageSize,
        orderBy,
        select: { id: true, title: true, sortOrder: true, updatedAt: true },
      } as const;
      let total = 0;
      let rows: Array<{ id: string; title: string; sortOrder: number; updatedAt: Date }> = [];
      if (kind === "matching-sentences") {
        [total, rows] = await Promise.all([
          prisma.subjectMatchingSentencesBlock.count({ where }),
          prisma.subjectMatchingSentencesBlock.findMany(args),
        ]);
      } else if (kind === "rearrange-sentence") {
        [total, rows] = await Promise.all([
          prisma.subjectRearrangeSentenceBlock.count({ where }),
          prisma.subjectRearrangeSentenceBlock.findMany(args),
        ]);
      } else if (kind === "question-from-poems") {
        [total, rows] = await Promise.all([
          prisma.subjectQuestionFromPoemsBlock.count({ where }),
          prisma.subjectQuestionFromPoemsBlock.findMany(args),
        ]);
      } else if (kind === "question-from-story") {
        [total, rows] = await Promise.all([
          prisma.subjectQuestionFromStoryBlock.count({ where }),
          prisma.subjectQuestionFromStoryBlock.findMany(args),
        ]);
      } else {
        return finish([], 0, page, pageSize);
      }
      return finish(
        rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
        total,
        page,
        pageSize,
      );
    }

    case "english-second-paper": {
      const classId = clean(filters.classId);
      const subjectId = clean(filters.subjectId);
      const kind = clean(filters.kind);
      const where: any = {
        organizationId,
        ...(classId ? { classId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(kind ? { kind } : {}),
        ...(search ? { title: { contains: search } } : {}),
      };
      const orderBy: any = sort === "title"
        ? [{ title: direction }, { sortOrder: "asc" as const }]
        : sort === "updated"
          ? [{ updatedAt: direction }, { sortOrder: "asc" as const }]
          : [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];
      const [total, rows] = await Promise.all([
        prisma.subjectEnglishSecondPaperBlock.count({ where }),
        prisma.subjectEnglishSecondPaperBlock.findMany({
          where,
          skip,
          take: pageSize,
          orderBy,
          select: { id: true, title: true, sortOrder: true, updatedAt: true },
        }),
      ]);
      return finish(
        rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
        total,
        page,
        pageSize,
      );
    }

    case "board": {
      const status = clean(filters.status);
      const where: any = {
        organizationId,
        ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
        ...(search ? { name: { contains: search } } : {}),
      };
      const orderBy: any = sort === "status"
        ? [{ isActive: direction }, { name: "asc" as const }]
        : sort === "createdAt"
          ? [{ createdAt: direction }, { name: "asc" as const }]
          : sort === "updatedAt"
            ? [{ updatedAt: direction }, { name: "asc" as const }]
            : [{ name: direction === "desc" ? "desc" as const : "asc" as const }, { createdAt: "asc" as const }];
      const [total, rows] = await Promise.all([
        prisma.board.count({ where }),
        prisma.board.findMany({
          where,
          skip,
          take: pageSize,
          orderBy,
          select: { id: true, name: true, isActive: true, createdAt: true, updatedAt: true },
        }),
      ]);
      return finish(
        rows.map((row) => ({
          id: row.id,
          label: row.name,
          isActive: row.isActive,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
        total,
        page,
        pageSize,
      );
    }

    case "year": {
      const status = clean(filters.status);
      const numericSearch = /^\d+$/.test(search) ? Number.parseInt(search, 10) : undefined;
      const where: any = {
        organizationId,
        ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
        ...(search ? { year: numericSearch ?? -1 } : {}),
      };
      const orderBy: any = sort === "status"
        ? [{ isActive: direction }, { year: "desc" as const }]
        : sort === "createdAt"
          ? [{ createdAt: direction }, { year: "desc" as const }]
          : sort === "updatedAt"
            ? [{ updatedAt: direction }, { year: "desc" as const }]
            : [{ year: direction === "asc" ? "asc" as const : "desc" as const }, { createdAt: "desc" as const }];
      const [total, rows] = await Promise.all([
        prisma.academicYear.count({ where }),
        prisma.academicYear.findMany({
          where,
          skip,
          take: pageSize,
          orderBy,
          select: { id: true, year: true, isActive: true, createdAt: true, updatedAt: true },
        }),
      ]);
      return finish(
        rows.map((row) => ({
          id: row.id,
          label: String(row.year),
          numericValue: row.year,
          isActive: row.isActive,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
        total,
        page,
        pageSize,
      );
    }
  }
}
