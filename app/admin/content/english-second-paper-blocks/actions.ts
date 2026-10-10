"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isEnglishSecondPaperSubject } from "@/app/admin/content/navigation-helpers";
import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import {
  ENGLISH_SECOND_PAPER_KINDS,
  ENGLISH_SECOND_PAPER_META,
  isEnglishSecondPaperKind,
  normalizeEnglishSecondPaperDocument,
  parseEnglishSecondPaperDocument,
  validateEnglishSecondPaperDraft,
  type EnglishSecondPaperKind,
} from "./types";

const kindSchema = z.enum(ENGLISH_SECOND_PAPER_KINDS as [EnglishSecondPaperKind, ...EnglishSecondPaperKind[]]);

const baseSchema = z.object({
  kind: kindSchema,
  classId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  boardId: z.string().trim().min(1).nullable().optional(),
  academicYearId: z.string().trim().min(1).nullable().optional(),
  title: z.string().max(250).default(""),
  instruction: z.string().max(20000).default(""),
  details: z.string().max(100000).default(""),
  documentJson: z.string().max(500000),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.extend({
  id: z.string().trim().min(1),
  validationMode: z.enum(["draft", "final"]).default("draft"),
});
const idSchema = z.object({
  kind: kindSchema,
  id: z.string().trim().min(1),
  classId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
});
const moveSchema = idSchema.extend({ direction: z.enum(["up", "down"]) });

function sectionPath(classId: string, subjectId: string, kind: EnglishSecondPaperKind) {
  return `/admin/content/class/${classId}/subject/${subjectId}/${kind}`;
}

async function assertOwnedEnglishSecondPaperSubject(
  classId: string,
  subjectId: string,
  organizationId: string,
) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, classId, organizationId },
    select: { id: true, name: true, slug: true, code: true },
  });
  if (!subject || !isEnglishSecondPaperSubject(subject)) {
    throw new Error("This section is only available for English 2nd Paper subjects.");
  }
}

async function assertBoardYearSelection(
  boardId: string | null | undefined,
  academicYearId: string | null | undefined,
  organizationId: string,
) {
  if (boardId) {
    const board = await prisma.board.findFirst({
      where: { id: boardId, organizationId },
      select: { id: true },
    });
    if (!board) throw new Error("Selected Board was not found.");
  }
  if (academicYearId) {
    const year = await prisma.academicYear.findFirst({
      where: { id: academicYearId, organizationId },
      select: { id: true },
    });
    if (!year) throw new Error("Selected Year was not found.");
  }
}

function auditName(kind: EnglishSecondPaperKind) {
  return `Subject${ENGLISH_SECOND_PAPER_META[kind].title.replace(/[^A-Za-z0-9]+/g, "")}Block`;
}

async function nextSortOrder(
  kind: EnglishSecondPaperKind,
  classId: string,
  subjectId: string,
  organizationId: string,
) {
  const row = await prisma.subjectEnglishSecondPaperBlock.aggregate({
    where: { kind, classId, subjectId, organizationId },
    _max: { sortOrder: true },
  });
  return (row._max.sortOrder ?? -1) + 1;
}

function parseAndValidate(
  kind: EnglishSecondPaperKind,
  title: string,
  instruction: string,
  details: string,
  documentJson: string,
  recordId: string,
) {
  const document = normalizeEnglishSecondPaperDocument(
    kind,
    parseEnglishSecondPaperDocument(kind, documentJson, recordId),
    recordId,
  );
  const errors = validateEnglishSecondPaperDraft(kind, { title, instruction, details, document });
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
  return document;
}

