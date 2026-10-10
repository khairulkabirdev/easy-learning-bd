"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";

const boardSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, "Board name is required.").max(120, "Board name is too long."),
  isActive: z.boolean().default(true),
});

const yearSchema = z.object({
  id: z.string().trim().min(1).optional(),
  year: z.coerce.number().int().min(1, "Year is required.").max(9999, "Year is too large."),
  isActive: z.boolean().default(true),
});

const bulkSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, "Select at least one record."),
  action: z.enum(["activate", "deactivate", "delete"]),
});

function revalidateBoardPages() {
  revalidatePath("/admin/board");
  revalidatePath("/admin/board/year");
}

async function clearUnseenBlockMasterReferences(
  tx: Prisma.TransactionClient,
  organizationId: string,
  field: "boardId" | "academicYearId",
  ids: string[],
) {
  if (ids.length === 0) return;

  const records = await tx.unseenComposition.findMany({
    where: { organizationId },
    select: { id: true, documentJson: true },
  });

  for (const record of records) {
    try {
      const document = JSON.parse(record.documentJson || "{}") as {
        version?: unknown;
        blocks?: Array<Record<string, unknown>>;
      };
      if (!Array.isArray(document.blocks)) continue;

      let changed = false;
      const blocks = document.blocks.map((block) => {
        const current = typeof block?.[field] === "string" ? String(block[field]) : "";
        if (!current || !ids.includes(current)) return block;
        changed = true;
        return { ...block, [field]: null };
      });

      if (changed) {
        await tx.unseenComposition.update({
          where: { id: record.id },
          data: { documentJson: JSON.stringify({ ...document, blocks }) },
        });
      }
    } catch {
      // Leave malformed legacy documents untouched.
    }
  }
}

async function clearBlockMasterReferences(
  tx: Prisma.TransactionClient,
  organizationId: string,
  field: "boardId" | "academicYearId",
  ids: string[],
) {
  if (ids.length === 0) return;

  const data = field === "boardId" ? { boardId: null } : { academicYearId: null };
  const relationWhere =
    field === "boardId" ? { boardId: { in: ids } } : { academicYearId: { in: ids } };

  await Promise.all([
    tx.contentBlock.updateMany({
      where: {
        ...relationWhere,
        content: { organizationId },
      },
      data,
    }),
    tx.subjectMatchingSentencesBlock.updateMany({
      where: { organizationId, ...relationWhere },
      data,
    }),
    tx.subjectRearrangeSentenceBlock.updateMany({
      where: { organizationId, ...relationWhere },
      data,
    }),
    tx.subjectQuestionFromPoemsBlock.updateMany({
      where: { organizationId, ...relationWhere },
      data,
    }),
    tx.subjectQuestionFromStoryBlock.updateMany({
      where: { organizationId, ...relationWhere },
      data,
    }),
    tx.subjectEnglishSecondPaperBlock.updateMany({
      where: { organizationId, ...relationWhere },
      data,
    }),
  ]);

  await clearUnseenBlockMasterReferences(tx, organizationId, field, ids);
}

async function assertUniqueBoardName({
  id,
  name,
  organizationId,
}: {
  id?: string;
  name: string;
  organizationId: string;
}) {
  const rows = await prisma.board.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  });
  const normalized = name.trim().toLocaleLowerCase();
  const duplicate = rows.find((row) => row.id !== id && row.name.trim().toLocaleLowerCase() === normalized);
  if (duplicate) throw new Error("A board with this name already exists.");
}

export async function saveBoard(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = boardSchema.parse(input);

  await assertUniqueBoardName({
    id: parsed.id,
    name: parsed.name,
    organizationId: user.organizationId,
  });

  if (parsed.id) {
    const owned = await prisma.board.findFirst({
      where: { id: parsed.id, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!owned) throw new Error("Board not found.");

    const updated = await prisma.board.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        isActive: parsed.isActive,
        updatedBy: user.id,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entityName: "Board",
      entityId: updated.id,
      changes: updated,
      organizationId: user.organizationId,
    });
  } else {
    const created = await prisma.board.create({
      data: {
        name: parsed.name,
        isActive: parsed.isActive,
        organizationId: user.organizationId,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "CREATE",
      entityName: "Board",
      entityId: created.id,
      changes: created,
      organizationId: user.organizationId,
    });
  }

  revalidateBoardPages();
  return { ok: true };
}

export async function deleteBoard(id: string) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const owned = await prisma.board.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!owned) throw new Error("Board not found.");

  await prisma.$transaction(async (tx) => {
    await clearBlockMasterReferences(tx, user.organizationId, "boardId", [id]);
    await tx.board.delete({ where: { id } });
  });
  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "Board",
    entityId: owned.id,
    changes: owned,
    organizationId: user.organizationId,
  });

  revalidateBoardPages();
  return { ok: true };
}

