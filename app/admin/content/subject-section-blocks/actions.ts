"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { requireAdmin, assertTrustedMutationOrigin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import {
  parseMatchingDocument,
  parseQuestionAnswerDocument,
  validateSubjectSectionDraft,
  type SubjectSectionKind,
} from "./types";

const sectionKindSchema = z.enum([
  "matching-sentences",
  "rearrange-sentence",
  "question-from-poems",
  "question-from-story",
]);

const baseSchema = z.object({
  kind: sectionKindSchema,
  classId: z.string().min(1),
  subjectId: z.string().min(1),
});

const contentSchema = {
  title: z.string().max(500),
  instruction: z.string().max(20_000),
  details: z.string().max(200_000),
  documentJson: z
    .string()
    .max(1_000_000)
    .refine((value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }, "Exercise data is invalid."),
};

const createSchema = baseSchema.extend(contentSchema);
const updateSchema = baseSchema.extend({ id: z.string().min(1), ...contentSchema });

const idSchema = baseSchema.extend({ id: z.string().min(1) });
const moveSchema = idSchema.extend({ direction: z.enum(["up", "down"]) });

function sectionPath(classId: string, subjectId: string, kind: SubjectSectionKind) {
  return `/admin/content/class/${classId}/subject/${subjectId}/${kind}`;
}

function auditEntityName(kind: SubjectSectionKind) {
  switch (kind) {
    case "matching-sentences":
      return "SubjectMatchingSentencesBlock";
    case "rearrange-sentence":
      return "SubjectRearrangeSentenceBlock";
    case "question-from-poems":
      return "SubjectQuestionFromPoemsBlock";
    case "question-from-story":
      return "SubjectQuestionFromStoryBlock";
  }
}

async function assertOwnedEnglishFirstPaperSubject(
  classId: string,
  subjectId: string,
  organizationId: string,
) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, classId, organizationId },
    select: { id: true, name: true, slug: true, code: true },
  });
  if (!subject || !isEnglishFirstPaperSubject(subject)) {
    throw new Error("English First Paper subject was not found.");
  }
  return subject;
}

async function nextSortOrder(kind: SubjectSectionKind, classId: string, subjectId: string, organizationId: string) {
  const where = { classId, subjectId, organizationId };
  switch (kind) {
    case "matching-sentences": {
      const row = await prisma.subjectMatchingSentencesBlock.aggregate({ where, _max: { sortOrder: true } });
      return (row._max.sortOrder ?? -1) + 1;
    }
    case "rearrange-sentence": {
      const row = await prisma.subjectRearrangeSentenceBlock.aggregate({ where, _max: { sortOrder: true } });
      return (row._max.sortOrder ?? -1) + 1;
    }
    case "question-from-poems": {
      const row = await prisma.subjectQuestionFromPoemsBlock.aggregate({ where, _max: { sortOrder: true } });
      return (row._max.sortOrder ?? -1) + 1;
    }
    case "question-from-story": {
      const row = await prisma.subjectQuestionFromStoryBlock.aggregate({ where, _max: { sortOrder: true } });
      return (row._max.sortOrder ?? -1) + 1;
    }
  }
}

async function createRecord(
  kind: SubjectSectionKind,
  data: {
    classId: string;
    subjectId: string;
    organizationId: string;
    userId: string;
    sortOrder: number;
    title: string;
    instruction: string;
    details: string;
    documentJson: string;
  },
) {
  const common = {
    classId: data.classId,
    subjectId: data.subjectId,
    sortOrder: data.sortOrder,
    organizationId: data.organizationId,
    createdBy: data.userId,
    updatedBy: data.userId,
    title: data.title,
    instruction: data.instruction,
    details: data.details,
    documentJson: data.documentJson,
  };
  switch (kind) {
    case "matching-sentences":
      return prisma.subjectMatchingSentencesBlock.create({ data: common });
    case "rearrange-sentence":
      return prisma.subjectRearrangeSentenceBlock.create({ data: common });
    case "question-from-poems":
      return prisma.subjectQuestionFromPoemsBlock.create({ data: common });
    case "question-from-story":
      return prisma.subjectQuestionFromStoryBlock.create({ data: common });
  }
}

