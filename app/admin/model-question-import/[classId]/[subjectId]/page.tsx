import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";

import { ModelQuestionImportWorkspace } from "@/components/admin/ModelQuestionImportWorkspace";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 15;
function first(input: string | string[] | undefined) {
  return typeof input === "string" ? input : Array.isArray(input) ? input[0] ?? "" : "";
}

export default async function ModelQuestionImportSubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  const [{ classId, subjectId }, query] = await Promise.all([params, searchParams]);
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, classId, organizationId: user.organizationId },
    select: { id: true, name: true, class: { select: { id: true, name: true } } },
  });
  if (!subject) notFound();
  const search = first(query.q).trim().slice(0, 100);
  const boardId = first(query.boardId);
  const yearId = first(query.yearId);
  const requestedPage = Number.parseInt(first(query.page), 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.min(requestedPage, 100000)) : 1;

  const where: Prisma.ModelQuestionImportWhereInput = {
    organizationId: user.organizationId,
    classId,
    subjectId,
    ...(boardId && boardId !== "all" ? { boardId } : {}),
    ...(yearId && yearId !== "all" ? { academicYearId: yearId } : {}),
    ...(search ? { OR: [{ title: { contains: search } }, { file: { is: { originalName: { contains: search } } } }] } : {}),
  };
  const [boards, years, total] = await Promise.all([
    prisma.board.findMany({ where: { organizationId: user.organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true } }),
    prisma.academicYear.findMany({ where: { organizationId: user.organizationId }, orderBy: { year: "desc" }, select: { id: true, year: true, isActive: true } }),
    prisma.modelQuestionImport.count({ where }),
  ]);
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, maxPage);
  const records = await prisma.modelQuestionImport.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true, title: true, status: true, questionCount: true, createdAt: true,
      board: { select: { name: true } }, academicYear: { select: { year: true } },
      file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, status: true } },
    },
  });

  return (
    <ModelQuestionImportWorkspace
      classItem={subject.class}
      subject={{ id: subject.id, name: subject.name }}
      boards={boards}
      years={years}
      records={records.map((entry) => ({
        id: entry.id,
        title: entry.title,
        status: entry.status,
        questionCount: entry.questionCount,
        createdAt: entry.createdAt.toISOString(),
        board: entry.board?.name ?? "—",
        year: entry.academicYear?.year?.toString() ?? "—",
        fileId: entry.file.id,
        fileName: entry.file.originalName,
        mimeType: entry.file.mimeType,
        fileStatus: entry.file.status,
        sizeBytes: entry.file.sizeBytes,
      }))}
      total={total}
      page={safePage}
      pageSize={PAGE_SIZE}
      currentFilters={{ q: search, boardId: boardId || "all", yearId: yearId || "all" }}
    />
  );
}
