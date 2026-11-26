import "server-only";

import { prisma } from "@/lib/db";
import { parseBlockAssignment, resolveBlockAssignment, type BlockAssignmentKind } from "@/app/admin/content/content-types";

import { getModelQuestionCategoryGroups, getModelQuestionCreationKinds, parseModelCategories, resolveModelCategories } from "@/lib/model-question-fixed-blocks";

export async function getAssignedBlockKinds(organizationId: string, classId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, classId, organizationId, class: { organizationId } },
    select: { blockKindsJson: true, class: { select: { blockKindsJson: true } } },
  });
  if (!subject) throw new Error("Subject not found for this class.");
  return resolveBlockAssignment(parseBlockAssignment(subject.class.blockKindsJson), parseBlockAssignment(subject.blockKindsJson));
}

export async function assertBlockAssigned(organizationId: string, classId: string, subjectId: string, kind: BlockAssignmentKind) {
  const assigned = await getAssignedBlockKinds(organizationId, classId, subjectId);
  if (assigned !== null && !assigned.includes(kind)) {
    throw new Error("This block is not assigned to this class and subject. Update its assignment in Admin → Block Manager.");
  }
}


export async function getAssignedModelQuestionPolicy(organizationId: string, classId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, classId, organizationId, class: { organizationId } },
    select: { name: true, slug: true, code: true, blockKindsJson: true, modelCategoryIdsJson: true,
      class: { select: { name: true, blockKindsJson: true, modelCategoryIdsJson: true } } },
  });
  if (!subject) throw new Error("Subject not found for this class.");
  const groups = getModelQuestionCategoryGroups(subject.class.name, subject);
  const categories = resolveModelCategories(groups.map(g => g.id), parseModelCategories(subject.class.modelCategoryIdsJson), parseModelCategories(subject.modelCategoryIdsJson));
  const blocks = resolveBlockAssignment(parseBlockAssignment(subject.class.blockKindsJson), parseBlockAssignment(subject.blockKindsJson));
  return { groups, categories, kinds: getModelQuestionCreationKinds(groups, categories, blocks) };
}
