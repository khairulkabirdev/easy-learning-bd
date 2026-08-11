"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";

const topicSchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1, "Class is required."),
  subjectId: z.string().min(1, "Subject is required."),
  unitId: z.string().min(1, "Unit is required."),
  lessonId: z.string().min(1, "Lesson is required."),
  title: z.string().min(1, "Title is required."),
  topicNumber: z.string().default(""),
  shortDescription: z.string().default(""),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

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

async function assertOwnedLesson(lessonId: string, unitId: string, organizationId: string) {
  const lessonRecord = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      unitId,
      organizationId,
    },
    select: { id: true, title: true },
  });

  if (!lessonRecord) {
    throw new Error("Lesson does not belong to the selected unit.");
  }

  return lessonRecord;
}

async function assertUniqueTopicSlug({
  slug,
  organizationId,
  id,
}: {
  slug: string;
  organizationId: string;
  id?: string;
}) {
  const existing = await prisma.topic.findFirst({
    where: {
      slug,
      organizationId,
      NOT: id ? { id } : undefined,
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A topic with this title already exists in the current organization.");
  }
}

export async function saveTopic(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = topicSchema.parse(input);

  const classRecord = await assertOwnedClass(parsed.classId, user.organizationId);
  const subjectRecord = await assertOwnedSubject(parsed.subjectId, parsed.classId, user.organizationId);
  const unitRecord = await assertOwnedUnit(parsed.unitId, parsed.classId, parsed.subjectId, user.organizationId);
  const lessonRecord = await assertOwnedLesson(parsed.lessonId, parsed.unitId, user.organizationId);
  const slug = `${slugify(classRecord.name)}-${slugify(subjectRecord.name)}-${slugify(unitRecord.title)}-${slugify(lessonRecord.title)}-${slugify(parsed.title)}`;

  if (!slug || slug === "----") {
    throw new Error("A valid topic title is required.");
  }

  await assertUniqueTopicSlug({
    slug,
    organizationId: user.organizationId,
    id: parsed.id,
  });

  if (parsed.id) {
    const updated = await prisma.topic.update({
      where: { id: parsed.id },
      data: {
        lessonId: parsed.lessonId,
        title: parsed.title,
        slug,
        topicNumber: parsed.topicNumber,
        shortDescription: parsed.shortDescription,
        sortOrder: parsed.sortOrder,
        updatedBy: user.id,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entityName: "Topic",
      entityId: updated.id,
      changes: updated,
      organizationId: user.organizationId,
    });
  } else {
    const created = await prisma.topic.create({
      data: {
        lessonId: parsed.lessonId,
        title: parsed.title,
        slug,
        topicNumber: parsed.topicNumber,
        shortDescription: parsed.shortDescription,
        sortOrder: parsed.sortOrder,
        organizationId: user.organizationId,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "CREATE",
      entityName: "Topic",
      entityId: created.id,
      changes: created,
      organizationId: user.organizationId,
    });
  }

  revalidatePath("/admin/topics");
}

export async function deleteTopic(id: string) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();

  const ownedTopic = await prisma.topic.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!ownedTopic) {
    throw new Error("Topic not found.");
  }

  const deleted = await prisma.topic.delete({
    where: { id },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "Topic",
    entityId: deleted.id,
    changes: deleted,
    organizationId: user.organizationId,
  });

  revalidatePath("/admin/topics");
}
