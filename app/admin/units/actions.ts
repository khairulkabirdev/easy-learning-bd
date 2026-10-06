"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { entityMediaSchema, resolveEntityMedia } from "@/lib/entity-media";

const unitSchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1, "Class is required."),
  subjectId: z.string().min(1, "Subject is required."),
  title: z.string().min(1, "Title is required."),
  unitNumber: z.string().default(""),
  description: z.string().default(""),
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

async function assertUniqueUnitSlug({
  slug,
  organizationId,
  id,
}: {
  slug: string;
  organizationId: string;
  id?: string;
}) {
  const existing = await prisma.unit.findFirst({
    where: {
      slug,
      organizationId,
      NOT: id ? { id } : undefined,
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A unit with this title already exists in the current organization.");
  }
}

export async function saveUnit(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = unitSchema.parse(input);

  const classRecord = await assertOwnedClass(parsed.classId, user.organizationId);
  const subjectRecord = await assertOwnedSubject(parsed.subjectId, parsed.classId, user.organizationId);
  const slug = `${slugify(classRecord.name)}-${slugify(subjectRecord.name)}-${slugify(parsed.title)}`;

  if (!slug || slug === "--") {
    throw new Error("A valid unit title is required.");
  }

  await assertUniqueUnitSlug({
    slug,
    organizationId: user.organizationId,
    id: parsed.id,
  });

  const existing = parsed.id
    ? await prisma.unit.findFirst({
        where: { id: parsed.id, organizationId: user.organizationId },
        select: {
          id: true,
          classId: true,
          subjectId: true,
          imagePath: true,
          _count: { select: { lessons: true, contents: true } },
        },
      })
    : null;

  if (parsed.id && !existing) {
    throw new Error("Unit not found.");
  }

  if (existing && (existing.classId !== parsed.classId || existing.subjectId !== parsed.subjectId)) {
    const dependentCount = existing._count.lessons + existing._count.contents;
    if (dependentCount > 0) {
      throw new Error("This unit already has lessons or content. Move those records first before changing its class or subject.");
    }
  }

  const media = await resolveEntityMedia({
    input: parsed,
    domain: "units",
    previousImagePath: existing?.imagePath || "",
  });

  if (parsed.id) {
    const updated = await prisma.unit.update({
      where: { id: parsed.id, organizationId: user.organizationId },
      data: {
        classId: parsed.classId,
        subjectId: parsed.subjectId,
        title: parsed.title,
        slug,
        unitNumber: parsed.unitNumber,
        description: parsed.description,
        sortOrder: parsed.sortOrder,
        ...media,
        updatedBy: user.id,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entityName: "Unit",
      entityId: updated.id,
      changes: updated,
      organizationId: user.organizationId,
    });
  } else {
    const created = await prisma.unit.create({
      data: {
        classId: parsed.classId,
        subjectId: parsed.subjectId,
        title: parsed.title,
        slug,
        unitNumber: parsed.unitNumber,
        description: parsed.description,
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
      entityName: "Unit",
      entityId: created.id,
      changes: created,
      organizationId: user.organizationId,
    });
  }

  revalidatePath("/admin/units");
}

export async function deleteUnit(id: string) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();

  const ownedUnit = await prisma.unit.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!ownedUnit) {
    throw new Error("Unit not found.");
  }

  const deleted = await prisma.unit.delete({
    where: { id, organizationId: user.organizationId },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "Unit",
    entityId: deleted.id,
    changes: deleted,
    organizationId: user.organizationId,
  });

  revalidatePath("/admin/units");
}
