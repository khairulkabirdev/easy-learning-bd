"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { entityMediaSchema, resolveEntityMedia } from "@/lib/entity-media";

const subjectSchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1, "Class is required."),
  name: z.string().min(1, "Name is required."),
  code: z.string().default(""),
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

async function assertUniqueSubjectSlug({
  slug,
  organizationId,
  id,
}: {
  slug: string;
  organizationId: string;
  id?: string;
}) {
  const existing = await prisma.subject.findFirst({
    where: {
      slug,
      organizationId,
      NOT: id ? { id } : undefined,
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A subject with this name already exists in the current organization.");
  }
}

export async function saveSubject(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = subjectSchema.parse(input);
  const classRecord = await assertOwnedClass(parsed.classId, user.organizationId);
  const slug = `${slugify(classRecord.name)}-${slugify(parsed.name)}`;

  if (!slug || slug === "-") {
    throw new Error("A valid subject name is required.");
  }

  await assertUniqueSubjectSlug({
    slug,
    organizationId: user.organizationId,
    id: parsed.id,
  });

  const media = await resolveEntityMedia({
    input: parsed,
    domain: "subjects",
  });

  if (parsed.id) {
    const updated = await prisma.subject.update({
      where: { id: parsed.id },
      data: {
        classId: parsed.classId,
        name: parsed.name,
        slug,
        code: parsed.code,
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
      entityName: "Subject",
      entityId: updated.id,
      changes: updated,
      organizationId: user.organizationId,
    });
  } else {
    const created = await prisma.subject.create({
      data: {
        classId: parsed.classId,
        name: parsed.name,
        slug,
        code: parsed.code,
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
      entityName: "Subject",
      entityId: created.id,
      changes: created,
      organizationId: user.organizationId,
    });
  }

  revalidatePath("/admin/subjects");
}

export async function deleteSubject(id: string) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();

  const ownedSubject = await prisma.subject.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!ownedSubject) {
    throw new Error("Subject not found.");
  }

  const deleted = await prisma.subject.delete({
    where: { id },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "Subject",
    entityId: deleted.id,
    changes: deleted,
    organizationId: user.organizationId,
  });

  revalidatePath("/admin/subjects");
}