export async function bulkBoardAction(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = bulkSchema.parse(input);
  const owned = await prisma.board.findMany({
    where: { id: { in: parsed.ids }, organizationId: user.organizationId },
  });
  if (owned.length !== new Set(parsed.ids).size) throw new Error("One or more selected boards were not found.");

  if (parsed.action === "delete") {
    await prisma.$transaction(async (tx) => {
      await clearBlockMasterReferences(tx, user.organizationId, "boardId", parsed.ids);
      await tx.board.deleteMany({
        where: { id: { in: parsed.ids }, organizationId: user.organizationId },
      });
    });
  } else {
    await prisma.board.updateMany({
      where: { id: { in: parsed.ids }, organizationId: user.organizationId },
      data: { isActive: parsed.action === "activate", updatedBy: user.id },
    });
  }

  for (const row of owned) {
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: parsed.action === "delete" ? "DELETE" : "UPDATE",
      entityName: "Board",
      entityId: row.id,
      changes: parsed.action === "delete" ? row : { ...row, isActive: parsed.action === "activate" },
      organizationId: user.organizationId,
    });
  }

  revalidateBoardPages();
  return { ok: true, count: owned.length };
}

export async function saveAcademicYear(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = yearSchema.parse(input);

  const duplicate = await prisma.academicYear.findFirst({
    where: {
      organizationId: user.organizationId,
      year: parsed.year,
      NOT: parsed.id ? { id: parsed.id } : undefined,
    },
    select: { id: true },
  });
  if (duplicate) throw new Error("This year already exists.");

  if (parsed.id) {
    const owned = await prisma.academicYear.findFirst({
      where: { id: parsed.id, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!owned) throw new Error("Year not found.");

    const updated = await prisma.academicYear.update({
      where: { id: parsed.id },
      data: {
        year: parsed.year,
        isActive: parsed.isActive,
        updatedBy: user.id,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entityName: "AcademicYear",
      entityId: updated.id,
      changes: updated,
      organizationId: user.organizationId,
    });
  } else {
    const created = await prisma.academicYear.create({
      data: {
        year: parsed.year,
        isActive: parsed.isActive,
        organizationId: user.organizationId,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "CREATE",
      entityName: "AcademicYear",
      entityId: created.id,
      changes: created,
      organizationId: user.organizationId,
    });
  }

  revalidateBoardPages();
  return { ok: true };
}

export async function deleteAcademicYear(id: string) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const owned = await prisma.academicYear.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!owned) throw new Error("Year not found.");

  await prisma.$transaction(async (tx) => {
    await clearBlockMasterReferences(tx, user.organizationId, "academicYearId", [id]);
    await tx.academicYear.delete({ where: { id } });
  });
  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "AcademicYear",
    entityId: owned.id,
    changes: owned,
    organizationId: user.organizationId,
  });

  revalidateBoardPages();
  return { ok: true };
}

export async function bulkAcademicYearAction(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = bulkSchema.parse(input);
  const owned = await prisma.academicYear.findMany({
    where: { id: { in: parsed.ids }, organizationId: user.organizationId },
  });
  if (owned.length !== new Set(parsed.ids).size) throw new Error("One or more selected years were not found.");

  if (parsed.action === "delete") {
    await prisma.$transaction(async (tx) => {
      await clearBlockMasterReferences(tx, user.organizationId, "academicYearId", parsed.ids);
      await tx.academicYear.deleteMany({
        where: { id: { in: parsed.ids }, organizationId: user.organizationId },
      });
    });
  } else {
    await prisma.academicYear.updateMany({
      where: { id: { in: parsed.ids }, organizationId: user.organizationId },
      data: { isActive: parsed.action === "activate", updatedBy: user.id },
    });
  }

  for (const row of owned) {
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: parsed.action === "delete" ? "DELETE" : "UPDATE",
      entityName: "AcademicYear",
      entityId: row.id,
      changes: parsed.action === "delete" ? row : { ...row, isActive: parsed.action === "activate" },
      organizationId: user.organizationId,
    });
  }

  revalidateBoardPages();
  return { ok: true, count: owned.length };
}
