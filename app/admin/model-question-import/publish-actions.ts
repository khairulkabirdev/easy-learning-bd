"use server";

import { revalidatePath } from "next/cache";
import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { getModelPaper } from "@/lib/model-question-papers";

export async function setModelPaperVisibility(_previous: { error?: string }, form: FormData): Promise<{ error?: string }> {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const id = form.get("id");
  const intent = form.get("intent");
  if (typeof id !== "string" || id.length > 128 || (intent !== "publish" && intent !== "unpublish")) return { error: "Invalid request." };
  const set = await prisma.modelQuestionSet.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { id: true, classId: true, subjectId: true, class: { select: { status: true, organizationId: true } }, subject: { select: { status: true, organizationId: true, classId: true } } },
  });
  if (!set || set.class.organizationId !== user.organizationId || set.subject.organizationId !== user.organizationId || set.subject.classId !== set.classId) return { error: "Model paper not found." };
  if (intent === "publish") {
    if (set.class.status !== "published" || set.subject.status !== "published") return { error: "Publish the class and subject before making this paper available to students." };
    const paper = await getModelPaper({ organizationId: user.organizationId, classId: set.classId, subjectId: set.subjectId }, id, "admin");
    if (!paper) return { error: "Save at least one playable question before publishing this paper." };
  }
  const publishedAt = intent === "publish" ? new Date() : null;
  const updated = await prisma.modelQuestionSet.updateMany({
    where: { id, organizationId: user.organizationId, classId: set.classId, subjectId: set.subjectId },
    data: { publishedAt, updatedBy: user.id },
  });
  if (!updated.count) return { error: "The paper is no longer available." };
  await logAudit({
    userId: user.id, userName: user.name, organizationId: user.organizationId, action: "UPDATE",
    entityName: "ModelQuestionSet", entityId: id, changes: { publishedAt: publishedAt?.toISOString() ?? null },
  }).catch(() => undefined);
  revalidatePath(`/admin/model-question-import/${set.classId}/${set.subjectId}/${id}`);
  revalidatePath("/user/dashboard");
  revalidatePath(`/user/model-questions/${set.subjectId}`);
  revalidatePath(`/user/model-questions/${set.subjectId}/${id}`);
  return {};
}
