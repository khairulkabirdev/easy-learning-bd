"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { entityMediaSchema, resolveEntityMedia } from "@/lib/entity-media";

const lessonSchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1, "Class is required."),
  subjectId: z.string().min(1, "Subject is required."),
  unitId: z.string().min(1, "Unit is required."),
  title: z.string().min(1, "Title is required."),
  lessonNumber: z.string().default(""),
  shortDescription: z.string().default(""),
  sortOrder: z.coerce.number().int().min(0).default(0),
}).merge(entityMediaSchema);

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function assertOwnedClass(classId: string, organizationId: string) {
  const classRecord = await prisma.class.findFirst({
    where: {
      id: classId,
      organizationId,
    },
    select: { id: true, name: true },
  });

  if (!classRecord) {
    throw new Error("Class not found.");
  }

  return classRecord;
}

async function assertOwnedSubject(subjectId: string, classId: string, organizationId: string) {
  const subjectRecord = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      classId,
      organizationId,
    },
    select: { id: true, name: true },
  });

  if (!subjectRecord) {
    throw new Error("Subject does not belong to the selected class.");
  }

  return subjectRecord;
}

async function assertOwnedUnit(unitId: string, classId: string, subjectId: string, organizationId: string) {
  const unitRecord = await prisma.unit.findFirst({
    where: {
      id: unitId,
      classId,
      subjectId,
      organizationId,
    },
    select: { id: true, title: true },
  });

  if (!unitRecord) {
    throw new Error("Unit does not belong to the selected class and subject.");
  }

  return unitRecord;
}

async function assertUniqueLessonSlug({
  slug,
  organizationId,
  id,
}: {
  slug: string;
  organizationId: string;
  id?: string;
}) {
  const existing = await prisma.lesson.findFirst({
    where: {
      slug,
      organizationId,
      NOT: id ? { id } : undefined,
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A lesson with this title already exists in the current organization.");
  }
}

export async function saveLesson(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = lessonSchema.parse(input);

  const classRecord = await assertOwnedClass(parsed.classId, user.organizationId);
  const subjectRecord = await assertOwnedSubject(parsed.subjectId, parsed.classId, user.organizationId);
  const unitRecord = await assertOwnedUnit(parsed.unitId, parsed.classId, parsed.subjectId, user.organizationId);
  const slug = `${slugify(classRecord.name)}-${slugify(subjectRecord.name)}-${slugify(unitRecord.title)}-${slugify(parsed.title)}`;

  if (!slug || slug === "---") {
    throw new Error("A valid lesson title is required.");
  }

  await assertUniqueLessonSlug({
    slug,
    organizationId: user.organizationId,
    id: parsed.id,
  });

  const existing = parsed.id
    ? await prisma.lesson.findFirst({
        where: { id: parsed.id, organizationId: user.organizationId },
        select: {
          id: true,
          unitId: true,
          imagePath: true,
          _count: { select: { topics: true, contents: true } },
        },
      })
    : null;

  if (parsed.id && !existing) {
    throw new Error("Lesson not found.");
  }

  if (existing && existing.unitId !== parsed.unitId) {
    const dependentCount = existing._count.topics + existing._count.contents;
    if (dependentCount > 0) {
      throw new Error("This lesson already has topics or content. Move those records first before changing its unit.");
    }
  }

  const media = await resolveEntityMedia({
    input: parsed,
    domain: "lessons",
    previousImagePath: existing?.imagePath || "",
  });

  if (parsed.id) {
    const updated = await prisma.lesson.update({
      where: { id: parsed.id, organizationId: user.organizationId },
      data: {
        unitId: parsed.unitId,
        title: parsed.title,
        slug,
        lessonNumber: parsed.lessonNumber,
        shortDescription: parsed.shortDescription,
        sortOrder: parsed.sortOrder,
        ...media,
        updatedBy: user.id,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entityName: "Lesson",
      entityId: updated.id,
      changes: updated,
      organizationId: user.organizationId,
    });
  } else {
    const created = await prisma.lesson.create({
      data: {
        unitId: parsed.unitId,
        title: parsed.title,
        slug,
        lessonNumber: parsed.lessonNumber,
        shortDescription: parsed.shortDescription,
        sortOrder: parsed.sortOrder,
        ...media,
        organizationId: user.organizationId,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "CREATE",
      entityName: "Lesson",
      entityId: created.id,
      changes: created,
      organizationId: user.organizationId,
    });
  }

  revalidatePath("/admin/lessons");
}

export async function deleteLesson(id: string) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();

  const ownedLesson = await prisma.lesson.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!ownedLesson) {
    throw new Error("Lesson not found.");
  }

  const deleted = await prisma.lesson.delete({
    where: { id, organizationId: user.organizationId },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "Lesson",
    entityId: deleted.id,
    changes: deleted,
    organizationId: user.organizationId,
  });

  revalidatePath("/admin/lessons");
}