export async function createSubjectSectionBlock(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = createSchema.parse(input);
  await assertOwnedEnglishFirstPaperSubject(parsed.classId, parsed.subjectId, user.organizationId);

  const document =
    parsed.kind === "matching-sentences"
      ? parseMatchingDocument(parsed.documentJson, "new")
      : parseQuestionAnswerDocument(parsed.documentJson, "new");
  const validationErrors = validateSubjectSectionDraft(parsed.kind, {
    title: parsed.title,
    instruction: parsed.instruction,
    details: parsed.details,
    document,
  });
  const firstValidationError = Object.values(validationErrors)[0];
  if (firstValidationError) throw new Error(firstValidationError);

  const sortOrder = await nextSortOrder(parsed.kind, parsed.classId, parsed.subjectId, user.organizationId);
  const created = await createRecord(parsed.kind, {
    classId: parsed.classId,
    subjectId: parsed.subjectId,
    organizationId: user.organizationId,
    userId: user.id,
    sortOrder,
    title: parsed.title.trim(),
    instruction: parsed.instruction,
    details: parsed.details,
    documentJson: JSON.stringify(document),
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityName: auditEntityName(parsed.kind),
    entityId: created.id,
    changes: created,
    organizationId: user.organizationId,
  });

  revalidatePath(sectionPath(parsed.classId, parsed.subjectId, parsed.kind));
  return { id: created.id };
}

async function updateOwnedRecord(
  kind: SubjectSectionKind,
  input: z.infer<typeof updateSchema>,
  organizationId: string,
  userId: string,
) {
  const where = {
    id: input.id,
    classId: input.classId,
    subjectId: input.subjectId,
    organizationId,
  };
  const data = {
    title: input.title,
    instruction: input.instruction,
    details: input.details,
    documentJson: input.documentJson,
    updatedBy: userId,
  };

  switch (kind) {
    case "matching-sentences":
      return prisma.subjectMatchingSentencesBlock.updateMany({ where, data });
    case "rearrange-sentence":
      return prisma.subjectRearrangeSentenceBlock.updateMany({ where, data });
    case "question-from-poems":
      return prisma.subjectQuestionFromPoemsBlock.updateMany({ where, data });
    case "question-from-story":
      return prisma.subjectQuestionFromStoryBlock.updateMany({ where, data });
  }
}

export async function updateSubjectSectionBlock(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateSchema.parse(input);
  await assertOwnedEnglishFirstPaperSubject(parsed.classId, parsed.subjectId, user.organizationId);

  const result = await updateOwnedRecord(parsed.kind, parsed, user.organizationId, user.id);
  if (result.count !== 1) throw new Error("Block was not found or does not belong to this subject.");

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: auditEntityName(parsed.kind),
    entityId: parsed.id,
    changes: {
      title: parsed.title,
      instruction: parsed.instruction,
      details: parsed.details,
      documentJson: parsed.documentJson,
    },
    organizationId: user.organizationId,
  });

  revalidatePath(sectionPath(parsed.classId, parsed.subjectId, parsed.kind));
}

async function getOwnedRecord(
  kind: SubjectSectionKind,
  id: string,
  classId: string,
  subjectId: string,
  organizationId: string,
) {
  const where = { id, classId, subjectId, organizationId };
  switch (kind) {
    case "matching-sentences":
      return prisma.subjectMatchingSentencesBlock.findFirst({ where });
    case "rearrange-sentence":
      return prisma.subjectRearrangeSentenceBlock.findFirst({ where });
    case "question-from-poems":
      return prisma.subjectQuestionFromPoemsBlock.findFirst({ where });
    case "question-from-story":
      return prisma.subjectQuestionFromStoryBlock.findFirst({ where });
  }
}

