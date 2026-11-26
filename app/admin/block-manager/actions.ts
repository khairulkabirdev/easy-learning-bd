"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";
import { BLOCK_ASSIGNMENT_KINDS, isBlockAssignmentKind } from "@/app/admin/content/content-types";

import { getClassModelCategoryGroups, getModelQuestionCategoryGroups, isModelCategoryId, MODEL_CATEGORY_IDS } from "@/lib/model-question-fixed-blocks";

const schema = z.object({ scope: z.enum(["class", "subject"]), id: z.string().min(1),
  kinds: z.array(z.string().refine(isBlockAssignmentKind)).max(BLOCK_ASSIGNMENT_KINDS.length).nullable(),
  categories: z.array(z.string().refine(isModelCategoryId)).max(MODEL_CATEGORY_IDS.length).nullable().optional() });

export async function saveBlockAssignment(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const { scope, id, kinds, categories } = schema.parse(input);
  const normalizedCategories = categories === undefined ? undefined : categories === null ? null : MODEL_CATEGORY_IDS.filter(category => categories.includes(category));
  const normalized = kinds === null ? null : BLOCK_ASSIGNMENT_KINDS.filter(kind => kinds.includes(kind));
  const blockKindsJson = normalized === null ? null : JSON.stringify(normalized);
  await prisma.$transaction(async tx => {
    const where = { id, organizationId: user.organizationId };
    const owned = scope === "class"
      ? await tx.class.findFirst({ where, select: { name: true, blockKindsJson: true, modelCategoryIdsJson: true } })
      : await tx.subject.findFirst({ where: { ...where, class: { organizationId: user.organizationId } }, select: { name: true, blockKindsJson: true, modelCategoryIdsJson: true } });
    if (!owned) throw new Error("Class or subject not found.");
    if (normalizedCategories != null) {
      const permitted = scope === "class"
        ? getClassModelCategoryGroups(owned.name).map(g => g.id)
        : await (async () => {
          const subject = await tx.subject.findFirst({ where, select: { name: true, slug: true, code: true, class: { select: { name: true } } } });
          if (!subject) throw new Error("Subject not found.");
          return getModelQuestionCategoryGroups(subject.class.name, subject).map(g => g.id);
        })();
      if (normalizedCategories.some(category => !permitted.includes(category))) throw new Error("One or more categories are unavailable for this class or subject.");
    }
    const data = { blockKindsJson, updatedBy: user.id, ...(normalizedCategories !== undefined ? { modelCategoryIdsJson: normalizedCategories === null ? null : JSON.stringify(normalizedCategories) } : {}) };
    const updated = scope === "class" ? await tx.class.updateMany({ where, data }) : await tx.subject.updateMany({ where, data });
    if (updated.count !== 1) throw new Error("Could not save the assignment.");
    await tx.auditLog.create({ data: { userId: user.id, userName: user.name, organizationId: user.organizationId,
      action: "UPDATE", entityName: scope === "class" ? "ClassBlockAssignment" : "SubjectBlockAssignment", entityId: id,
      changes: JSON.stringify({ before: owned.blockKindsJson, after: normalized, categoriesBefore: owned.modelCategoryIdsJson, categoriesAfter: normalizedCategories }) } });
  });
  revalidatePath("/admin/block-manager", "layout");
  revalidatePath("/admin/content", "layout");
  revalidatePath("/admin/model-question-import", "layout");
  return { kinds: normalized, categories: normalizedCategories };
}
