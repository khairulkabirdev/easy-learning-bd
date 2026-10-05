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

  try {
    const document = JSON.parse(parsed.documentJson) as { version?: unknown; blocks?: unknown };
    if (document.version !== 1 || !Array.isArray(document.blocks)) {
      throw new Error();
    }
  } catch {
    throw new Error("Invalid Unseen Composition document.");
  }

  const updated = await prisma.unseenComposition.update({
    where: { id: parsed.id },
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

  const deleted = await prisma.unseenComposition.delete({ where: { id } });

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