export async function createEnglishSecondPaperBlock(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = createSchema.parse(input);
  if (!isEnglishSecondPaperKind(parsed.kind)) throw new Error("Invalid English 2nd Paper section.");
  await assertOwnedEnglishSecondPaperSubject(parsed.classId, parsed.subjectId, user.organizationId);
  await assertBoardYearSelection(parsed.boardId, parsed.academicYearId, user.organizationId);

  const document = parseAndValidate(
    parsed.kind,
    parsed.title,
    parsed.instruction,
    parsed.details,
    parsed.documentJson,
    "new",
  );
  const sortOrder = await nextSortOrder(parsed.kind, parsed.classId, parsed.subjectId, user.organizationId);
  const created = await prisma.subjectEnglishSecondPaperBlock.create({
    data: {
      kind: parsed.kind,
      classId: parsed.classId,
      subjectId: parsed.subjectId,
      boardId: parsed.boardId ?? null,
      academicYearId: parsed.academicYearId ?? null,
      title: parsed.title.trim(),
      instruction: parsed.instruction,
      details: parsed.details,
      documentJson: JSON.stringify(document),
      sortOrder,
      organizationId: user.organizationId,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityName: auditName(parsed.kind),
    entityId: created.id,
    changes: created,
    organizationId: user.organizationId,
  });

  revalidatePath(sectionPath(parsed.classId, parsed.subjectId, parsed.kind));
  return { id: created.id };
}

export async function updateEnglishSecondPaperBlock(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateSchema.parse(input);
  await assertOwnedEnglishSecondPaperSubject(parsed.classId, parsed.subjectId, user.organizationId);
  await assertBoardYearSelection(parsed.boardId, parsed.academicYearId, user.organizationId);

  const existing = await prisma.subjectEnglishSecondPaperBlock.findFirst({
    where: {
      id: parsed.id,
      kind: parsed.kind,
      classId: parsed.classId,
      subjectId: parsed.subjectId,
      organizationId: user.organizationId,
    },
  });
  if (!existing) throw new Error("Block was not found or does not belong to this subject.");

  // Structural editor actions autosave draft rows/columns immediately, so a
  // draft save may temporarily be incomplete. Manual/final Save reuses the
  // exact same validator as /add before the record is accepted as complete.
  const document = parsed.validationMode === "final"
    ? parseAndValidate(
        parsed.kind,
        parsed.title,
        parsed.instruction,
        parsed.details,
        parsed.documentJson,
        parsed.id,
      )
    : normalizeEnglishSecondPaperDocument(
        parsed.kind,
        parseEnglishSecondPaperDocument(parsed.kind, parsed.documentJson, parsed.id),
        parsed.id,
      );

  const result = await prisma.subjectEnglishSecondPaperBlock.updateMany({
    where: { id: parsed.id, organizationId: user.organizationId, kind: parsed.kind },
    data: {
      boardId: parsed.boardId ?? null,
      academicYearId: parsed.academicYearId ?? null,
      title: parsed.title.trim(),
      instruction: parsed.instruction,
      details: parsed.details,
      documentJson: JSON.stringify(document),
      updatedBy: user.id,
    },
  });
  if (result.count !== 1) throw new Error("Failed to save block.");

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: auditName(parsed.kind),
    entityId: parsed.id,
    changes: {
      boardId: parsed.boardId ?? null,
      academicYearId: parsed.academicYearId ?? null,
      title: parsed.title.trim(),
      instruction: parsed.instruction,
      details: parsed.details,
      documentJson: JSON.stringify(document),
    },
    organizationId: user.organizationId,
  });
  revalidatePath(sectionPath(parsed.classId, parsed.subjectId, parsed.kind));
}

export async function deleteEnglishSecondPaperBlock(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = idSchema.parse(input);
  await assertOwnedEnglishSecondPaperSubject(parsed.classId, parsed.subjectId, user.organizationId);

  const existing = await prisma.subjectEnglishSecondPaperBlock.findFirst({
    where: {
      id: parsed.id,
      kind: parsed.kind,
      classId: parsed.classId,
      subjectId: parsed.subjectId,
      organizationId: user.organizationId,
    },
  });
  if (!existing) throw new Error("Block was not found or does not belong to this subject.");

  await prisma.subjectEnglishSecondPaperBlock.delete({ where: { id: existing.id } });
  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: auditName(parsed.kind),
    entityId: existing.id,
    changes: existing,
    organizationId: user.organizationId,
  });
  revalidatePath(sectionPath(parsed.classId, parsed.subjectId, parsed.kind));
}

export async function moveEnglishSecondPaperBlock(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = moveSchema.parse(input);
  await assertOwnedEnglishSecondPaperSubject(parsed.classId, parsed.subjectId, user.organizationId);

  const rows = await prisma.subjectEnglishSecondPaperBlock.findMany({
    where: {
      kind: parsed.kind,
      classId: parsed.classId,
      subjectId: parsed.subjectId,
      organizationId: user.organizationId,
    },
    select: { id: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const index = rows.findIndex((row) => row.id === parsed.id);
  if (index < 0) throw new Error("Block not found.");
  const target = parsed.direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return;

  const reordered = [...rows];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(target, 0, moved);
  await prisma.$transaction(
    reordered.map((row, sortOrder) =>
      prisma.subjectEnglishSecondPaperBlock.updateMany({
        where: { id: row.id, organizationId: user.organizationId },
        data: { sortOrder, updatedBy: user.id },
      }),
    ),
  );
  revalidatePath(sectionPath(parsed.classId, parsed.subjectId, parsed.kind));
}
