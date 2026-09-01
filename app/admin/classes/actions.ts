"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { entityMediaSchema, resolveEntityMedia } from "@/lib/entity-media";

const classSchema = z.object({
  id: z.string().optional(),
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

async function assertUniqueClassSlug({
  slug,
  organizationId,
  id,
}: {
  slug: string;
  organizationId: string;
  id?: string;
}) {
  const existing = await prisma.class.findFirst({
    where: {
      slug,
      organizationId,
      NOT: id ? { id } : undefined,
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A class with this name already exists.");
  }
}

export async function saveClass(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = classSchema.parse(input);
  const slug = slugify(parsed.name);

  if (!slug) {
    throw new Error("A valid class name is required.");
  }

  await assertUniqueClassSlug({
    slug,
    organizationId: user.organizationId,
    id: parsed.id,
  });

  const media = await resolveEntityMedia({
    input: parsed,
    domain: "classes",
  });

  if (parsed.id) {
    const updated = await prisma.class.update({
      where: { id: parsed.id },
      data: {
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
      entityName: "Class",
      entityId: updated.id,
      changes: updated,
      organizationId: user.organizationId,
    });
  } else {
    const created = await prisma.class.create({
      data: {
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
      entityName: "Class",
      entityId: created.id,
      changes: created,
      organizationId: user.organizationId,
    });
  }

  revalidatePath("/admin/classes");
}

export async function deleteClass(id: string) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();

  const ownedClass = await prisma.class.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!ownedClass) {
    throw new Error("Class not found.");
  }

  const deleted = await prisma.class.delete({
    where: { id },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "Class",
    entityId: deleted.id,
    changes: deleted,
    organizationId: user.organizationId,
  });

  revalidatePath("/admin/classes");
}
