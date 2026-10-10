import { notFound } from "next/navigation";

import { isEnglishSecondPaperSubject } from "@/app/admin/content/navigation-helpers";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";
import type { EnglishSecondPaperKind, EnglishSecondPaperRecord } from "./types";

export async function getEnglishSecondPaperContext(classId: string, subjectId: string) {
  const user = await requireAdmin();
  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      classId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      class: { select: { id: true, name: true } },
    },
  });

  if (!subject || !isEnglishSecondPaperSubject(subject)) notFound();
  return { user, subject };
}

export async function listEnglishSecondPaperRecords(
  kind: EnglishSecondPaperKind,
  classId: string,
  subjectId: string,
  organizationId: string,
) {
  return prisma.subjectEnglishSecondPaperBlock.findMany({
    where: { kind, classId, subjectId, organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getEnglishSecondPaperRecord(
  kind: EnglishSecondPaperKind,
  id: string,
  classId: string,
  subjectId: string,
  organizationId: string,
): Promise<EnglishSecondPaperRecord | null> {
  const record = await prisma.subjectEnglishSecondPaperBlock.findFirst({
    where: { id, kind, classId, subjectId, organizationId },
  });
  if (!record) return null;
  return {
    ...record,
    kind: record.kind as EnglishSecondPaperKind,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
