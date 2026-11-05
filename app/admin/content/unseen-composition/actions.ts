"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { createDefaultUnseenCompositionDocument } from "@/app/admin/content/unseen-composition/types";
import { requireAdmin, assertTrustedMutationOrigin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  title: z.string().trim().min(1, "Title is required.").max(200),
});

const saveSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  documentJson: z.string().min(2).max(1_500_000),
});

async function getOwnedRecord(id: string, organizationId: string) {
  const record = await prisma.unseenComposition.findFirst({
    where: { id, organizationId },
    select: { id: true, classId: true, subjectId: true, title: true },
  });
  if (!record) throw new Error("Unseen Composition not found.");
  return record;
}

export async function createUnseenComposition(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = createSchema.parse(input);

  const subject = await prisma.subject.findFirst({
    where: {
      id: parsed.subjectId,
      classId: parsed.classId,
      organizationId: user.organizationId,
    },
    select: { id: true, name: true, slug: true, code: true },
  });

  if (!subject) throw new Error("Subject not found for this class.");
  if (!isEnglishFirstPaperSubject(subject)) {
    throw new Error("Unseen Composition is available for English 1st Paper.");
  }

  const created = await prisma.unseenComposition.create({
    data: {
      classId: parsed.classId,
      subjectId: parsed.subjectId,
      title: parsed.title,
      documentJson: JSON.stringify(createDefaultUnseenCompositionDocument()),
      organizationId: user.organizationId,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityName: "UnseenComposition",
    entityId: created.id,
    changes: created,
    organizationId: user.organizationId,
  });

  revalidatePath(`/admin/content/class/${parsed.classId}/subject/${parsed.subjectId}/unseen-composition`);
  return { id: created.id };
}

export async function saveUnseenComposition(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = saveSchema.parse(input);
  const owned = await getOwnedRecord(parsed.id, user.organizationId);

  let document: { version?: unknown; blocks?: unknown };
  try {
    document = JSON.parse(parsed.documentJson) as { version?: unknown; blocks?: unknown };
    if (document.version !== 1 || !Array.isArray(document.blocks)) {
      throw new Error();
    }
  } catch {
    throw new Error("Invalid Unseen Composition document.");
  }

  const blockRecords = (document.blocks as unknown[]).filter(
    (block): block is Record<string, unknown> => Boolean(block) && typeof block === "object",
  );
  const boardIds = Array.from(
    new Set(
      blockRecords
        .map((block) => (typeof block.boardId === "string" ? block.boardId : ""))
        .filter(Boolean),
    ),
  );
  const academicYearIds = Array.from(
    new Set(
      blockRecords
        .map((block) => (typeof block.academicYearId === "string" ? block.academicYearId : ""))
        .filter(Boolean),
    ),
  );

  const [ownedBoards, ownedYears] = await Promise.all([
    boardIds.length
      ? prisma.board.count({
          where: { id: { in: boardIds }, organizationId: user.organizationId },
        })
      : Promise.resolve(0),
    academicYearIds.length
      ? prisma.academicYear.count({
          where: { id: { in: academicYearIds }, organizationId: user.organizationId },
        })
      : Promise.resolve(0),
  ]);
  if (ownedBoards !== boardIds.length) throw new Error("One or more selected boards are invalid.");
  if (ownedYears !== academicYearIds.length) throw new Error("One or more selected years are invalid.");

  const updated = await prisma.unseenComposition.update({
    where: { id: parsed.id, organizationId: user.organizationId },
    data: {
      title: parsed.title,
      documentJson: parsed.documentJson,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: "UnseenComposition",
    entityId: updated.id,
    changes: { title: updated.title },
    organizationId: user.organizationId,
  });

  revalidatePath(`/admin/content/class/${owned.classId}/subject/${owned.subjectId}/unseen-composition`);
  revalidatePath(
    `/admin/content/class/${owned.classId}/subject/${owned.subjectId}/unseen-composition/${owned.id}`,
  );
}

export async function deleteUnseenComposition(id: string) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const owned = await getOwnedRecord(id, user.organizationId);

  const deleted = await prisma.unseenComposition.delete({
    where: { id, organizationId: user.organizationId },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "UnseenComposition",
    entityId: deleted.id,
    changes: { title: deleted.title },
    organizationId: user.organizationId,
  });

  revalidatePath(`/admin/content/class/${owned.classId}/subject/${owned.subjectId}/unseen-composition`);
}

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, "Select at least one record.").max(100),
});

export async function bulkDeleteUnseenCompositions(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = bulkDeleteSchema.parse(input);
  const ids = Array.from(new Set(parsed.ids));

  const records = await prisma.unseenComposition.findMany({
    where: {
      id: { in: ids },
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      title: true,
      classId: true,
      subjectId: true,
    },
  });

  if (records.length !== ids.length) {
    throw new Error("One or more selected Unseen Composition records were not found.");
  }

  const deleted = await prisma.unseenComposition.deleteMany({
    where: {
      id: { in: ids },
      organizationId: user.organizationId,
    },
  });

  if (deleted.count !== ids.length) {
    throw new Error("Could not delete every selected Unseen Composition record.");
  }

  for (const record of records) {
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "DELETE",
      entityName: "UnseenComposition",
      entityId: record.id,
      changes: { title: record.title, bulk: true },
      organizationId: user.organizationId,
    });
  }

  for (const key of new Set(records.map((record) => `${record.classId}:${record.subjectId}`))) {
    const [classId, subjectId] = key.split(":");
    revalidatePath(`/admin/content/class/${classId}/subject/${subjectId}/unseen-composition`);
  }

  return { deleted: ids.length };
}