async function deleteOwnedRecord(
  kind: SubjectSectionKind,
  id: string,
  classId: string,
  subjectId: string,
  organizationId: string,
) {
  const where = { id, classId, subjectId, organizationId };
  switch (kind) {
    case "matching-sentences":
      return prisma.subjectMatchingSentencesBlock.deleteMany({ where });
    case "rearrange-sentence":
      return prisma.subjectRearrangeSentenceBlock.deleteMany({ where });
    case "question-from-poems":
      return prisma.subjectQuestionFromPoemsBlock.deleteMany({ where });
    case "question-from-story":
      return prisma.subjectQuestionFromStoryBlock.deleteMany({ where });
  }
}

export async function deleteSubjectSectionBlock(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = idSchema.parse(input);
  await assertOwnedEnglishFirstPaperSubject(parsed.classId, parsed.subjectId, user.organizationId);

  const existing = await getOwnedRecord(
    parsed.kind,
    parsed.id,
    parsed.classId,
    parsed.subjectId,
    user.organizationId,
  );
  if (!existing) throw new Error("Block was not found or does not belong to this subject.");

  const deleted = await deleteOwnedRecord(
    parsed.kind,
    parsed.id,
    parsed.classId,
    parsed.subjectId,
    user.organizationId,
  );
  if (deleted.count !== 1) throw new Error("Failed to delete block.");

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: auditEntityName(parsed.kind),
    entityId: parsed.id,
    changes: existing,
    organizationId: user.organizationId,
  });

  revalidatePath(sectionPath(parsed.classId, parsed.subjectId, parsed.kind));
}

async function listOrder(
  kind: SubjectSectionKind,
  classId: string,
  subjectId: string,
  organizationId: string,
) {
  const where = { classId, subjectId, organizationId };
  const select = { id: true, sortOrder: true } as const;
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

async function applyOrder(
  kind: SubjectSectionKind,
  updates: Array<{ id: string; sortOrder: number }>,
  organizationId: string,
) {
  switch (kind) {
    case "matching-sentences":
      return prisma.$transaction(
        updates.map((item) =>
          prisma.subjectMatchingSentencesBlock.updateMany({
            where: { id: item.id, organizationId },
            data: { sortOrder: item.sortOrder },
          }),
        ),
      );
    case "rearrange-sentence":
      return prisma.$transaction(
        updates.map((item) =>
          prisma.subjectRearrangeSentenceBlock.updateMany({
            where: { id: item.id, organizationId },
            data: { sortOrder: item.sortOrder },
          }),
        ),
      );
    case "question-from-poems":
      return prisma.$transaction(
        updates.map((item) =>
          prisma.subjectQuestionFromPoemsBlock.updateMany({
            where: { id: item.id, organizationId },
            data: { sortOrder: item.sortOrder },
          }),
        ),
      );
    case "question-from-story":
      return prisma.$transaction(
        updates.map((item) =>
          prisma.subjectQuestionFromStoryBlock.updateMany({
            where: { id: item.id, organizationId },
            data: { sortOrder: item.sortOrder },
          }),
        ),
      );
  }
}

export async function moveSubjectSectionBlock(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = moveSchema.parse(input);
  await assertOwnedEnglishFirstPaperSubject(parsed.classId, parsed.subjectId, user.organizationId);

  const rows = await listOrder(parsed.kind, parsed.classId, parsed.subjectId, user.organizationId);
  const currentIndex = rows.findIndex((row) => row.id === parsed.id);
  if (currentIndex < 0) throw new Error("Block was not found.");
  const nextIndex = parsed.direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= rows.length) return;

  const next = [...rows];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(nextIndex, 0, moved);
  await applyOrder(
    parsed.kind,
    next.map((row, index) => ({ id: row.id, sortOrder: index })),
    user.organizationId,
  );

  revalidatePath(sectionPath(parsed.classId, parsed.subjectId, parsed.kind));
}
