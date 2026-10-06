import { notFound } from "next/navigation";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";
import type { SubjectSectionKind, SubjectSectionRecord } from "./types";

export async function getSubjectSectionContext(classId: string, subjectId: string) {
  const user = await requireAdmin();
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, classId, organizationId: user.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      class: { select: { id: true, name: true } },
    },
  });
  if (!subject || !isEnglishFirstPaperSubject(subject)) notFound();
  return { user, subject };
}

export async function listSubjectSectionRecords(
  kind: SubjectSectionKind,
  classId: string,
  subjectId: string,
  organizationId: string,
) {
  const where = { classId, subjectId, organizationId };
  const select = {
    id: true,
    title: true,
    sortOrder: true,
    updatedAt: true,
  } as const;
  const orderBy = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

  switch (kind) {
    case "matching-sentences":
      return prisma.subjectMatchingSentencesBlock.findMany({ where, select, orderBy });
    case "rearrange-sentence":
      return prisma.subjectRearrangeSentenceBlock.findMany({ where, select, orderBy });
    case "question-from-poems":
      return prisma.subjectQuestionFromPoemsBlock.findMany({ where, select, orderBy });
    case "question-from-story":
      return prisma.subjectQuestionFromStoryBlock.findMany({ where, select, orderBy });
  }
}

export async function getSubjectSectionRecord(
  kind: SubjectSectionKind,
  id: string,
  classId: string,
  subjectId: string,
  organizationId: string,
): Promise<SubjectSectionRecord | null> {
  const where = { id, classId, subjectId, organizationId };
  const select = {
    id: true,
    classId: true,
    subjectId: true,
    title: true,
    instruction: true,
    details: true,
    documentJson: true,
    sortOrder: true,
    updatedAt: true,
  } as const;

  let record;
  switch (kind) {
    case "matching-sentences":
      record = await prisma.subjectMatchingSentencesBlock.findFirst({ where, select });
      break;
    case "rearrange-sentence":
      record = await prisma.subjectRearrangeSentenceBlock.findFirst({ where, select });
      break;
    case "question-from-poems":
      record = await prisma.subjectQuestionFromPoemsBlock.findFirst({ where, select });
      break;
    case "question-from-story":
      record = await prisma.subjectQuestionFromStoryBlock.findFirst({ where, select });
      break;
  }

  return record ? { ...record, updatedAt: record.updatedAt.toISOString() } : null;
}
